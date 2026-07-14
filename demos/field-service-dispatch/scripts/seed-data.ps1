# Seeds sample Ticket rows (and their initial status logs) into Dataverse.
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
#   category  1=HVAC 2=Electrical 3=Plumbing 4=Appliance 5=Network 6=General
#   urgency   1=Low 2=Medium 3=High 4=Critical
#   status    1=New 2=Assigned 3=En Route 4=On Site 5=Completed 6=Cancelled
# SLA hours by urgency: Low=72 Medium=48 High=24 Critical=4
$slaByUrgency = @{ 1 = 72; 2 = 48; 3 = 24; 4 = 4 }

# Depot is Seattle (47.6062, -122.3321). Coordinates drive the geo-priority score.
$samples = @(
    @{ title = "No heat - furnace not igniting";       customer = "Helen Marsh";     phone = "206-555-0142"; address = "120 Pike St";        city = "Seattle";  lat = 47.6101; lon = -122.3380; category = 1; urgency = 4; status = 1; tech = "";             reportedDaysAgo = 0.2; desc = "Elderly tenant, no heat overnight. Needs priority response." }
    @{ title = "Breaker panel sparking";               customer = "Owen Castillo";   phone = "425-555-0199"; address = "880 Bellevue Way";    city = "Bellevue"; lat = 47.6101; lon = -122.2015; category = 2; urgency = 4; status = 2; tech = "Jordan Banks"; reportedDaysAgo = 0.5; desc = "Visible sparking from main panel. Power isolated as a precaution." }
    @{ title = "Kitchen sink leak under cabinet";      customer = "Priya Sharma";    phone = "206-555-0177"; address = "44 Madison St";      city = "Seattle";  lat = 47.6050; lon = -122.3300; category = 3; urgency = 2; status = 3; tech = "Marco Diaz";   reportedDaysAgo = 1.0; desc = "Slow leak, bucket in place. Customer available afternoons." }
    @{ title = "Walk-in cooler not holding temp";      customer = "Diner 8 LLC";     phone = "253-555-0123"; address = "501 Pacific Ave";    city = "Tacoma";   lat = 47.2529; lon = -122.4443; category = 4; urgency = 3; status = 1; tech = "";             reportedDaysAgo = 0.8; desc = "Restaurant cooler at 50F, food at risk. Far from depot." }
    @{ title = "Office network switch down";           customer = "Redmond Devs";    phone = "425-555-0188"; address = "15 NE 36th St";      city = "Redmond";  lat = 47.6740; lon = -122.1215; category = 5; urgency = 2; status = 2; tech = "Jordan Banks"; reportedDaysAgo = 1.5; desc = "Half the floor offline. Replacement switch on the van." }
    @{ title = "Annual HVAC maintenance";              customer = "Everett Mfg";     phone = "425-555-0166"; address = "2 Rooftop Rd";       city = "Everett";  lat = 47.9789; lon = -122.2021; category = 1; urgency = 1; status = 5; tech = "Marco Diaz";   reportedDaysAgo = 3.0; desc = "Routine seasonal service. Completed and signed off." }
    @{ title = "No hot water - water heater";          customer = "Grace Liu";       phone = "206-555-0150"; address = "300 Yesler Way";     city = "Seattle";  lat = 47.6010; lon = -122.3290; category = 3; urgency = 3; status = 4; tech = "Aisha Khan";   reportedDaysAgo = 0.6; desc = "Tank cold, possible failed element. Tech on site diagnosing." }
    @{ title = "Thermostat replacement";               customer = "Bellevue Suites"; phone = "425-555-0134"; address = "55 Main St";         city = "Bellevue"; lat = 47.6150; lon = -122.2050; category = 1; urgency = 1; status = 5; tech = "Marco Diaz";   reportedDaysAgo = 4.0; desc = "Smart thermostat installed and verified. Closed out." }
    @{ title = "Dishwasher leaking onto floor";        customer = "Kirk Hadley";     phone = "425-555-0171"; address = "210 Lake St";        city = "Kirkland"; lat = 47.6815; lon = -122.2087; category = 4; urgency = 2; status = 6; tech = "";             reportedDaysAgo = 2.0; desc = "Customer cancelled - replacing the unit themselves." }
    @{ title = "Lobby outlet has no power";            customer = "Capitol Realty";  phone = "360-555-0119"; address = "8 Capitol Way";      city = "Olympia";  lat = 47.0379; lon = -122.9007; category = 2; urgency = 1; status = 1; tech = "";             reportedDaysAgo = 1.2; desc = "Single dead outlet in lobby. Low urgency, far from depot." }
)

