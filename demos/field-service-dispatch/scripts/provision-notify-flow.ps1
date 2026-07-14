# Provisions the "FSD - Notify Technician" cloud flow into Dataverse.
#
# Unlike provision-flow.ps1 (a Dataverse-triggered automated flow), this flow uses
# a PowerApps (V2) trigger so the Code App can CALL it directly via `power-apps add-flow`.
# The app passes the ticket details; the flow emails the technician and returns a status.
# It is created as a DRAFT \u2014 open it in Power Automate, bind the Office 365 Outlook
# connection, then turn it on.
#
# Requires: az login to the org's tenant (same as provision-tables.ps1).

param(
    [string]$EnvironmentUrl = "https://orgb9926d06.crm.dynamics.com",
    [string]$FlowName       = "FSD - Notify Technician"
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

Write-Host "Connected to $EnvironmentUrl" -ForegroundColor Cyan

# --- Idempotency: skip if a flow with this name already exists -----------------
$escaped = $FlowName.Replace("'", "''")
$existing = Invoke-RestMethod -Method Get -Headers $headers `
    -Uri "$apiBase/workflows?`$select=workflowid,statecode&`$filter=category eq 5 and name eq '$escaped'"
if ($existing.value.Count -gt 0) {
    Write-Host "  [SKIP] Flow '$FlowName' already exists." -ForegroundColor Yellow
    Write-Host "FLOWID=$($existing.value[0].workflowid)"
    return
}

# --- Email body composed from the PowerApps trigger inputs ---------------------
$emailBody = "@{concat(" +
    "'<p>Hello ', coalesce(triggerBody()?['technicianName'], 'Technician'), ',</p>'," +
    "'<p>Ticket <b>', coalesce(triggerBody()?['ticketTitle'], ''), '</b> is now <b>', " +
    "coalesce(triggerBody()?['ticketStatus'], 'Updated'), '</b>.</p>'," +
    "'<p><b>Customer:</b> ', coalesce(triggerBody()?['customerName'], ''), '<br>'," +
    "'<b>Location:</b> ', coalesce(triggerBody()?['location'], ''), '<br>'," +
    "'<b>Urgency:</b> ', coalesce(triggerBody()?['urgency'], ''), '<br>'," +
    "'<b>Priority score:</b> ', string(coalesce(triggerBody()?['priorityScore'], 0)), '</p>')}"

$definition = [ordered]@{
    "`$schema"        = "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#"
    "contentVersion" = "1.0.0.0"
    "parameters"     = [ordered]@{
        "`$connections"    = [ordered]@{ "defaultValue" = @{}; "type" = "Object" }
        "`$authentication" = [ordered]@{ "defaultValue" = @{}; "type" = "SecureObject" }
    }
    "triggers"       = [ordered]@{
        "manual" = [ordered]@{
            "type"     = "Request"
            "kind"     = "PowerAppV2"
            "inputs"   = [ordered]@{
                "schema" = [ordered]@{
                    "type"       = "object"
                    "properties" = [ordered]@{
                        "technicianEmail" = [ordered]@{ "type" = "string"; "title" = "Technician email"; "description" = "Recipient address"; "x-ms-dynamically-added" = $true; "x-ms-content-hint" = "EMAIL" }
                        "technicianName"  = [ordered]@{ "type" = "string"; "title" = "Technician name"; "description" = "Recipient name"; "x-ms-dynamically-added" = $true }
                        "ticketTitle"     = [ordered]@{ "type" = "string"; "title" = "Ticket title"; "description" = "Ticket title"; "x-ms-dynamically-added" = $true }
                        "ticketStatus"    = [ordered]@{ "type" = "string"; "title" = "Status"; "description" = "Current status label"; "x-ms-dynamically-added" = $true }
                        "customerName"    = [ordered]@{ "type" = "string"; "title" = "Customer"; "description" = "Customer name"; "x-ms-dynamically-added" = $true }
                        "location"        = [ordered]@{ "type" = "string"; "title" = "Location"; "description" = "Site location"; "x-ms-dynamically-added" = $true }
                        "urgency"         = [ordered]@{ "type" = "string"; "title" = "Urgency"; "description" = "Urgency label"; "x-ms-dynamically-added" = $true }
                        "priorityScore"   = [ordered]@{ "type" = "number"; "title" = "Priority score"; "description" = "Geo-priority score"; "x-ms-dynamically-added" = $true }
                    }
                    "required"   = @("technicianEmail", "ticketTitle")
                }
            }
        }
    }
    "actions"        = [ordered]@{
        "Email_the_technician"   = [ordered]@{
            "type"     = "OpenApiConnection"
            "inputs"   = [ordered]@{
                "host"           = [ordered]@{
                    "apiId"          = "/providers/Microsoft.PowerApps/apis/shared_office365"
                    "connectionName" = "shared_office365"
                    "operationId"    = "SendEmailV2"
                }
                "parameters"     = [ordered]@{
                    "emailMessage/To"         = "@triggerBody()?['technicianEmail']"
                    "emailMessage/Subject"    = "@{concat('Ticket update: ', coalesce(triggerBody()?['ticketTitle'], ''))}"
                    "emailMessage/Body"       = $emailBody
                    "emailMessage/Importance" = "Normal"
                }
                "authentication" = "@parameters('`$authentication')"
            }
            "runAfter" = @{}
        }
        "Respond_to_PowerApp"    = [ordered]@{
            "type"     = "Response"
            "kind"     = "PowerApp"
            "inputs"   = [ordered]@{
                "statusCode" = 200
                "body"       = [ordered]@{ "status" = "Sent" }
                "schema"     = [ordered]@{
                    "type"       = "object"
                    "properties" = [ordered]@{ "status" = [ordered]@{ "type" = "string" } }
                }
            }
            "runAfter" = [ordered]@{ "Email_the_technician" = @("Succeeded") }
        }
    }
}

$clientDataObj = [ordered]@{
    "schemaVersion" = "1.0.0.0"
    "properties"    = [ordered]@{
        "connectionReferences" = [ordered]@{
            "shared_office365" = [ordered]@{
                "runtimeSource" = "embedded"
                "connection"    = @{}
                "api"           = [ordered]@{ "name" = "shared_office365" }
            }
        }
        "definition"           = $definition
    }
}

# clientdata must be a JSON string embedded inside the workflow record.
$clientData = $clientDataObj | ConvertTo-Json -Depth 40 -Compress

$record = [ordered]@{
    "name"          = $FlowName
    "category"      = 5          # 5 = Modern Flow (cloud flow)
    "type"          = 1          # 1 = Definition
    "description"   = "Called by the Field Service Dispatch app to email a technician when a ticket is assigned or its status changes."
    "primaryentity" = "none"
    "statecode"     = 0          # Draft (turn on after binding the connection)
    "statuscode"    = 1
    "clientdata"    = $clientData
}

Write-Host "Creating cloud flow '$FlowName'..." -ForegroundColor Cyan
$created = Invoke-RestMethod -Uri "$apiBase/workflows" -Method Post -Headers $headers -Body ($record | ConvertTo-Json -Depth 6)
Write-Host "  [OK] Flow created, state = Draft." -ForegroundColor Green
Write-Host "FLOWID=$($created.workflowid)"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. npx power-apps add-flow --flow-id $($created.workflowid)"
Write-Host "  2. Open Power Automate > '$FlowName', bind the Office 365 Outlook connection, and turn it On."
