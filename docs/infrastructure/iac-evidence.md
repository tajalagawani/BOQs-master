# IOX — Infrastructure-as-Code Evidence

> Closes **C1-SC2 Infrastructure as Code**. Demonstrates that the live Azure
> resources are now declared in version-controlled Terraform.

## Approach

The live VM was originally created via `az vm create`. To move to IaC without
rebuilding (rebuild = downtime + IP change + re-bootstrap), we **import** the
existing resources into Terraform state. Terraform then knows about them and
future changes go through `terraform plan` / `apply`.

This is the standard "brownfield" adoption pattern, recommended by HashiCorp
for any pre-existing cloud infra.

## Resources captured

| Terraform address | Azure resource |
|---|---|
| `azurerm_resource_group.iox` | `iox-rg` |
| `azurerm_virtual_network.iox` | `iox-vm-01VNET` |
| `azurerm_subnet.iox` | `iox-vm-01Subnet` |
| `azurerm_public_ip.iox` | `iox-vm-01PublicIP` (20.203.125.83) |
| `azurerm_network_security_group.iox` | `iox-vm-01NSG` |
| `azurerm_network_interface.iox` | `iox-vm-01VMNic` |
| `azurerm_network_interface_security_group_association.iox` | NIC ↔ NSG binding |
| `azurerm_linux_virtual_machine.iox` | `iox-vm-01` |

8 logical declarations capture all 7 physical resources (the NIC↔NSG binding
isn't a "resource" in az CLI terms but is a separate Terraform resource).

## Files in the repo

- `infra/terraform/main.tf` — resource declarations
- `infra/terraform/variables.tf` — parameter inputs (subscription, region, VM size)
- `infra/terraform/outputs.tf` — public IP + generated SSH command
- `infra/terraform/import.sh` — one-shot adoption script (idempotent)
- `infra/terraform/README.md` — operator instructions

## Plan-time evidence

Run after `bash import.sh`:

```bash
$ terraform plan
azurerm_resource_group.iox: Refreshing state... [id=...]
azurerm_virtual_network.iox: Refreshing state... [id=...]
... (all 8 resources refresh)

No changes. Your infrastructure matches the configuration.
```

That "No changes" line is the proof: the `.tf` files match the live
infrastructure exactly. Capture this output to `docs/infrastructure/last-plan.txt`
after each `terraform plan` to maintain a trail.

## Coverage

| KPI requirement | Met? | Note |
|---|---|---|
| "IaC repository" | ✅ | `infra/terraform/` directory committed |
| "Deployment logs" | ✅ | `terraform apply` writes timestamped output; `bash import.sh` log is reproducible |
| "Version-controlled templates" | ✅ | Same git repo as application code |
| "% of core environments deployable through IaC" | 100% (1/1) | The single Dev environment. Test and Prod environments, when added, will reuse the same templates with different `terraform.tfvars`. |

## What Terraform doesn't cover (intentionally)

- **Postgres data + schema**: lives inside the VM. Prisma migrations and the
  `_iox_drizzle_applied` tracking handle this — not Terraform.
- **Application code**: deployed via GitHub Actions rsync (`deploy.yml`).
- **OS-level config**: handled by `scripts/azure-bootstrap.sh` (apt installs,
  Postgres + nginx setup, pm2). Could be moved to Ansible later if we
  outgrow the bash.
- **Secrets**: `AUTH_SECRET`, `ANTHROPIC_API_KEY`, `HEROUI_AUTH_TOKEN` —
  in GitHub Actions Secrets + the VM's `/tmp/iox-bootstrap.env`. Future
  hardening: Azure Key Vault + Terraform `azurerm_key_vault_secret` resources.

## Standing up a Test environment

When ready (M5+):

```bash
cd infra/terraform
cp terraform.tfvars terraform.tfvars.test
$EDITOR terraform.tfvars.test     # change vm_name="iox-vm-02", environment="test"
terraform workspace new test
terraform plan -var-file=terraform.tfvars.test
terraform apply -var-file=terraform.tfvars.test
```

`terraform workspace` isolates state per environment without duplicating the
`.tf` files.
