# IOX Azure infrastructure — Terraform mirror of the live resources.
#
# These resources already exist (created via `az vm create` during initial
# bring-up). This file declares them so future infra changes go through
# Terraform plan/apply instead of imperative az CLI commands.
#
# First-time use:
#   1. `terraform init`
#   2. `bash import.sh`     ← imports the 7 existing resources into state
#   3. `terraform plan`     ← should show ZERO drift
#   4. From now on, edit *.tf → plan → apply
#
# NEVER `terraform apply` against an empty state — that would attempt to
# create duplicates of resources Azure already has.

terraform {
  required_version = ">= 1.6"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
  # Uncomment + edit for remote state (recommended for team work):
  # backend "azurerm" {
  #   resource_group_name  = "iox-rg"
  #   storage_account_name = "ioxtfstate"
  #   container_name       = "tfstate"
  #   key                  = "iox.tfstate"
  # }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

# ──────────────────────────────────────────────────────────────────────────
# Tags applied to every resource (mirrors the manual az tag pass).
# ──────────────────────────────────────────────────────────────────────────
locals {
  tags = {
    app         = "IOX-OS"
    environment = var.environment
    owner       = var.owner
  }
}

# ──────────────────────────────────────────────────────────────────────────
# Resource group
# ──────────────────────────────────────────────────────────────────────────
resource "azurerm_resource_group" "iox" {
  name     = var.resource_group
  location = var.location
  tags     = local.tags
}

# ──────────────────────────────────────────────────────────────────────────
# Network
# ──────────────────────────────────────────────────────────────────────────
resource "azurerm_virtual_network" "iox" {
  name                = "${var.vm_name}VNET"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.iox.location
  resource_group_name = azurerm_resource_group.iox.name
  tags                = local.tags
}

resource "azurerm_subnet" "iox" {
  name                 = "${var.vm_name}Subnet"
  resource_group_name  = azurerm_resource_group.iox.name
  virtual_network_name = azurerm_virtual_network.iox.name
  address_prefixes     = ["10.0.0.0/24"]
}

resource "azurerm_public_ip" "iox" {
  name                = "${var.vm_name}PublicIP"
  location            = azurerm_resource_group.iox.location
  resource_group_name = azurerm_resource_group.iox.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.tags
}

# ──────────────────────────────────────────────────────────────────────────
# Network security group
# ──────────────────────────────────────────────────────────────────────────
resource "azurerm_network_security_group" "iox" {
  name                = "${var.vm_name}NSG"
  location            = azurerm_resource_group.iox.location
  resource_group_name = azurerm_resource_group.iox.name
  tags                = local.tags

  security_rule {
    name                       = "default-allow-ssh"
    priority                   = 1000
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*" # opened from your IP only to '*' for GH Actions
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-http"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-https"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface" "iox" {
  name                = "${var.vm_name}VMNic"
  location            = azurerm_resource_group.iox.location
  resource_group_name = azurerm_resource_group.iox.name
  tags                = local.tags

  ip_configuration {
    name                          = "ipconfig1"
    subnet_id                     = azurerm_subnet.iox.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.iox.id
  }
}

resource "azurerm_network_interface_security_group_association" "iox" {
  network_interface_id      = azurerm_network_interface.iox.id
  network_security_group_id = azurerm_network_security_group.iox.id
}

# ──────────────────────────────────────────────────────────────────────────
# VM
# ──────────────────────────────────────────────────────────────────────────
resource "azurerm_linux_virtual_machine" "iox" {
  name                            = var.vm_name
  location                        = azurerm_resource_group.iox.location
  resource_group_name             = azurerm_resource_group.iox.name
  size                            = var.vm_size
  admin_username                  = var.admin_username
  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.iox.id]
  tags                            = local.tags

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(var.ssh_public_key_path)
  }

  os_disk {
    name                 = "${var.vm_name}_OsDisk"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 32
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }
}
