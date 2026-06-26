# Seeds 10 sample Customer Feedback rows into Dataverse.
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
#   channel   1=Web 2=Email 3=Phone 4=In-Person 5=Social
#   theme     1=Product 2=Service 3=Pricing 4=Support 5=Documentation 6=Other
#   sentiment 1=Positive 2=Neutral 3=Negative
#   status    1=New 2=In Review 3=Actioned 4=Closed
$samples = @(
    @{ subject = "Love the new dashboard";              name = "Ava Thompson";    email = "ava.thompson@contoso.com";    text = "The redesigned dashboard is fast and intuitive. Great work!";                  rating = 5; channel = 1; theme = 1; sentiment = 1; status = 1; daysAgo = 1 }
    @{ subject = "Checkout fails on mobile";             name = "Liam Carter";     email = "liam.carter@fabrikam.com";    text = "I keep getting an error when paying from my phone. Please fix urgently.";          rating = 2; channel = 1; theme = 1; sentiment = 3; status = 1; daysAgo = 2 }
    @{ subject = "Support was very helpful";             name = "Noah Patel";      email = "noah.patel@adventure.com";    text = "Your support agent resolved my issue in minutes. Excellent service.";              rating = 5; channel = 3; theme = 4; sentiment = 1; status = 2; daysAgo = 3 }
    @{ subject = "Pricing is confusing";                name = "Mia Nguyen";      email = "mia.nguyen@northwind.com";    text = "I could not tell which plan includes the reporting add-on. Clarify the tiers.";    rating = 3; channel = 2; theme = 3; sentiment = 2; status = 1; daysAgo = 4 }
    @{ subject = "Docs missing API examples";            name = "Ethan Brooks";    email = "ethan.brooks@tailspin.com";   text = "The API reference has no end-to-end examples. Hard to get started.";               rating = 2; channel = 1; theme = 5; sentiment = 3; status = 2; daysAgo = 5 }
    @{ subject = "Great onboarding experience";          name = "Sofia Reyes";     email = "sofia.reyes@contoso.com";     text = "Setup was smooth and the guided tour was helpful. Thank you!";                     rating = 4; channel = 1; theme = 2; sentiment = 1; status = 3; daysAgo = 6 }
    @{ subject = "App crashes after update";             name = "Lucas Müller";    email = "lucas.muller@fabrikam.com";   text = "Since the latest update the app crashes on launch. Please investigate.";           rating = 1; channel = 5; theme = 1; sentiment = 3; status = 1; daysAgo = 7 }
    @{ subject = "Feature request: dark mode";           name = "Emma Wilson";     email = "emma.wilson@adventure.com";   text = "Would love a dark theme for late-night work sessions.";                            rating = 4; channel = 4; theme = 6; sentiment = 2; status = 1; daysAgo = 9 }
    @{ subject = "Billing charged twice";               name = "Oliver Schmidt";  email = "oliver.schmidt@northwind.com"; text = "I was billed twice this month. Need a refund for the duplicate charge.";          rating = 2; channel = 2; theme = 3; sentiment = 3; status = 2; daysAgo = 11 }
    @{ subject = "Fast and reliable service";            name = "Isabella Rossi";  email = "isabella.rossi@tailspin.com"; text = "Uptime has been excellent and the team is responsive. Very satisfied.";          rating = 5; channel = 3; theme = 2; sentiment = 1; status = 4; daysAgo = 14 }
)

$created = 0
foreach ($s in $samples) {
    $submitted = (Get-Date).AddDays(-1 * $s.daysAgo).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $body = @{
        "crfaa_name"         = $s.subject
        "crfaa_customername" = $s.name
        "crfaa_customeremail" = $s.email
        "crfaa_feedbacktext" = $s.text
        "crfaa_rating"       = $s.rating
        "crfaa_channel"      = $s.channel
        "crfaa_theme"        = $s.theme
        "crfaa_sentiment"    = $s.sentiment
        "crfaa_status"       = $s.status
        "crfaa_submittedon"  = $submitted
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$apiBase/crfaa_feedbacks" -Method Post -Headers $headers -Body $body | Out-Null
    $created++
    Write-Host "  [OK] $($s.subject)" -ForegroundColor Green
}

Write-Host "Done. Created $created feedback rows." -ForegroundColor Cyan
