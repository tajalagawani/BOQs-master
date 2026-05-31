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
  default     = "Standard_D2s_v3"
  description = "B2ms had no UAE North capacity at creation; D2s_v3 is the cheapest 2 vCPU / 8 GB SKU that was available"
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
