#!/usr/bin/env bash
# Import the 7 existing live Azure resources into Terraform state so that
# `terraform plan` reports zero drift (nothing to create, nothing to destroy).
#
# Pre-req: `terraform init` already run; terraform.tfvars present.
# Re-runnable: skips resources already imported.
set -euo pipefail

SUB="5d5e49c7-1fe0-4d54-827b-57844c2dd0aa"
RG="iox-rg"
VM="iox-vm-01"

import_one() {
  local addr="$1"
  local id="$2"
  if terraform state show "$addr" >/dev/null 2>&1; then
    echo "  ✓ $addr already in state"
  else
    echo "  → importing $addr"
    terraform import -input=false "$addr" "$id"
  fi
}

base="/subscriptions/${SUB}/resourceGroups/${RG}"

import_one "azurerm_resource_group.iox" \
  "/subscriptions/${SUB}/resourceGroups/${RG}"

import_one "azurerm_virtual_network.iox" \
  "${base}/providers/Microsoft.Network/virtualNetworks/${VM}VNET"

import_one "azurerm_subnet.iox" \
  "${base}/providers/Microsoft.Network/virtualNetworks/${VM}VNET/subnets/${VM}Subnet"

import_one "azurerm_public_ip.iox" \
  "${base}/providers/Microsoft.Network/publicIPAddresses/${VM}PublicIP"

import_one "azurerm_network_security_group.iox" \
  "${base}/providers/Microsoft.Network/networkSecurityGroups/${VM}NSG"

import_one "azurerm_network_interface.iox" \
  "${base}/providers/Microsoft.Network/networkInterfaces/${VM}VMNic"

import_one "azurerm_network_interface_security_group_association.iox" \
  "${base}/providers/Microsoft.Network/networkInterfaces/${VM}VMNic|${base}/providers/Microsoft.Network/networkSecurityGroups/${VM}NSG"

import_one "azurerm_linux_virtual_machine.iox" \
  "${base}/providers/Microsoft.Compute/virtualMachines/${VM}"

echo
echo "Done. Now run:  terraform plan"
echo "Expected:       'No changes. Your infrastructure matches the configuration.'"
