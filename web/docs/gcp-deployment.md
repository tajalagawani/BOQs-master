# Google Cloud Platform Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the ROSHN Parametric Masterplan Modelling Platform to Google Cloud Platform (GCP) using Cloud Run and Cloud SQL.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GOOGLE CLOUD PLATFORM                                │
│                         Region: me-central1 (Dammam)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌─────────────────┐     ┌───────────────────┐        │
│   │   Internet   │────▶│   Cloud Run     │────▶│   Cloud SQL       │        │
│   │              │     │   (Container)   │     │   (PostgreSQL)    │        │
│   └──────────────┘     └─────────────────┘     └───────────────────┘        │
│                               │                         ▲                    │
│                               │                         │                    │
│                               ▼                         │                    │
│                        ┌─────────────────┐             │                    │
│                        │  VPC Connector  │─────────────┘                    │
│                        └─────────────────┘                                  │
│                               │                                              │
│                               ▼                                              │
│                        ┌─────────────────┐                                  │
│                        │ Secret Manager  │                                  │
│                        └─────────────────┘                                  │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                    Artifact Registry                            │       │
│   │                    (Docker Images)                              │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Tools

| Tool | Purpose |
|------|---------|
| Google Cloud SDK (gcloud) | GCP command-line interface |
| Docker | Container build and push |
| Git | Source code management |

### Required Permissions

- Project Owner or Editor role
- Billing account linked to project

---

## GCP Services Used

| Service | Purpose |
|---------|---------|
| Cloud Run | Serverless container hosting |
| Cloud SQL | Managed PostgreSQL database |
| Artifact Registry | Docker image storage |
| Secret Manager | Secure credential storage |
| VPC Access Connector | Private network connection |
| Cloud Build | Container building |

---

## Deployment Steps

### Step 1: Install Google Cloud SDK

Download and install from: https://cloud.google.com/sdk/docs/install

Verify installation:

```bash
gcloud version
```

### Step 2: Authenticate with GCP

```bash
gcloud auth login
```

### Step 3: Clone Repository

```bash
git clone https://github.com/tajalagawani/roshn.git
cd roshn
```

### Step 4: Run Deployment Script

Run the deployment script with your target environment:

```bash
chmod +x scripts/deploy-gcp.sh

# Deploy to specific environment
./scripts/deploy-gcp.sh dev      # Development environment
./scripts/deploy-gcp.sh staging  # Staging environment
./scripts/deploy-gcp.sh prod     # Production environment (default)
```

#### Environment Configurations

| Environment | Cloud SQL Tier | Cloud Run Memory | Instances | Description |
|-------------|----------------|------------------|-----------|-------------|
| dev | db-f1-micro | 512Mi | 0-2 | Scale to zero, minimal cost |
| staging | db-custom-1-3840 | 1Gi | 0-5 | Testing environment |
| prod | db-custom-2-4096 | 2Gi | 1-10 | Always-on production |

---

## Configuration

### Default Configuration Values

Update these values in `deploy-gcp.sh` before running:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| PROJECT_ID | roshn-platform | GCP project ID |
| REGION | me-central1 | Deployment region (Dammam) |
| APP_NAME | roshn-platform | Application name |
| DB_INSTANCE_NAME | roshn-db-instance | Cloud SQL instance name |
| DB_NAME | roshn_platform | Database name |
| DB_USER | roshn_admin | Database username |

### Cloud Run Configuration

| Setting | Default Value | Description |
|---------|---------------|-------------|
| MEMORY | 2Gi | Container memory allocation |
| CPU | 2 | Number of vCPUs |
| MIN_INSTANCES | 1 | Minimum running instances |
| MAX_INSTANCES | 10 | Maximum instances for scaling |

### Cloud SQL Configuration

| Setting | Default Value | Description |
|---------|---------------|-------------|
| DB_TIER | db-custom-2-4096 | 2 vCPU, 4GB RAM |
| PostgreSQL Version | 14 | Database version |
| Storage Type | SSD | High-performance storage |
| Storage Size | 50GB | Initial storage (auto-increase enabled) |

---

## What the Script Does

### 1. Project Setup

- Creates or selects GCP project
- Enables required APIs:
  - Cloud Build API
  - Cloud Run API
  - Cloud SQL Admin API
  - Secret Manager API
  - Artifact Registry API
  - Compute Engine API
  - VPC Access API

### 2. Artifact Registry

- Creates Docker repository for container images
- Configures Docker authentication

### 3. Cloud SQL Instance

- Creates PostgreSQL 14 instance
- Configures automated backups (3:00 AM daily)
- Sets maintenance window (Sunday 4:00 AM)
- Enables deletion protection
- Creates database and user

### 4. VPC Connector

