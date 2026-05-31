# IOX — Azure Monitor Setup (live)

> Evidence for **C5-SC1 Production monitoring**. Documents what's collecting,
> where it lands, and how to wire alerts.

**Configured:** 2026-05-31
**VM:** `iox-vm-01` (UAE North)

## Resources created

| Resource | Type | Purpose |
|---|---|---|
| `iox-law` | Log Analytics workspace | Long-term storage of metrics + syslog |
| `iox-vm-dcr` | Data Collection Rule | Tells AMA *what* to collect and *where* to send it |
| `iox-vm-dcr-assoc` | DCR ↔ VM association | Binds the rule to the VM |
| `AzureMonitorLinuxAgent` | VM extension | The on-VM agent (AMA) — auto-upgraded |

All tagged `app=IOX-OS / environment=dev / owner=taj`.

## What's being collected

**Platform metrics** (free, no agent — emitted by the hypervisor):
- `Percentage CPU`
- `Available Memory Bytes`
- `Disk Read Bytes / Operations/Sec`
- `Disk Write Bytes / Operations/Sec`
- `Network In/Out Total`
- 1-minute resolution, 93-day retention in Azure Monitor (free tier)

**Guest OS metrics** via AMA → `iox-law` (every 60 s):
- `Processor(*) % Processor Time`
- `Memory(*) % Used Memory`
- `Memory(*) Available MBytes Memory`
- `Logical Disk(*) % Used Space`
- `Network(*) Total Bytes Received / Transmitted`

**Syslog** via AMA → `iox-law`:
- Facilities: `auth`, `cron`, `daemon`, `syslog`, `user`
- Levels: `Error` and above

## How to inspect

### Quick CLI (last 5 min CPU)

```bash
VM_ID=$(az vm show -g iox-rg -n iox-vm-01 --query id -o tsv)
az monitor metrics list --resource $VM_ID --metric "Percentage CPU" --interval PT1M -o table
```

### Log Analytics (Kusto queries)

Open `iox-law` in Azure portal → Logs, then:

```kusto
// Last hour of CPU
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| summarize avg(CounterValue) by bin(TimeGenerated, 1m)
| render timechart

// Recent errors in syslog
Syslog
| where TimeGenerated > ago(24h)
| where SeverityLevel in ("err","crit","alert","emerg")
| project TimeGenerated, HostName, Facility, SeverityLevel, SyslogMessage
| order by TimeGenerated desc
| take 100

// Available memory trend
Perf
| where ObjectName == "Memory" and CounterName == "Available MBytes Memory"
| summarize avg(CounterValue) by bin(TimeGenerated, 5m)
| render timechart
```

### Portal

- `iox-vm-01` → **Metrics** — platform metrics dashboard
- `iox-vm-01` → **Insights** (after first ingestion lands) — VM Insights view
- `iox-law` → **Logs** — Kusto query editor

## Alert rules — to configure (recommended set)

Each rule uses **platform** metrics so no Sentry/3rd-party signup needed.
Create via portal → Alerts → New alert rule on `iox-vm-01`:

| Alert | Condition | Severity | Frequency | Action |
|---|---|---|---|---|
| **VM CPU high** | `Percentage CPU` avg > 90% over 15 min | Sev 2 | 5 min | Email Tech Lead |
| **VM memory low** | `Available Memory Bytes` < 800 MB over 10 min | Sev 2 | 5 min | Email Tech Lead |
| **VM disk full** | `OS Disk Used Percentage` > 80% | Sev 3 | 15 min | Email Tech Lead |
| **VM unhealthy** | Resource health changes to Unavailable | Sev 1 | 1 min | Email + SMS |
| **VM stopped** | Resource health changes to Stopped (unexpected) | Sev 1 | 1 min | Email + SMS |

CLI one-shot examples (action group must exist first):

```bash
# Create an action group (one-off)
az monitor action-group create -g iox-rg -n iox-oncall \
  --short-name ioxoncall \
  --email taj taj.alagawani@gmail.com

# CPU > 90% / 15 min
VM_ID=$(az vm show -g iox-rg -n iox-vm-01 --query id -o tsv)
AG_ID=$(az monitor action-group show -g iox-rg -n iox-oncall --query id -o tsv)
az monitor metrics alert create \
  -g iox-rg -n "iox-cpu-high" \
  --scopes "$VM_ID" \
  --condition "avg Percentage CPU > 90" \
  --window-size 15m --evaluation-frequency 5m \
  --severity 2 --action "$AG_ID"
```

## Cost

| Service | Free tier | Beyond free |
|---|---|---|
| Azure Monitor platform metrics | unlimited | n/a |
| Log Analytics ingestion | 5 GB/mo free | $2.30/GB after |
| Log Analytics retention | 31 days free | ~$0.10/GB/mo after 31 days |
| Metric alerts | First 10 metric time-series free | $0.10/series/mo |

At our 60-s collection rate and the counter set above, we're <1 GB/mo. Free
tier covers us comfortably for the foreseeable future.

## Refresh procedure

When the DCR collected-counters list changes:

```bash
# Edit /tmp/iox-dcr.json with the new counters, then:
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/<SUB>/resourceGroups/iox-rg/providers/Microsoft.Insights/dataCollectionRules/iox-vm-dcr?api-version=2022-06-01" \
  --body @/tmp/iox-dcr.json
```

The AMA picks up the change within ~10 min.
