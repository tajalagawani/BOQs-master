# Azure Deployment Guide

## Overview

This guide explains how to deploy the ROSHN Parametric Masterplan Modelling Platform to Microsoft Azure using Azure App Service and Azure Database for PostgreSQL.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         AZURE DEPLOYMENT                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Azure Resource Group                        │    │
│  │                     (roshn-platform-rg)                         │    │
│  │                                                                 │    │
│  │  ┌──────────────────────┐    ┌──────────────────────┐          │    │
│  │  │   App Service Plan   │    │  PostgreSQL Server   │          │    │
│  │  │   (P1V2 - Premium)   │    │  (GP_Gen5_2)         │          │    │
│  │  │                      │    │                      │          │    │
│  │  │  ┌────────────────┐  │    │  ┌────────────────┐  │          │    │
│  │  │  │   Web App      │──┼────┼─▶│   Database     │  │          │    │
│  │  │  │   (Node 20)    │  │    │  │   (roshn)      │  │          │    │
│  │  │  └────────────────┘  │    │  └────────────────┘  │          │    │
│  │  └──────────────────────┘    └──────────────────────┘          │    │
│  │                                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│                              │                                          │
│                              ▼                                          │
│                     ┌─────────────────┐                                 │
│                     │    Internet     │                                 │
│                     │    Users        │                                 │
│                     └─────────────────┘                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before deploying, ensure you have:

1. **Azure Account** with an active subscription
2. **Azure CLI** installed (version 2.40 or later)
3. **Node.js** 20.x or later
4. **Git** for version control

### Install Azure CLI

**macOS:**

```bash
brew install azure-cli
```

**Windows:**

```powershell
winget install Microsoft.AzureCLI
```

**Linux:**

```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

---

## Deployment Options

### Option 1: Automated Script Deployment

Use the provided deployment script for a complete automated setup:

```bash
# Clone the repository
git clone https://github.com/tajalagawani/roshn.git
cd roshn

# Make the script executable
chmod +x scripts/deploy-azure.sh

# Deploy to specific environment
./scripts/deploy-azure.sh dev      # Development environment
./scripts/deploy-azure.sh staging  # Staging environment
./scripts/deploy-azure.sh prod     # Production environment (default)
```

#### Environment Configurations

| Environment | App Service SKU | Database SKU | Description |
|-------------|-----------------|--------------|-------------|
| dev | B1 (Basic) | B_Gen5_1 (Basic) | Low-cost development |
| staging | S1 (Standard) | GP_Gen5_2 | Testing environment |
| prod | P1V2 (Premium) | GP_Gen5_4 | Full production |

The script will:

1. Create a Resource Group
2. Create PostgreSQL Server and Database
3. Create App Service Plan and Web App
4. Configure environment variables
5. Deploy the application
6. Run database migrations

### Option 2: Manual Deployment

Follow these steps for manual deployment:

#### Step 1: Login to Azure

```bash
az login
```

#### Step 2: Create Resource Group

```bash
az group create \
    --name roshn-platform-rg \
    --location uaenorth
```

#### Step 3: Create PostgreSQL Server

```bash
az postgres server create \
    --resource-group roshn-platform-rg \
    --name roshn-db-server \
    --location uaenorth \
    --admin-user roshnadmin \
    --admin-password "YourSecurePassword123!" \
    --sku-name GP_Gen5_2 \
    --version 14
```

#### Step 4: Configure Firewall

```bash
az postgres server firewall-rule create \
    --resource-group roshn-platform-rg \
    --server roshn-db-server \
    --name AllowAzureServices \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0
```

#### Step 5: Create Database

```bash
az postgres db create \
    --resource-group roshn-platform-rg \
    --server-name roshn-db-server \
    --name roshn_platform
```

#### Step 6: Create App Service Plan

```bash
az appservice plan create \
    --name roshn-platform-plan \
    --resource-group roshn-platform-rg \
    --sku P1V2 \
    --is-linux
```

#### Step 7: Create Web App

```bash
az webapp create \
    --resource-group roshn-platform-rg \
    --plan roshn-platform-plan \
    --name roshn-platform \
    --runtime "NODE:20-lts"
```

#### Step 8: Configure Environment Variables

```bash
az webapp config appsettings set \
    --resource-group roshn-platform-rg \
    --name roshn-platform \
    --settings \
    DATABASE_URL="postgresql://roshnadmin@roshn-db-server:PASSWORD@roshn-db-server.postgres.database.azure.com:5432/roshn_platform?sslmode=require" \
    NEXTAUTH_SECRET="your-secret-key" \
    NEXTAUTH_URL="https://roshn-platform.azurewebsites.net" \
    NODE_ENV="production"
```

#### Step 9: Deploy Application

```bash
# Build the application
npm ci
npm run build

# Create deployment package
zip -r deploy.zip .next package.json package-lock.json public node_modules prisma

# Deploy
az webapp deployment source config-zip \
    --resource-group roshn-platform-rg \
    --name roshn-platform \
    --src deploy.zip
```

#### Step 10: Run Migrations

```bash
npx prisma migrate deploy
npx prisma db seed
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| NEXTAUTH_SECRET | Secret for NextAuth.js encryption | Yes |
| NEXTAUTH_URL | Full URL of the application | Yes |
| NODE_ENV | Environment (production) | Yes |
| NEXT_TELEMETRY_DISABLED | Disable Next.js telemetry | No |

