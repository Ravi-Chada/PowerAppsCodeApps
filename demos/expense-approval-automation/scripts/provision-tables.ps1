# Provisions Dataverse tables for the Expense Approval Automation app.
# Idempotent: skips tables/columns that already exist.
# Requires: az login to the org's tenant (--allow-no-subscriptions).

param(
    [string]$EnvironmentUrl = "https://orgb9926d06.crm.dynamics.com",
    [string]$Prefix = "expaa"
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
        "Url"      = @{ "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"; "AttributeType" = "String"; "FormatName" = @{ "Value" = "Url" }; "MaxLength" = $MaxLength }
        "Memo"     = @{ "@odata.type" = "Microsoft.Dynamics.CRM.MemoAttributeMetadata"; "AttributeType" = "Memo"; "MaxLength" = 2000 }
        "Integer"  = @{ "@odata.type" = "Microsoft.Dynamics.CRM.IntegerAttributeMetadata"; "AttributeType" = "Integer"; "MinValue" = -2147483648; "MaxValue" = 2147483647 }
        "Decimal"  = @{ "@odata.type" = "Microsoft.Dynamics.CRM.DecimalAttributeMetadata"; "AttributeType" = "Decimal"; "MinValue" = 0; "MaxValue" = 1000000000; "Precision" = 2 }
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

# ---- Expense table ----
Write-Host "Expense table..." -ForegroundColor Cyan
New-Table -Schema "${Prefix}_Expense" -Display "Expense" -Plural "Expenses" `
    -Description "Employee expense submissions" -PrimaryCol "${Prefix}_name" -PrimaryDisplay "Purpose"
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_employeename" -Display "Employee Name" -Type String -MaxLength 200
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_employeeemail" -Display "Employee Email" -Type Email -MaxLength 200
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_amount" -Display "Amount" -Type Decimal
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_merchant" -Display "Merchant" -Type String -MaxLength 200
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_expensedate" -Display "Expense Date" -Type DateTime
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_description" -Display "Description" -Type Memo
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_receipturl" -Display "Receipt URL" -Type Url -MaxLength 400
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_submittedon" -Display "Submitted On" -Type DateTime
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_decisionon" -Display "Decision On" -Type DateTime
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_approvername" -Display "Approver Name" -Type String -MaxLength 200
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_decisionnotes" -Display "Decision Notes" -Type Memo
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_policyflag" -Display "Policy Flag" -Type Boolean
Add-Column -Table "${Prefix}_Expense" -Schema "${Prefix}_policynotes" -Display "Policy Notes" -Type Memo
Add-Choice -Table "${Prefix}_Expense" -Schema "${Prefix}_category" -Display "Category" -Options @(
    @{ Value = 1; Label = "Travel" }, @{ Value = 2; Label = "Meals" }, @{ Value = 3; Label = "Lodging" },
    @{ Value = 4; Label = "Supplies" }, @{ Value = 5; Label = "Software" }, @{ Value = 6; Label = "Training" },
    @{ Value = 7; Label = "Other" }) -DefaultValue 1
Add-Choice -Table "${Prefix}_Expense" -Schema "${Prefix}_paymentmethod" -Display "Payment Method" -Options @(
    @{ Value = 1; Label = "Personal Card" }, @{ Value = 2; Label = "Corporate Card" },
    @{ Value = 3; Label = "Cash" }, @{ Value = 4; Label = "Bank Transfer" }) -DefaultValue 1
Add-Choice -Table "${Prefix}_Expense" -Schema "${Prefix}_status" -Display "Status" -Options @(
    @{ Value = 1; Label = "Submitted" }, @{ Value = 2; Label = "In Review" }, @{ Value = 3; Label = "Approved" },
    @{ Value = 4; Label = "Rejected" }, @{ Value = 5; Label = "Reimbursed" }) -DefaultValue 1

# ---- Approval table (audit trail) ----
Write-Host "Approval table..." -ForegroundColor Cyan
New-Table -Schema "${Prefix}_Approval" -Display "Approval" -Plural "Approvals" `
    -Description "Approval audit trail for expenses" -PrimaryCol "${Prefix}_name" -PrimaryDisplay "Action Summary"
Add-Column -Table "${Prefix}_Approval" -Schema "${Prefix}_approvername" -Display "Approver Name" -Type String -MaxLength 200
Add-Column -Table "${Prefix}_Approval" -Schema "${Prefix}_notes" -Display "Notes" -Type Memo
Add-Column -Table "${Prefix}_Approval" -Schema "${Prefix}_actionon" -Display "Action On" -Type DateTime
Add-Choice -Table "${Prefix}_Approval" -Schema "${Prefix}_action" -Display "Action" -Options @(
    @{ Value = 1; Label = "Submitted" }, @{ Value = 2; Label = "Approved" }, @{ Value = 3; Label = "Rejected" },
    @{ Value = 4; Label = "Returned" }, @{ Value = 5; Label = "Reimbursed" }) -DefaultValue 1

# Lookup: Approval -> Expense (run after both tables exist)
Write-Host "Relationship Approval -> Expense..." -ForegroundColor Cyan
Add-Lookup -FromTable "${Prefix}_Approval" -ToTable "${Prefix}_Expense" -Schema "${Prefix}_expenseid" -Display "Expense"

Write-Host "Publishing customizations..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "$apiBase/PublishAllXml" -Method Post -Headers $headers | Out-Null
Write-Host "Done." -ForegroundColor Green
