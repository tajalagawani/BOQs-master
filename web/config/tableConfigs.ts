import type { TableConfig } from "@/types/table";
import tablesJson from "./tables.json";

const tables = tablesJson as Record<string, TableConfig>;

export const buildingAssetsConfig = tables.buildingAssets;
export const carParkingConfig = tables.carParking;
export const additionalAssetConfig = tables.additionalAsset;
export const publicRealmConfig = tables.publicRealm;
export const infrastructureConfig = tables.infrastructure;
export const otherCostsConfig = tables.otherCosts;

export const tableConfigs = tables;
