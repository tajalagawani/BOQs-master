-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DEVELOPMENT_MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "MasterplanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'APPROVED');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('COST_MODEL_CSV', 'BENCHMARK_CSV', 'DOCUMENT', 'IMAGE');

-- CreateEnum
CREATE TYPE "BoqRunStatus" AS ENUM ('PROCESSING', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "passwordHash" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "backupCodes" TEXT[],
    "allowedCountries" TEXT[],
    "allowedDevelopers" TEXT[],
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_uploads" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "category" "FileCategory" NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'settings',
    "azureAdEnabled" BOOLEAN NOT NULL DEFAULT false,
    "azureAdClientId" TEXT,
    "azureAdClientSecret" TEXT,
    "azureAdTenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_model_entries" (
    "id" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL,
    "assetTypeL1" TEXT NOT NULL,
    "assetFormL2" TEXT,
    "pricePoint" TEXT,
    "nrmLvl1" TEXT NOT NULL,
    "nrmLvl2" TEXT,
    "nrmLvl3" TEXT,
    "unitOfMeasurement" TEXT,
    "sarPerUoM" DECIMAL(12,2),
    "rcdcCostGfa" DECIMAL(12,2) NOT NULL,
    "benchmarkedCostGfa" DECIMAL(12,2),
    "costBua" DECIMAL(12,2),
    "costGia" DECIMAL(12,2),
    "costGfa" DECIMAL(12,2),
    "extraPath" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_model_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masterplans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "grossLandArea" DECIMAL(12,2) NOT NULL,
    "calculatedPlotArea" DECIMAL(12,2) NOT NULL,
    "balanceExternalArea" DECIMAL(12,2) NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "parkingSpaces" INTEGER NOT NULL,
    "contingency" DECIMAL(15,2) NOT NULL,
    "totalCost" DECIMAL(15,2) NOT NULL,
    "costPerGfa" DECIMAL(12,2) NOT NULL,
    "assetClass" TEXT NOT NULL,
    "assetTypeL1" TEXT NOT NULL,
    "assetFormL2" TEXT,
    "status" "MasterplanStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "numberOfPhases" INTEGER NOT NULL DEFAULT 1,
    "benchmarkProjectId" TEXT,
    "country" TEXT,
    "developer" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "masterplans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masterplan_phases" (
    "id" TEXT NOT NULL,
    "masterplanId" TEXT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "phaseName" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "totalMonths" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "masterplan_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_costs" (
    "id" TEXT NOT NULL,
    "masterplanId" TEXT NOT NULL,
    "nrmLvl1" TEXT NOT NULL,
    "costGfa" DECIMAL(12,2) NOT NULL,
    "costPlotArea" DECIMAL(12,2) NOT NULL,
    "totalCost" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "building_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "infrastructure_costs" (
    "id" TEXT NOT NULL,
    "masterplanId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "cost" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infrastructure_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_team_members" (
    "id" TEXT NOT NULL,
    "masterplanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'VIEWER',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "project_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametric_matrix" (
    "id" TEXT NOT NULL,
    "nrmLvl1" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "option" TEXT NOT NULL,
    "factor" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametric_matrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_factors" (
    "id" TEXT NOT NULL,
    "baseDate" TEXT NOT NULL,
    "costUplift" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configurations" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetClass" TEXT,
    "assetTypeL1" TEXT,
    "assetFormL2" TEXT,
    "location" TEXT,
    "country" TEXT,
    "city" TEXT,
    "developer" TEXT,
    "currency" TEXT DEFAULT 'SAR',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "polygon" JSONB,
    "grossLandArea" DECIMAL(18,2),
    "totalCost" DECIMAL(18,2),
    "totalGFA" DECIMAL(18,2),
    "costPerGFA" DECIMAL(18,2),
    "uploadedById" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benchmark_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_project_team_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'VIEWER',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "benchmark_project_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_nrm_data" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nrmCategory" TEXT NOT NULL,
    "costGfa" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "benchmark_nrm_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_runs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sourceFile" TEXT,
    "status" "BoqRunStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "boq_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_entityType_idx" ON "activity_logs"("entityType");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "file_uploads_uploadedById_idx" ON "file_uploads"("uploadedById");

-- CreateIndex
CREATE INDEX "file_uploads_category_idx" ON "file_uploads"("category");

-- CreateIndex
CREATE INDEX "cost_model_entries_assetClass_idx" ON "cost_model_entries"("assetClass");

-- CreateIndex
CREATE INDEX "cost_model_entries_assetTypeL1_idx" ON "cost_model_entries"("assetTypeL1");

-- CreateIndex
CREATE INDEX "cost_model_entries_nrmLvl1_idx" ON "cost_model_entries"("nrmLvl1");

-- CreateIndex
CREATE INDEX "cost_model_entries_assetClass_assetTypeL1_assetFormL2_price_idx" ON "cost_model_entries"("assetClass", "assetTypeL1", "assetFormL2", "pricePoint");

-- CreateIndex
CREATE INDEX "cost_model_entries_assetClass_assetTypeL1_idx" ON "cost_model_entries"("assetClass", "assetTypeL1");

-- CreateIndex
CREATE UNIQUE INDEX "cost_model_entries_assetClass_assetTypeL1_assetFormL2_price_key" ON "cost_model_entries"("assetClass", "assetTypeL1", "assetFormL2", "pricePoint", "nrmLvl1");

-- CreateIndex
CREATE INDEX "masterplans_createdById_idx" ON "masterplans"("createdById");

-- CreateIndex
CREATE INDEX "masterplans_status_idx" ON "masterplans"("status");

-- CreateIndex
CREATE INDEX "masterplans_assetClass_idx" ON "masterplans"("assetClass");

-- CreateIndex
CREATE INDEX "masterplans_country_idx" ON "masterplans"("country");

-- CreateIndex
CREATE INDEX "masterplans_benchmarkProjectId_idx" ON "masterplans"("benchmarkProjectId");

-- CreateIndex
CREATE INDEX "masterplan_phases_masterplanId_idx" ON "masterplan_phases"("masterplanId");

-- CreateIndex
CREATE UNIQUE INDEX "masterplan_phases_masterplanId_phaseNumber_key" ON "masterplan_phases"("masterplanId", "phaseNumber");

-- CreateIndex
CREATE INDEX "building_costs_masterplanId_idx" ON "building_costs"("masterplanId");

-- CreateIndex
CREATE UNIQUE INDEX "building_costs_masterplanId_nrmLvl1_key" ON "building_costs"("masterplanId", "nrmLvl1");

-- CreateIndex
CREATE INDEX "infrastructure_costs_masterplanId_idx" ON "infrastructure_costs"("masterplanId");

-- CreateIndex
CREATE INDEX "project_team_members_masterplanId_idx" ON "project_team_members"("masterplanId");

-- CreateIndex
CREATE INDEX "project_team_members_userId_idx" ON "project_team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_team_members_masterplanId_userId_key" ON "project_team_members"("masterplanId", "userId");

-- CreateIndex
CREATE INDEX "parametric_matrix_nrmLvl1_idx" ON "parametric_matrix"("nrmLvl1");

-- CreateIndex
CREATE INDEX "parametric_matrix_parameter_idx" ON "parametric_matrix"("parameter");

-- CreateIndex
CREATE UNIQUE INDEX "parametric_matrix_nrmLvl1_parameter_option_key" ON "parametric_matrix"("nrmLvl1", "parameter", "option");

-- CreateIndex
CREATE UNIQUE INDEX "cost_factors_baseDate_key" ON "cost_factors"("baseDate");

-- CreateIndex
CREATE INDEX "cost_factors_baseDate_idx" ON "cost_factors"("baseDate");

-- CreateIndex
CREATE UNIQUE INDEX "configurations_key_key" ON "configurations"("key");

-- CreateIndex
CREATE INDEX "configurations_key_idx" ON "configurations"("key");

-- CreateIndex
CREATE INDEX "benchmark_projects_uploadedById_idx" ON "benchmark_projects"("uploadedById");

-- CreateIndex
CREATE INDEX "benchmark_projects_assetClass_idx" ON "benchmark_projects"("assetClass");

-- CreateIndex
CREATE INDEX "benchmark_projects_assetTypeL1_idx" ON "benchmark_projects"("assetTypeL1");

-- CreateIndex
CREATE INDEX "benchmark_project_team_members_projectId_idx" ON "benchmark_project_team_members"("projectId");

-- CreateIndex
CREATE INDEX "benchmark_project_team_members_userId_idx" ON "benchmark_project_team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "benchmark_project_team_members_projectId_userId_key" ON "benchmark_project_team_members"("projectId", "userId");

-- CreateIndex
CREATE INDEX "benchmark_nrm_data_projectId_idx" ON "benchmark_nrm_data"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "benchmark_nrm_data_projectId_nrmCategory_key" ON "benchmark_nrm_data"("projectId", "nrmCategory");

-- CreateIndex
CREATE INDEX "boq_runs_status_idx" ON "boq_runs"("status");

-- CreateIndex
CREATE INDEX "boq_runs_createdAt_idx" ON "boq_runs"("createdAt");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masterplans" ADD CONSTRAINT "masterplans_benchmarkProjectId_fkey" FOREIGN KEY ("benchmarkProjectId") REFERENCES "benchmark_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masterplans" ADD CONSTRAINT "masterplans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masterplan_phases" ADD CONSTRAINT "masterplan_phases_masterplanId_fkey" FOREIGN KEY ("masterplanId") REFERENCES "masterplans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_costs" ADD CONSTRAINT "building_costs_masterplanId_fkey" FOREIGN KEY ("masterplanId") REFERENCES "masterplans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infrastructure_costs" ADD CONSTRAINT "infrastructure_costs_masterplanId_fkey" FOREIGN KEY ("masterplanId") REFERENCES "masterplans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_masterplanId_fkey" FOREIGN KEY ("masterplanId") REFERENCES "masterplans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_projects" ADD CONSTRAINT "benchmark_projects_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_project_team_members" ADD CONSTRAINT "benchmark_project_team_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "benchmark_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_project_team_members" ADD CONSTRAINT "benchmark_project_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_nrm_data" ADD CONSTRAINT "benchmark_nrm_data_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "benchmark_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_runs" ADD CONSTRAINT "boq_runs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
