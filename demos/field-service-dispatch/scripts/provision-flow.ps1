# Provisions the "FSD - Ticket Notifications" automated cloud flow into Dataverse.
#
# The flow fires when an fsd_ticket row is created or modified and emails the
# assigned technician whenever the ticket is assigned or its status changes.
# It is created as a DRAFT — open it in Power Automate, bind the Dataverse and
# Office 365 Outlook connections, then turn it on.
#
# Requires: az login to the org's tenant (same as provision-tables.ps1).

param(
    [string]$EnvironmentUrl = "https://orgb9926d06.crm.dynamics.com",
    [string]$FlowName       = "FSD - Ticket Notifications"
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
    Write-Host "  [SKIP] Flow '$FlowName' already exists (workflowid $($existing.value[0].workflowid))." -ForegroundColor Yellow
    return
}

# --- Build the flow definition (clientdata) ------------------------------------
# Email body is composed from the changed row, using the connector's friendly
# (FormattedValue) labels for the choice columns so the message reads naturally.
$emailBody = "@{concat(" +
    "'<p>Hello ', coalesce(triggerOutputs()?['body/fsd_technicianname'], 'Technician'), ',</p>'," +
    "'<p>Ticket <b>', coalesce(triggerOutputs()?['body/fsd_name'], ''), '</b> is now <b>', " +
    "coalesce(triggerOutputs()?['body/fsd_status@OData.Community.Display.V1.FormattedValue'], 'Updated'), '</b>.</p>'," +
    "'<p><b>Customer:</b> ', coalesce(triggerOutputs()?['body/fsd_customername'], ''), '<br>'," +
    "'<b>Location:</b> ', coalesce(triggerOutputs()?['body/fsd_address'], ''), ', ', coalesce(triggerOutputs()?['body/fsd_city'], ''), '<br>'," +
    "'<b>Urgency:</b> ', coalesce(triggerOutputs()?['body/fsd_urgency@OData.Community.Display.V1.FormattedValue'], ''), '<br>'," +
    "'<b>Priority score:</b> ', string(coalesce(triggerOutputs()?['body/fsd_priorityscore'], 0)), '</p>'," +
    "'<p>', coalesce(triggerOutputs()?['body/fsd_description'], ''), '</p>')}"

$definition = [ordered]@{
    "`$schema"        = "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#"
    "contentVersion" = "1.0.0.0"
    "parameters"     = [ordered]@{
        "`$connections"    = [ordered]@{ "defaultValue" = @{}; "type" = "Object" }
        "`$authentication" = [ordered]@{ "defaultValue" = @{}; "type" = "SecureObject" }
    }
    "triggers"       = [ordered]@{
        "When_a_ticket_is_created_or_modified" = [ordered]@{
            "type"     = "OpenApiConnectionWebhook"
            "inputs"   = [ordered]@{
                "host"           = [ordered]@{
                    "apiId"          = "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
                    "connectionName" = "shared_commondataserviceforapps"
                    "operationId"    = "SubscribeWebhookTrigger"
                }
                "parameters"     = [ordered]@{
                    "subscriptionRequest/message"             = 4
                    "subscriptionRequest/entityname"          = "fsd_ticket"
                    "subscriptionRequest/scope"               = 4
                    "subscriptionRequest/filteringattributes" = "fsd_status,fsd_technicianname,fsd_technicianemail"
                }
                "authentication" = "@parameters('`$authentication')"
            }
        }
    }
    "actions"        = [ordered]@{
        "If_a_technician_is_assigned" = [ordered]@{
            "type"       = "If"
            "expression" = [ordered]@{
                "and" = @(
                    [ordered]@{ "not" = [ordered]@{ "equals" = @("@triggerOutputs()?['body/fsd_technicianemail']", "") } }
                )
            }
            "actions"    = [ordered]@{
                "Email_the_technician" = [ordered]@{
                    "type"   = "OpenApiConnection"
                    "inputs" = [ordered]@{
                        "host"           = [ordered]@{
                            "apiId"          = "/providers/Microsoft.PowerApps/apis/shared_office365"
                            "connectionName" = "shared_office365"
                            "operationId"    = "SendEmailV2"
                        }
                        "parameters"     = [ordered]@{
                            "emailMessage/To"      = "@triggerOutputs()?['body/fsd_technicianemail']"
                            "emailMessage/Subject" = "@{concat('Ticket update: ', coalesce(triggerOutputs()?['body/fsd_name'], ''))}"
                            "emailMessage/Body"    = $emailBody
                            "emailMessage/Importance" = "Normal"
                        }
                        "authentication" = "@parameters('`$authentication')"
                    }
                    "runAfter" = @{}
                }
            }
            "runAfter"   = @{}
        }
    }
}

$clientDataObj = [ordered]@{
    "schemaVersion" = "1.0.0.0"
    "properties"    = [ordered]@{
        "connectionReferences" = [ordered]@{
            "shared_commondataserviceforapps" = [ordered]@{
                "runtimeSource" = "embedded"
                "connection"    = @{}
                "api"           = [ordered]@{ "name" = "shared_commondataserviceforapps" }
            }
            "shared_office365"                = [ordered]@{
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
    "description"   = "Emails the assigned technician when a field service ticket is assigned or its status changes."
    "primaryentity" = "none"
    "statecode"     = 0          # Draft (turn on after binding connections)
    "statuscode"    = 1
    "clientdata"    = $clientData
}

Write-Host "Creating cloud flow '$FlowName'..." -ForegroundColor Cyan
$created = Invoke-RestMethod -Uri "$apiBase/workflows" -Method Post -Headers $headers -Body ($record | ConvertTo-Json -Depth 6)
Write-Host "  [OK] Flow created (workflowid $($created.workflowid)), state = Draft." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open Power Automate > My flows > '$FlowName'."
Write-Host "  2. Edit the flow and bind the Microsoft Dataverse and Office 365 Outlook connections."
Write-Host "  3. Save and turn the flow On."
