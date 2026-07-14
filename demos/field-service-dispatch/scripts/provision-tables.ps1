# Provisions Dataverse tables for the Field Service Dispatch app.
# Idempotent: skips tables/columns that already exist.
# Requires: az login to the org's tenant (--allow-no-subscriptions).

param(
    [string]$EnvironmentUrl = "https://orgb9926d06.crm.dynamics.com",
    [string]$Prefix = "fsd"
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
        "Phone"    = @{ "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"; "AttributeType" = "String"; "FormatName" = @{ "Value" = "Phone" }; "MaxLength" = $MaxLength }
        "Url"      = @{ "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"; "AttributeType" = "String"; "FormatName" = @{ "Value" = "Url" }; "MaxLength" = $MaxLength }
        "Memo"     = @{ "@odata.type" = "Microsoft.Dynamics.CRM.MemoAttributeMetadata"; "AttributeType" = "Memo"; "MaxLength" = 2000 }
        "Integer"  = @{ "@odata.type" = "Microsoft.Dynamics.CRM.IntegerAttributeMetadata"; "AttributeType" = "Integer"; "MinValue" = -2147483648; "MaxValue" = 2147483647 }
        "Decimal"  = @{ "@odata.type" = "Microsoft.Dynamics.CRM.DecimalAttributeMetadata"; "AttributeType" = "Decimal"; "MinValue" = -1000000000; "MaxValue" = 1000000000; "Precision" = 5 }
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

# ---- Ticket table ----
Write-Host "Ticket table..." -ForegroundColor Cyan
New-Table -Schema "${Prefix}_Ticket" -Display "Ticket" -Plural "Tickets" `
    -Description "Field service tickets for intake, dispatch, and completion" -PrimaryCol "${Prefix}_name" -PrimaryDisplay "Title"
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_customername" -Display "Customer Name" -Type String -MaxLength 200
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_customerphone" -Display "Customer Phone" -Type Phone -MaxLength 50
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_address" -Display "Address" -Type String -MaxLength 300
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_city" -Display "City" -Type String -MaxLength 100
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_latitude" -Display "Latitude" -Type Decimal
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_longitude" -Display "Longitude" -Type Decimal
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_description" -Display "Description" -Type Memo
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_priorityscore" -Display "Priority Score" -Type Integer
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_slahours" -Display "SLA Hours" -Type Integer
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_technicianname" -Display "Technician Name" -Type String -MaxLength 200
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_technicianemail" -Display "Technician Email" -Type Email -MaxLength 200
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_scheduledfor" -Display "Scheduled For" -Type DateTime
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_reportedon" -Display "Reported On" -Type DateTime
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_assignedon" -Display "Assigned On" -Type DateTime
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_completedon" -Display "Completed On" -Type DateTime
Add-Column -Table "${Prefix}_Ticket" -Schema "${Prefix}_resolutionnotes" -Display "Resolution Notes" -Type Memo
Add-Choice -Table "${Prefix}_Ticket" -Schema "${Prefix}_category" -Display "Category" -Options @(
    @{ Value = 1; Label = "HVAC" }, @{ Value = 2; Label = "Electrical" }, @{ Value = 3; Label = "Plumbing" },
    @{ Value = 4; Label = "Appliance" }, @{ Value = 5; Label = "Network" }, @{ Value = 6; Label = "General" }) -DefaultValue 6
Add-Choice -Table "${Prefix}_Ticket" -Schema "${Prefix}_urgency" -Display "Urgency" -Options @(
    @{ Value = 1; Label = "Low" }, @{ Value = 2; Label = "Medium" },
    @{ Value = 3; Label = "High" }, @{ Value = 4; Label = "Critical" }) -DefaultValue 2
Add-Choice -Table "${Prefix}_Ticket" -Schema "${Prefix}_status" -Display "Status" -Options @(
    @{ Value = 1; Label = "New" }, @{ Value = 2; Label = "Assigned" }, @{ Value = 3; Label = "En Route" },
    @{ Value = 4; Label = "On Site" }, @{ Value = 5; Label = "Completed" }, @{ Value = 6; Label = "Cancelled" }) -DefaultValue 1

# ---- Status Log table (audit trail) ----
Write-Host "Status Log table..." -ForegroundColor Cyan
New-Table -Schema "${Prefix}_StatusLog" -Display "Status Log" -Plural "Status Logs" `
    -Description "Status history audit trail for tickets" -PrimaryCol "${Prefix}_name" -PrimaryDisplay "Summary"
Add-Column -Table "${Prefix}_StatusLog" -Schema "${Prefix}_technicianname" -Display "Technician Name" -Type String -MaxLength 200
Add-Column -Table "${Prefix}_StatusLog" -Schema "${Prefix}_notes" -Display "Notes" -Type Memo
Add-Column -Table "${Prefix}_StatusLog" -Schema "${Prefix}_loggedon" -Display "Logged On" -Type DateTime
Add-Choice -Table "${Prefix}_StatusLog" -Schema "${Prefix}_status" -Display "Status" -Options @(
    @{ Value = 1; Label = "New" }, @{ Value = 2; Label = "Assigned" }, @{ Value = 3; Label = "En Route" },
    @{ Value = 4; Label = "On Site" }, @{ Value = 5; Label = "Completed" }, @{ Value = 6; Label = "Cancelled" }) -DefaultValue 1

# Lookup: Status Log -> Ticket (run after both tables exist)
Write-Host "Relationship Status Log -> Ticket..." -ForegroundColor Cyan
Add-Lookup -FromTable "${Prefix}_StatusLog" -ToTable "${Prefix}_Ticket" -Schema "${Prefix}_ticketid" -Display "Ticket"

Write-Host "Publishing customizations..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "$apiBase/PublishAllXml" -Method Post -Headers $headers | Out-Null
Write-Host "Done." -ForegroundColor Green