function ToZ([double]$daysAgo) {
    return (Get-Date).AddHours(-24 * $daysAgo).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

# Lightweight geo-priority approximation mirroring src/lib/priority.ts.
$depotLat = 47.6062; $depotLon = -122.3321
function HaversineKm([double]$lat, [double]$lon) {
    $R = 6371.0
    $dLat = ($lat - $depotLat) * [Math]::PI / 180
    $dLon = ($lon - $depotLon) * [Math]::PI / 180
    $a = [Math]::Sin($dLat / 2) * [Math]::Sin($dLat / 2) +
         [Math]::Sin($dLon / 2) * [Math]::Sin($dLon / 2) *
         [Math]::Cos($depotLat * [Math]::PI / 180) * [Math]::Cos($lat * [Math]::PI / 180)
    return 2 * $R * [Math]::Asin([Math]::Min(1, [Math]::Sqrt($a)))
}
function PriorityScore([int]$urgency, [double]$lat, [double]$lon, [double]$reportedDaysAgo) {
    $urgencyPts = ($urgency / 4.0) * 50
    $dist = HaversineKm $lat $lon
    $closeness = [Math]::Max(0, 1 - $dist / 60.0)
    $proxPts = $closeness * 25
    $target = $slaByUrgency[$urgency]
    $elapsed = $reportedDaysAgo * 24
    $consumed = [Math]::Min(1, $elapsed / $target)
    $slaPts = $consumed * 25
    return [int][Math]::Round([Math]::Min(100, $urgencyPts + $proxPts + $slaPts))
}

$created = 0
foreach ($s in $samples) {
    $reportedOn = ToZ $s.reportedDaysAgo
    $score = PriorityScore $s.urgency $s.lat $s.lon $s.reportedDaysAgo
    $body = [ordered]@{
        "fsd_name"          = $s.title
        "fsd_customername"  = $s.customer
        "fsd_customerphone" = $s.phone
        "fsd_address"       = $s.address
        "fsd_city"          = $s.city
        "fsd_latitude"      = $s.lat
        "fsd_longitude"     = $s.lon
        "fsd_description"   = $s.desc
        "fsd_category"      = $s.category
        "fsd_urgency"       = $s.urgency
        "fsd_status"        = $s.status
        "fsd_priorityscore" = $score
        "fsd_slahours"      = $slaByUrgency[$s.urgency]
        "fsd_reportedon"    = $reportedOn
    }
    if ($s.tech) {
        $body["fsd_technicianname"] = $s.tech
        $body["fsd_assignedon"]     = ToZ ([Math]::Max(0, $s.reportedDaysAgo - 0.1))
        $body["fsd_scheduledfor"]   = ToZ ($s.reportedDaysAgo - 0.5)
    }
    if ($s.status -eq 5) {
        $body["fsd_completedon"]     = ToZ ([Math]::Max(0, $s.reportedDaysAgo - 1.0))
        $body["fsd_resolutionnotes"] = "Service completed and verified with the customer."
    }

    $json = ($body | ConvertTo-Json)
    $ticket = Invoke-RestMethod -Uri "$apiBase/fsd_tickets" -Method Post -Headers $headers -Body $json
    $created++
    Write-Host "  [OK] $($s.title) (priority $score)" -ForegroundColor Green

    # Initial status log entry referencing the new ticket.
    $log = [ordered]@{
        "fsd_name"                 = "$($s.title) - New"
        "fsd_status"               = 1
        "fsd_notes"                = "Ticket logged. Priority score $score."
        "fsd_loggedon"             = $reportedOn
        "fsd_ticketid@odata.bind"  = "/fsd_tickets($($ticket.fsd_ticketid))"
    }
    Invoke-RestMethod -Uri "$apiBase/fsd_statuslogs" -Method Post -Headers $headers -Body ($log | ConvertTo-Json) | Out-Null
}

Write-Host "Done. Created $created tickets." -ForegroundColor Cyan
