variable "subscription_id" {
  type        = string
  description = "Azure subscription ID (Azure subscription 1 → 5d5e49c7-...)"
}

variable "tenant_id" {
  type        = string
  description = "Azure tenant ID (IOX → 5c1c05b1-...)"
}

variable "resource_group" {
  type    = string
  default = "iox-rg"
}

variable "location" {
  type    = string
  default = "uaenorth"
}

variable "vm_name" {
  type    = string
  default = "iox-vm-01"
}

variable "vm_size" {
  type        = string
  default     = "Standard_D8s_v4"
  description = "8 vCPU / 32 GB. Upsized from D2s_v3 (2 vCPU / 8 GB). Used the DSv4 family (D8s_v4 == D8s_v3 spec) because the DSv3-family quota increase was still pending while DSv4 had headroom in UAE North. Resized live via `az vm resize`; kept here so Terraform state matches."
}

variable "admin_username" {
  type    = string
  default = "iox"
}

variable "ssh_public_key_path" {
  type        = string
  default     = "~/.ssh/iox_vm.pub"
  description = "Path on the operator's machine to the public key to install on the VM"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Used in tags. dev | test | prod"
}

variable "owner" {
  type    = string
  default = "taj"
}