- Creates serverless VPC access connector
- Enables private communication between Cloud Run and Cloud SQL

### 5. Secret Manager

- Stores database connection URL securely
- Stores NextAuth secret for authentication

### 6. Docker Image

- Creates production Dockerfile
- Builds optimized container image
- Pushes to Artifact Registry

### 7. Cloud Run Deployment

- Deploys container to Cloud Run
- Configures environment variables
- Sets up Cloud SQL connection
- Enables public access

### 8. Database Migrations

- Runs Prisma migrations via Cloud Run jobs
- Seeds initial data

---

## Post-Deployment

### Access Your Application

After deployment, the script displays your application URL:

```
Application URL: https://roshn-platform-xxxxx-me.a.run.app
```

### View Logs

```bash
gcloud run services logs read roshn-platform --region=me-central1
```

### Update Application

After code changes:

```bash
# Build and push new image
docker build -t me-central1-docker.pkg.dev/roshn-platform/roshn-platform/roshn-platform:latest .
docker push me-central1-docker.pkg.dev/roshn-platform/roshn-platform/roshn-platform:latest

# Deploy new version
gcloud run deploy roshn-platform \
    --image=me-central1-docker.pkg.dev/roshn-platform/roshn-platform/roshn-platform:latest \
    --region=me-central1
```

### Connect to Database

```bash
gcloud sql connect roshn-db-instance --user=roshn_admin --database=roshn_platform
```

---

## Custom Domain Setup

### Step 1: Navigate to Cloud Run Domains

Go to: https://console.cloud.google.com/run/domains

### Step 2: Add Domain Mapping

1. Click "Add Mapping"
2. Select the roshn-platform service
3. Enter your custom domain
4. Follow DNS configuration instructions

### Step 3: Update DNS Records

Add the provided DNS records to your domain registrar:
- CNAME or A record as instructed by GCP

---

## Scaling Configuration

### Automatic Scaling

Cloud Run automatically scales based on traffic:

| Setting | Configuration |
|---------|---------------|
| Scale to zero | Disabled (MIN_INSTANCES=1) |
| Maximum instances | 10 |
| Concurrency | 80 requests per instance |

### Modify Scaling

```bash
gcloud run services update roshn-platform \
    --region=me-central1 \
    --min-instances=2 \
    --max-instances=20
```

---

## Security Features

### Built-in Security

| Feature | Status |
|---------|--------|
| HTTPS | Automatic (managed certificates) |
| Secret Management | Secret Manager integration |
| Private Database | VPC connector (no public IP) |
| IAM | Service account permissions |

### Environment Variables

Sensitive values are stored in Secret Manager:
- DATABASE_URL
- NEXTAUTH_SECRET

---

## Monitoring

### Cloud Console

- **Cloud Run**: https://console.cloud.google.com/run
- **Cloud SQL**: https://console.cloud.google.com/sql
- **Logs**: https://console.cloud.google.com/logs

### CLI Commands

```bash
# Service status
gcloud run services describe roshn-platform --region=me-central1

# Recent logs
gcloud run services logs read roshn-platform --region=me-central1 --limit=50

# Database status
gcloud sql instances describe roshn-db-instance
```

---

## Troubleshooting

### Common Issues

**Container fails to start**
- Check logs: `gcloud run services logs read roshn-platform --region=me-central1`
- Verify environment variables are set correctly

**Database connection errors**
- Verify VPC connector is working
- Check Cloud SQL instance is running
- Verify connection string in Secret Manager

**Build failures**
- Check Dockerfile syntax
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

### Get Help

```bash
# Describe service for detailed status
gcloud run services describe roshn-platform --region=me-central1 --format=yaml

# List recent revisions
gcloud run revisions list --service=roshn-platform --region=me-central1
```

---

## Cost Management

### Key Cost Factors

| Service | Billing Model |
|---------|---------------|
| Cloud Run | Per request + CPU/memory time |
| Cloud SQL | Instance size + storage + network |
| Artifact Registry | Storage used |
| VPC Connector | Per hour while active |

### Cost Optimization Tips

1. **Scale to zero** - Set MIN_INSTANCES=0 for dev/test
2. **Right-size database** - Start with smaller tier, scale up as needed
3. **Clean old images** - Delete unused container images
4. **Use committed use discounts** - For production workloads

---

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `gcloud run services list` | List all Cloud Run services |
| `gcloud run services logs read SERVICE` | View service logs |
| `gcloud run services update SERVICE` | Update service configuration |
| `gcloud sql instances list` | List Cloud SQL instances |
| `gcloud sql connect INSTANCE` | Connect to database |
| `gcloud secrets list` | List all secrets |
| `gcloud artifacts docker images list` | List container images |
