# Provisions Dataverse tables for the Customer Feedback Assistant.
# Idempotent: skips tables/columns that already exist.
# Requires: az login to the org's tenant (--allow-no-subscriptions).

param(
    [string]$EnvironmentUrl = "https://orgb9926d06.crm.dynamics.com",
    [string]$Prefix = "crfaa"
)

$ErrorActionPreference = "Stop"
$apiBase = "$EnvironmentUrl/api/data/v9.2"

function Get-Token { az account get-access-token --resource $EnvironmentUrl --query accessToken -o tsv }

$token = Get-Token
$headers = @{
    "Authorization"     = "Bearer $token"
    "Content-Type"      = "application/json"
    "OData-MaxVersion"  = "4.0"
    "OData-Version"     = "4.0"
    "Prefer"            = "return=representation"
}

function Test-TableExists([string]$logical) {
    try { Invoke-RestMethod -Uri "$apiBase/EntityDefinitions(LogicalName='$logical')?`$select=LogicalName" -Headers $headers -ErrorAction Stop | Out-Null; return $true }
    catch { if ($_.Exception.Response.StatusCode -eq 404) { return $false } throw }
}
function Test-ColumnExists([string]$tbl, [string]$col) {
    try { Invoke-RestMethod -Uri "$apiBase/EntityDefinitions(LogicalName='$tbl')/Attributes(LogicalName='$col')?`$select=LogicalName" -Headers $headers -ErrorAction Stop | Out-Null; return $true }
    catch { if ($_.Exception.Response.StatusCode -eq 404) { return $false } throw }
}
function Label([string]$text) {
    @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; "LocalizedLabels" = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; "Label" = $text; "LanguageCode" = 1033 }) }
}

function New-Table {
    param([string]$Schema, [string]$Display, [string]$Plural, [string]$Description, [string]$PrimaryCol, [string]$PrimaryDisplay)
    $logical = $Schema.ToLower()
    if (Test-TableExists $logical) { Write-Host "  [SKIP] table $Schema" -ForegroundColor Yellow; return }
    $body = @{
        "@odata.type"           = "Microsoft.Dynamics.CRM.EntityMetadata"
        "SchemaName"            = $Schema
        "DisplayName"           = (Label $Display)
        "DisplayCollectionName" = (Label $Plural)
        "Description"           = (Label $Description)
        "OwnershipType"         = "UserOwned"
        "HasNotes"              = $false
        "HasActivities"         = $false
        "PrimaryNameAttribute"  = $PrimaryCol
        "Attributes"            = @(@{
                "@odata.type"   = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
                "SchemaName"    = $PrimaryCol
                "AttributeType" = "String"
                "FormatName"    = @{ "Value" = "Text" }
                "MaxLength"     = 200
                "DisplayName"   = (Label $PrimaryDisplay)
                "IsPrimaryName" = $true
            })
    } | ConvertTo-Json -Depth 12
    Invoke-RestMethod -Uri "$apiBase/EntityDefinitions" -Method Post -Headers $headers -Body $body | Out-Null
    Write-Host "  [OK] table $Schema created" -ForegroundColor Green
}

function Add-Column {
    param([string]$Table, [string]$Schema, [string]$Display, [string]$Type, [int]$MaxLength = 200)
    if (Test-ColumnExists $Table.ToLower() $Schema.ToLower()) { Write-Host "    [SKIP] col $Schema" -ForegroundColor Yellow; return }
    $types = @{
        "String"   = @{ "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"; "AttributeType" = "String"; "FormatName" = @{ "Value" = "Text" }; "MaxLength" = $MaxLength }
        "Email"    = @{ "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"; "AttributeType" = "String"; "FormatName" = @{ "Value" = "Email" }; "MaxLength" = $MaxLength }
        "Memo"     = @{ "@odata.type" = "Microsoft.Dynamics.CRM.MemoAttributeMetadata"; "AttributeType" = "Memo"; "MaxLength" = 2000 }
        "Integer"  = @{ "@odata.type" = "Microsoft.Dynamics.CRM.IntegerAttributeMetadata"; "AttributeType" = "Integer"; "MinValue" = -2147483648; "MaxValue" = 2147483647 }
        "DateTime" = @{ "@odata.type" = "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata"; "AttributeType" = "DateTime"; "Format" = "DateAndTime" }
        "Boolean"  = @{ "@odata.type" = "Microsoft.Dynamics.CRM.BooleanAttributeMetadata"; "AttributeType" = "Boolean" }
    }
    $col = $types[$Type].Clone()
    $col["SchemaName"] = $Schema
    $col["DisplayName"] = (Label $Display)
    if ($Type -eq "Boolean") {
        $col["DefaultValue"] = $false
        $col["OptionSet"] = @{
            "@odata.type"  = "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata"
            "TrueOption"   = @{ "Value" = 1; "Label" = (Label "Yes") }
            "FalseOption"  = @{ "Value" = 0; "Label" = (Label "No") }
        }
    }
    Invoke-RestMethod -Uri "$apiBase/EntityDefinitions(LogicalName='$($Table.ToLower())')/Attributes" -Method Post -Headers $headers -Body ($col | ConvertTo-Json -Depth 12) | Out-Null
    Write-Host "    [OK] col $Schema" -ForegroundColor Green
}

