# IOX — Terraform (Azure)

Declarative mirror of the live IOX VM infrastructure. The resources already
exist; this Terraform configuration adopts them via `terraform import` so
future changes go through plan/apply.

## One-time setup

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # already populated with real IDs
terraform init
bash import.sh                                  # imports the 7 live resources
terraform plan                                  # MUST report no changes
```

If `terraform plan` after `import.sh` shows any diff, **stop**. Either:
- Adjust the `.tf` to match the live resource (preferred — capture reality), then re-plan, OR
- Reconcile via `terraform apply` only if the diff is intentional and approved (Change-Control gate, see `docs/governance/change-control.md`).

## Day-to-day

```bash
# See what's currently captured
terraform state list

# Propose a change
$EDITOR main.tf
terraform plan
terraform apply

# Roll back
terraform plan -destroy            # NEVER run unaudited
```

## Remote state (recommended for team work)

Uncomment the `backend "azurerm" {}` block in `main.tf` and provision an
Azure storage account + container to hold the state:

```bash
az storage account create -g iox-rg -n ioxtfstate -l uaenorth --sku Standard_LRS
az storage container create --account-name ioxtfstate -n tfstate
terraform init -migrate-state
```

Without remote state, the `terraform.tfstate` file lives on the operator's
machine — single-operator-only.

## Files

| File | Purpose |
|---|---|
| `main.tf` | Resource declarations (RG, VNet, Subnet, Public IP, NSG, NIC, VM) |
| `variables.tf` | Inputs (subscription, region, VM size, SSH key path, tags) |
| `outputs.tf` | Public IP, generated SSH command |
| `terraform.tfvars.example` | Template — copy to `terraform.tfvars` |
| `terraform.tfvars` | (gitignored — your subscription IDs) |
| `import.sh` | One-shot script to adopt the live resources |
