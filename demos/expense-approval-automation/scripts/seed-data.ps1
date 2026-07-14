# Seeds sample Expense rows into Dataverse.
# Requires: az login to the org's tenant (same as provision-tables.ps1).

param(
    [string]$EnvironmentUrl = "https://orgb9926d06.crm.dynamics.com"
)

$ErrorActionPreference = "Stop"
$apiBase = "$EnvironmentUrl/api/data/v9.2"

$token = az account get-access-token --resource $EnvironmentUrl --query accessToken -o tsv
$headers = @{
    "Authorization"    = "Bearer $token"
    "Content-Type"     = "application/json"
    "OData-MaxVersion" = "4.0"
    "OData-Version"    = "4.0"
    "Prefer"           = "return=representation"
}

# Choice values:
#   category       1=Travel 2=Meals 3=Lodging 4=Supplies 5=Software 6=Training 7=Other
#   paymentmethod  1=Personal Card 2=Corporate Card 3=Cash 4=Bank Transfer
#   status         1=Submitted 2=In Review 3=Approved 4=Rejected 5=Reimbursed
$samples = @(
    @{ purpose = "Client dinner - Contoso renewal"; name = "Ava Thompson";   email = "ava.thompson@contoso.com";   amount = 182.40;  category = 2; payment = 1; merchant = "The Keg";          status = 1; flag = $true;  policy = "[warn] Meals over the `$75.00 cap - needs manager review."; daysAgo = 1;  decided = $false; approver = "";         notes = "" }
    @{ purpose = "Annual JetBrains license";         name = "Noah Patel";    email = "noah.patel@adventure.com";   amount = 289.00;  category = 5; payment = 2; merchant = "JetBrains";        status = 2; flag = $false; policy = "";  daysAgo = 2;  decided = $false; approver = "Dana Lee"; notes = "" }
    @{ purpose = "Office supplies restock";          name = "Mia Nguyen";    email = "mia.nguyen@northwind.com";   amount = 64.95;   category = 4; payment = 3; merchant = "Staples";          status = 3; flag = $false; policy = "";  daysAgo = 5;  decided = $true;  approver = "Dana Lee"; notes = "Approved - within policy." }
    @{ purpose = "Team lunch";                       name = "Sofia Reyes";   email = "sofia.reyes@contoso.com";    amount = 96.20;   category = 2; payment = 1; merchant = "Chipotle";         status = 4; flag = $true;  policy = "[warn] Meals over the `$75.00 cap - needs manager review."; daysAgo = 8;  decided = $true;  approver = "Dana Lee"; notes = "Rejected - exceeds per-person meal limit." }
    @{ purpose = "Conference registration";          name = "Lucas Muller";  email = "lucas.muller@fabrikam.com";  amount = 1450.00; category = 6; payment = 2; merchant = "Microsoft Build"; status = 5; flag = $false; policy = "";  daysAgo = 20; decided = $true;  approver = "Dana Lee"; notes = "Approved and reimbursed." }
)

$created = 0
foreach ($s in $samples) {
    $submitted = (Get-Date).AddDays(-1 * $s.daysAgo).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $expenseDate = (Get-Date).AddDays(-1 * ($s.daysAgo + 2)).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $body = [ordered]@{
        "expaa_name"          = $s.purpose
        "expaa_employeename"  = $s.name
        "expaa_employeeemail" = $s.email
        "expaa_amount"        = $s.amount
        "expaa_category"      = $s.category
        "expaa_paymentmethod" = $s.payment
        "expaa_merchant"      = $s.merchant
        "expaa_expensedate"   = $expenseDate
        "expaa_status"        = $s.status
        "expaa_submittedon"   = $submitted
        "expaa_policyflag"    = $s.flag
    }
    if ($s.policy) { $body["expaa_policynotes"] = $s.policy }
    if ($s.decided) {
        $body["expaa_decisionon"]    = (Get-Date).AddDays(-1 * ($s.daysAgo - 1)).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        $body["expaa_approvername"]  = $s.approver
        $body["expaa_decisionnotes"] = $s.notes
    }
    $json = ($body | ConvertTo-Json)
    Invoke-RestMethod -Uri "$apiBase/expaa_expenses" -Method Post -Headers $headers -Body $json | Out-Null
    $created++
    Write-Host "  [OK] $($s.purpose)" -ForegroundColor Green
}

Write-Host "Done. Created $created expense rows." -ForegroundColor Cyan