function Add-Choice {
    param([string]$Table, [string]$Schema, [string]$Display, [hashtable[]]$Options, [int]$DefaultValue = -1)
    if (Test-ColumnExists $Table.ToLower() $Schema.ToLower()) { Write-Host "    [SKIP] choice $Schema" -ForegroundColor Yellow; return }
    $opts = $Options | ForEach-Object { @{ "Value" = $_.Value; "Label" = (Label $_.Label) } }
    $col = @{
        "@odata.type"   = "Microsoft.Dynamics.CRM.PicklistAttributeMetadata"
        "SchemaName"    = $Schema
        "AttributeType" = "Picklist"
        "DisplayName"   = (Label $Display)
        "DefaultFormValue" = $DefaultValue
        "OptionSet"     = @{
            "@odata.type"   = "Microsoft.Dynamics.CRM.OptionSetMetadata"
            "IsGlobal"      = $false
            "OptionSetType" = "Picklist"
            "Options"       = $opts
        }
    }
    Invoke-RestMethod -Uri "$apiBase/EntityDefinitions(LogicalName='$($Table.ToLower())')/Attributes" -Method Post -Headers $headers -Body ($col | ConvertTo-Json -Depth 12) | Out-Null
    Write-Host "    [OK] choice $Schema" -ForegroundColor Green
}

function Add-Lookup {
    param([string]$FromTable, [string]$ToTable, [string]$Schema, [string]$Display)
    $relName = "${Prefix}_${FromTable}_${ToTable}".ToLower()
    if (Test-ColumnExists $FromTable.ToLower() $Schema.ToLower()) { Write-Host "    [SKIP] lookup $Schema" -ForegroundColor Yellow; return }
    $body = @{
        "@odata.type"        = "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata"
        "SchemaName"         = "${Prefix}_${ToTable}_${FromTable}"
        "ReferencedEntity"   = $ToTable.ToLower()
        "ReferencingEntity"  = $FromTable.ToLower()
        "Lookup"             = @{
            "@odata.type" = "Microsoft.Dynamics.CRM.LookupAttributeMetadata"
            "SchemaName"  = $Schema
            "DisplayName" = (Label $Display)
        }
        "AssociatedMenuConfiguration" = @{
            "Behavior" = "UseCollectionName"; "Group" = "Details"; "Order" = 10000
        }
        "CascadeConfiguration" = @{
            "Assign" = "NoCascade"; "Delete" = "RemoveLink"; "Merge" = "NoCascade"
            "Reparent" = "NoCascade"; "Share" = "NoCascade"; "Unshare" = "NoCascade"
        }
    } | ConvertTo-Json -Depth 12
    Invoke-RestMethod -Uri "$apiBase/RelationshipDefinitions" -Method Post -Headers $headers -Body $body | Out-Null
    Write-Host "    [OK] lookup $Schema" -ForegroundColor Green
}

Write-Host "Connected to $EnvironmentUrl" -ForegroundColor Cyan

