# IOX — Environment Inventory

> Closes part of **C1-SC1 Cloud environment provisioning**. Snapshot of all
> live Azure resources. Refresh after any infra change.

**As of:** 2026-05-31

## Azure subscription

| Field | Value |
|---|---|
| Tenant | IOX (`ioxsolutions2026.onmicrosoft.com`) |
| Tenant ID | `5c1c05b1-7b56-45e5-b38e-c9aea88f4588` |
| Subscription | Azure subscription 1 |
| Subscription ID | `5d5e49c7-1fe0-4d54-827b-57844c2dd0aa` |
| Owner | Taj Noah |

## Environments

| Environment | Status | Notes |
|---|---|---|
| **Dev** | Live | The current VM serves both dev iteration and demo. |
| **Test** | Not provisioned | Planned: clone the bootstrap to a `iox-vm-02` in same RG. |
| **Production** | Not provisioned | Planned: separate subscription (or RG) + managed Postgres + Blob storage. |

> Today's Dev VM doubles as the demo / acceptance environment. Adequate for
> the platform-launch milestone; will split before public production.

## Live Azure resources

All resources live in **resource group `iox-rg`** (UAE North), tagged `app=IOX-OS`, `environment=dev`, `owner=taj`.

| Resource | Type | Name | Notes |
|---|---|---|---|
| Resource group | — | `iox-rg` | Container for everything |
| VM | `Microsoft.Compute/virtualMachines` | `iox-vm-01` | Standard_D2s_v3 (2 vCPU, 8 GB), Ubuntu 22.04 LTS |
| VM NIC | `Microsoft.Network/networkInterfaces` | `iox-vm-01VMNic` | Bound to public IP + VNet |
| Public IP | `Microsoft.Network/publicIPAddresses` | `iox-vm-01PublicIP` | **`20.203.125.83`** (Standard SKU, static) |
| NSG | `Microsoft.Network/networkSecurityGroups` | `iox-vm-01NSG` | See [configuration-evidence.md](../security/configuration-evidence.md) §1 |
| VNet | `Microsoft.Network/virtualNetworks` | `iox-vm-01VNET` | Private CIDR `10.0.0.0/16`, subnet `10.0.0.0/24` |
| OS disk | `Microsoft.Compute/disks` | `iox-vm-01_OsDisk_1_...` | 32 GB Premium SSD (LRS), encryption-at-rest by default |

## VM hostname + access

| Field | Value |
|---|---|
| Hostname | `iox-vm-01` |
| Admin user | `iox` |
| SSH | ED25519 keypair, private key at `~/.ssh/iox_vm` on the platform engineer's laptop |
| Public access | http://20.203.125.83 (port 80) |
| Internal Postgres | localhost:5432 (not exposed externally) |
| Internal Next.js | localhost:3000 (behind nginx) |

## Software inventory on the VM

| Component | Version | Source |
|---|---|---|
| Ubuntu | 22.04.5 LTS | Azure image `Canonical:0001-com-ubuntu-server-jammy:22_04-lts-gen2` |
| Node.js | 24 (NodeSource) | `setup_24.x` apt repo |
| npm | bundled with Node 24 | — |
| Postgres | 16 (apt) | Ubuntu repo |
| nginx | 1.18+ (apt) | Ubuntu repo |
| pm2 | latest (global npm) | `npm i -g pm2` |
| tsx | latest (global npm) | `npm i -g tsx` |
| Drizzle Kit | per `package-lock.json` | npm |
| Prisma CLI | per `package-lock.json` | npm |

## Cost model

| Resource | Monthly est. (USD) |
|---|---|
| VM Standard_D2s_v3 (744 hours) | ~$70 |
| Public IP Standard (static) | ~$4 |
| OS Disk Premium SSD 32 GB | ~$5 |
| Network egress (low) | ~$2 |
| **Total Azure** | **~$80** |
| Anthropic API (variable; first month low) | $0–50 |
| HeroUI Pro license | (per existing commercial arrangement) |
| GitHub Actions (public repo / under free tier) | $0 |

## Tags on every resource

| Key | Value |
|---|---|
| `app` | `IOX-OS` |
| `environment` | `dev` |
| `owner` | `taj` |

Use `az resource list --tag app=IOX-OS` to enumerate the platform's footprint.

## Refresh procedure

When infra changes:
1. Update this file (resource added / removed / resized)
2. Re-run `az resource list -g iox-rg -o table` to verify against reality
3. Bump the "As of" date at the top
