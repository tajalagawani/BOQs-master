import "server-only";

import { resourceClient, computeClient, networkClient } from "./azure";
import { azureConfigured, getPlatformEnv } from "./platform-env";

export interface AzureResource {
  id: string;
  name: string;
  type: string;
  /** Short, friendly type — "VM", "Disk", "Public IP", etc. */
  typeLabel: string;
  location: string;
  sku?: string;
  tags: Record<string, string>;
  provisioningState?: string;
  /** Best-effort portal link for the resource */
  portalUrl: string;
}

export interface VmDetail {
  name: string;
  vmSize: string;
  /** Derived from the SKU when known (D2s_v3 → 2 vCPU / 8 GiB) */
  vcpu?: number;
  memoryGiB?: number;
  osType?: string;
  imagePublisher?: string;
  imageOffer?: string;
  imageSku?: string;
  imageVersion?: string;
  computerName?: string;
  adminUsername?: string;
  provisioningState?: string;
  powerState?: string;
  timeCreated?: string;
  zones: string[];
  /** Public IPs across all attached NICs. */
  publicIps: string[];
  /** Private IPs across all attached NICs. */
  privateIps: string[];
  osDiskName?: string;
  osDiskSizeGB?: number;
  osDiskType?: string;
  dataDiskCount: number;
  bootDiagnosticsEnabled?: boolean;
  location?: string;
}

/** Hardware specs lookup for the SKUs IOX uses. Avoids an extra API call. */
const SKU_SPECS: Record<string, { vcpu: number; memoryGiB: number }> = {
  Standard_B1s: { vcpu: 1, memoryGiB: 1 },
  Standard_B2s: { vcpu: 2, memoryGiB: 4 },
  Standard_B2ms: { vcpu: 2, memoryGiB: 8 },
  Standard_D2s_v3: { vcpu: 2, memoryGiB: 8 },
  Standard_D4s_v3: { vcpu: 4, memoryGiB: 16 },
  Standard_D2s_v5: { vcpu: 2, memoryGiB: 8 },
  Standard_D4s_v5: { vcpu: 4, memoryGiB: 16 },
};

const TYPE_LABEL: Record<string, string> = {
  "Microsoft.Compute/virtualMachines": "Virtual machine",
  "Microsoft.Compute/disks": "Managed disk",
  "Microsoft.Network/networkInterfaces": "Network interface",
  "Microsoft.Network/networkSecurityGroups": "Network security group",
  "Microsoft.Network/publicIPAddresses": "Public IP address",
  "Microsoft.Network/virtualNetworks": "Virtual network",
  "Microsoft.OperationalInsights/workspaces": "Log Analytics workspace",
  "Microsoft.Insights/dataCollectionRules": "Data collection rule",
  "Microsoft.Insights/dataCollectionEndpoints": "Data collection endpoint",
  "Microsoft.Compute/sshPublicKeys": "SSH public key",
  "Microsoft.Network/networkWatchers": "Network watcher",
  "Microsoft.Storage/storageAccounts": "Storage account",
};

export async function listResources(): Promise<AzureResource[]> {
  if (!(await azureConfigured())) return [];
  try {
    const env = await getPlatformEnv();
    const client = await resourceClient();
    const out: AzureResource[] = [];
    for await (const res of client.resources.listByResourceGroup(env.AZURE_RESOURCE_GROUP)) {
      out.push({
        id: res.id ?? "",
        name: res.name ?? "—",
        type: res.type ?? "",
        typeLabel: TYPE_LABEL[res.type ?? ""] ?? (res.type ?? "").split("/").pop() ?? "Resource",
        location: res.location ?? "—",
        sku: res.sku?.name ?? undefined,
        tags: (res.tags as Record<string, string>) ?? {},
        provisioningState: (res as { provisioningState?: string }).provisioningState,
        portalUrl: portalUrl(res.id ?? "", env.AZURE_TENANT_ID),
      });
    }
    out.sort((a, b) => a.typeLabel.localeCompare(b.typeLabel) || a.name.localeCompare(b.name));
    return out;
  } catch (err) {
    console.error("[platform/infrastructure] listResources failed", err);
    return [];
  }
}

export async function getVmDetail(vmName: string): Promise<VmDetail | null> {
  if (!(await azureConfigured())) return null;
  try {
    const env = await getPlatformEnv();
    const c = await computeClient();
    const net = await networkClient();
    const vm = await c.virtualMachines.get(env.AZURE_RESOURCE_GROUP, vmName, {
      expand: "instanceView",
    });

    const power =
      vm.instanceView?.statuses?.find((s) => s.code?.startsWith("PowerState/"))
        ?.displayStatus ?? undefined;

    const size = vm.hardwareProfile?.vmSize ?? "";
    const specs = SKU_SPECS[size];

    // Resolve IP addresses by walking each NIC reference
    const nicIds = vm.networkProfile?.networkInterfaces ?? [];
    const publicIps: string[] = [];
    const privateIps: string[] = [];
    for (const nicRef of nicIds) {
      const nicName = nicRef.id?.split("/").pop();
      if (!nicName) continue;
      try {
        const nic = await net.networkInterfaces.get(env.AZURE_RESOURCE_GROUP, nicName);
        for (const ip of nic.ipConfigurations ?? []) {
          if (ip.privateIPAddress) privateIps.push(ip.privateIPAddress);
          const pipName = ip.publicIPAddress?.id?.split("/").pop();
          if (pipName) {
            try {
              const pip = await net.publicIPAddresses.get(env.AZURE_RESOURCE_GROUP, pipName);
              if (pip.ipAddress) publicIps.push(pip.ipAddress);
            } catch {
              /* best-effort */
            }
          }
        }
      } catch {
        /* best-effort */
      }
    }

    // OS disk type lookup (Standard_LRS / Premium_LRS / etc.)
    let osDiskType: string | undefined;
    const osDiskName = vm.storageProfile?.osDisk?.name;
    if (osDiskName) {
      try {
        const disk = await c.disks.get(env.AZURE_RESOURCE_GROUP, osDiskName);
        osDiskType = disk.sku?.name ?? undefined;
      } catch {
        /* best-effort */
      }
    }

    return {
      name: vm.name ?? vmName,
      vmSize: size || "—",
      vcpu: specs?.vcpu,
      memoryGiB: specs?.memoryGiB,
      osType: vm.storageProfile?.osDisk?.osType,
      imagePublisher: vm.storageProfile?.imageReference?.publisher,
      imageOffer: vm.storageProfile?.imageReference?.offer,
      imageSku: vm.storageProfile?.imageReference?.sku,
      imageVersion: vm.storageProfile?.imageReference?.exactVersion,
      computerName: vm.osProfile?.computerName,
      adminUsername: vm.osProfile?.adminUsername,
      provisioningState: vm.provisioningState,
      powerState: power,
      timeCreated: vm.timeCreated?.toString(),
      zones: vm.zones ?? [],
      publicIps,
      privateIps,
      osDiskName,
      osDiskSizeGB: vm.storageProfile?.osDisk?.diskSizeGB,
      osDiskType,
      dataDiskCount: vm.storageProfile?.dataDisks?.length ?? 0,
      bootDiagnosticsEnabled: vm.diagnosticsProfile?.bootDiagnostics?.enabled,
      location: vm.location,
    };
  } catch (err) {
    console.error("[platform/infrastructure] getVmDetail failed", err);
    return null;
  }
}

function portalUrl(resourceId: string, tenantId: string): string {
  if (!resourceId) return "https://portal.azure.com";
  return `https://portal.azure.com/#@${tenantId}/resource${resourceId}/overview`;
}