# ---- Feedback table ----
Write-Host "Feedback table..." -ForegroundColor Cyan
New-Table -Schema "${Prefix}_Feedback" -Display "Feedback" -Plural "Feedbacks" `
    -Description "Customer feedback submissions" -PrimaryCol "${Prefix}_name" -PrimaryDisplay "Subject"
Add-Column -Table "${Prefix}_Feedback" -Schema "${Prefix}_customername" -Display "Customer Name" -Type String -MaxLength 200
Add-Column -Table "${Prefix}_Feedback" -Schema "${Prefix}_customeremail" -Display "Customer Email" -Type Email -MaxLength 200
Add-Column -Table "${Prefix}_Feedback" -Schema "${Prefix}_feedbacktext" -Display "Feedback" -Type Memo
Add-Column -Table "${Prefix}_Feedback" -Schema "${Prefix}_rating" -Display "Rating" -Type Integer
Add-Column -Table "${Prefix}_Feedback" -Schema "${Prefix}_submittedon" -Display "Submitted On" -Type DateTime
Add-Column -Table "${Prefix}_Feedback" -Schema "${Prefix}_suggestedresponse" -Display "Suggested Response" -Type Memo
Add-Choice -Table "${Prefix}_Feedback" -Schema "${Prefix}_channel" -Display "Channel" -Options @(
    @{ Value = 1; Label = "Web" }, @{ Value = 2; Label = "Email" }, @{ Value = 3; Label = "Phone" },
    @{ Value = 4; Label = "In-Person" }, @{ Value = 5; Label = "Social" }) -DefaultValue 1
Add-Choice -Table "${Prefix}_Feedback" -Schema "${Prefix}_theme" -Display "Theme" -Options @(
    @{ Value = 1; Label = "Product" }, @{ Value = 2; Label = "Service" }, @{ Value = 3; Label = "Pricing" },
    @{ Value = 4; Label = "Support" }, @{ Value = 5; Label = "Documentation" }, @{ Value = 6; Label = "Other" }) -DefaultValue 6
Add-Choice -Table "${Prefix}_Feedback" -Schema "${Prefix}_sentiment" -Display "Sentiment" -Options @(
    @{ Value = 1; Label = "Positive" }, @{ Value = 2; Label = "Neutral" }, @{ Value = 3; Label = "Negative" }) -DefaultValue 2
Add-Choice -Table "${Prefix}_Feedback" -Schema "${Prefix}_status" -Display "Status" -Options @(
    @{ Value = 1; Label = "New" }, @{ Value = 2; Label = "In Review" }, @{ Value = 3; Label = "Actioned" },
    @{ Value = 4; Label = "Closed" }) -DefaultValue 1

# ---- Action Item table ----
Write-Host "Action Item table..." -ForegroundColor Cyan
New-Table -Schema "${Prefix}_ActionItem" -Display "Action Item" -Plural "Action Items" `
    -Description "Follow-up actions for feedback" -PrimaryCol "${Prefix}_name" -PrimaryDisplay "Title"
Add-Column -Table "${Prefix}_ActionItem" -Schema "${Prefix}_description" -Display "Description" -Type Memo
Add-Column -Table "${Prefix}_ActionItem" -Schema "${Prefix}_assignedto" -Display "Assigned To" -Type String -MaxLength 200
Add-Column -Table "${Prefix}_ActionItem" -Schema "${Prefix}_duedate" -Display "Due Date" -Type DateTime
Add-Choice -Table "${Prefix}_ActionItem" -Schema "${Prefix}_priority" -Display "Priority" -Options @(
    @{ Value = 1; Label = "Low" }, @{ Value = 2; Label = "Medium" }, @{ Value = 3; Label = "High" }) -DefaultValue 2
Add-Choice -Table "${Prefix}_ActionItem" -Schema "${Prefix}_status" -Display "Status" -Options @(
    @{ Value = 1; Label = "Open" }, @{ Value = 2; Label = "In Progress" }, @{ Value = 3; Label = "Done" }) -DefaultValue 1

# Lookup: ActionItem -> Feedback (run after both tables exist)
Write-Host "Relationship ActionItem -> Feedback..." -ForegroundColor Cyan
Add-Lookup -FromTable "${Prefix}_ActionItem" -ToTable "${Prefix}_Feedback" -Schema "${Prefix}_feedbackid" -Display "Feedback"

Write-Host "Publishing customizations..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "$apiBase/PublishAllXml" -Method Post -Headers $headers | Out-Null
Write-Host "Done." -ForegroundColor Green