---

## Azure Resources Created

| Resource | Name | SKU/Size | Purpose |
|----------|------|----------|---------|
| Resource Group | roshn-platform-rg | - | Container for all resources |
| App Service Plan | roshn-platform-plan | P1V2 | Hosting plan for web app |
| Web App | roshn-platform | Node 20 LTS | Application hosting |
| PostgreSQL Server | roshn-db-server | GP_Gen5_2 | Database server |
| PostgreSQL Database | roshn_platform | - | Application database |

---

## Recommended Azure Regions

| Region | Location | Code |
|--------|----------|------|
| UAE North | Dubai | uaenorth |
| UAE Central | Abu Dhabi | uaecentral |
| West Europe | Netherlands | westeurope |
| North Europe | Ireland | northeurope |

For ROSHN projects, **UAE North** is recommended for optimal performance.

---

## Scaling

### Vertical Scaling (Scale Up)

Increase resources for the App Service Plan:

```bash
az appservice plan update \
    --name roshn-platform-plan \
    --resource-group roshn-platform-rg \
    --sku P2V2
```

Available SKUs:

| SKU | vCPU | Memory |
|-----|------|--------|
| B1 | 1 | 1.75 GB |
| B2 | 2 | 3.5 GB |
| P1V2 | 1 | 3.5 GB |
| P2V2 | 2 | 7 GB |
| P3V2 | 4 | 14 GB |

### Horizontal Scaling (Scale Out)

Add more instances:

```bash
az webapp update \
    --resource-group roshn-platform-rg \
    --name roshn-platform \
    --set siteConfig.numberOfWorkers=3
```

---

## Monitoring

### View Logs

```bash
# Stream live logs
az webapp log tail \
    --resource-group roshn-platform-rg \
    --name roshn-platform

# Download logs
az webapp log download \
    --resource-group roshn-platform-rg \
    --name roshn-platform
```

### Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
    --app roshn-platform-insights \
    --location uaenorth \
    --resource-group roshn-platform-rg

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
    --app roshn-platform-insights \
    --resource-group roshn-platform-rg \
    --query instrumentationKey -o tsv)

# Add to app settings
az webapp config appsettings set \
    --resource-group roshn-platform-rg \
    --name roshn-platform \
    --settings APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=$INSTRUMENTATION_KEY"
```

---

## Custom Domain & SSL

### Add Custom Domain

```bash
az webapp config hostname add \
    --webapp-name roshn-platform \
    --resource-group roshn-platform-rg \
    --hostname platform.roshn.sa
```

### Enable SSL

```bash
# Create managed certificate
az webapp config ssl create \
    --resource-group roshn-platform-rg \
    --name roshn-platform \
    --hostname platform.roshn.sa

# Bind certificate
az webapp config ssl bind \
    --resource-group roshn-platform-rg \
    --name roshn-platform \
    --certificate-thumbprint <thumbprint> \
    --ssl-type SNI
```

---

## Backup & Recovery

### Configure Backup

```bash
az webapp config backup create \
    --resource-group roshn-platform-rg \
    --webapp-name roshn-platform \
    --backup-name "daily-backup" \
    --container-url "https://yourstorageaccount.blob.core.windows.net/backups?sv=..."
```

### Database Backup

PostgreSQL backups are automatic. To create manual backup:

```bash
pg_dump -h roshn-db-server.postgres.database.azure.com \
    -U roshnadmin@roshn-db-server \
    -d roshn_platform > backup.sql
```

---

## Troubleshooting

### Application Not Starting

1. Check logs: `az webapp log tail --resource-group roshn-platform-rg --name roshn-platform`
2. Verify environment variables are set correctly
3. Ensure database connection is working

### Database Connection Issues

1. Verify firewall rules allow Azure services
2. Check connection string format
3. Ensure SSL mode is set to `require`

### Slow Performance

1. Check App Service Plan SKU (upgrade if needed)
2. Enable Application Insights for diagnostics
3. Review database query performance

---

## Cost Optimization

### Development Environment

Use lower SKUs for non-production:

```bash
# Development App Service Plan
az appservice plan create \
    --name roshn-dev-plan \
    --resource-group roshn-dev-rg \
    --sku B1 \
    --is-linux

# Development Database
az postgres server create \
    --sku-name B_Gen5_1 \
    ...
```

### Auto-Shutdown

Configure auto-shutdown for development resources to save costs.

---

## Security Best Practices

1. **Enable HTTPS Only**

   ```bash
   az webapp update \
       --resource-group roshn-platform-rg \
       --name roshn-platform \
       --https-only true
   ```

2. **Enable Managed Identity**

   ```bash
   az webapp identity assign \
       --resource-group roshn-platform-rg \
       --name roshn-platform
   ```

3. **Configure IP Restrictions**

   ```bash
   az webapp config access-restriction add \
       --resource-group roshn-platform-rg \
       --name roshn-platform \
       --rule-name "OfficeOnly" \
       --priority 100 \
       --ip-address "YOUR.OFFICE.IP.ADDRESS/32"
   ```

4. **Enable TLS 1.2 Minimum**

   ```bash
   az webapp config set \
       --resource-group roshn-platform-rg \
       --name roshn-platform \
       --min-tls-version 1.2
   ```
