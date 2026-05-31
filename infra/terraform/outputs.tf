output "public_ip" {
  value       = azurerm_public_ip.iox.ip_address
  description = "Public IP for the IOX VM"
}

output "ssh_command" {
  value = "ssh -i ${replace(var.ssh_public_key_path, ".pub", "")} ${var.admin_username}@${azurerm_public_ip.iox.ip_address}"
}

output "tags_applied" {
  value = local.tags
}
