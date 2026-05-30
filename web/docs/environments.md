# Environment Configuration Guide

## ROSHN Parametric Masterplan Modelling Platform

**Version:** 1.0
**Date:** 5 January 2026
**Status:** Production Ready

---

## Overview

The ROSHN Platform supports three deployment environments, each designed for specific use cases and user groups.

| Environment | Purpose | Availability | Users |
|-------------|---------|--------------|-------|
| **Dev** | Development and feature testing | Business hours | 5-10 developers |
| **UAT** | User Acceptance Testing | Business hours | 10-20 testers |
| **Prod** | Live business operations | 24/7 | 50-100+ users |

---

## Environment Summary

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ENVIRONMENTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │       DEV       │  │       UAT       │  │      PROD       │            │
│   ├─────────────────┤  ├─────────────────┤  ├─────────────────┤            │
│   │ • Development   │  │ • User testing  │  │ • Live system   │            │
│   │ • Feature test  │  │ • Pre-prod      │  │ • High avail.   │            │
│   │ • Debug enabled │  │ • Integration   │  │ • Monitoring    │            │
│   │ • Minimal cost  │  │ • Data migration│  │ • Backup/DR     │            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Development Environment (Dev)

### Purpose

- Feature development and testing
- Developer debugging and experimentation
- Low-cost, minimal resources
- Not publicly accessible

### 1.1 On-Premise Specifications

| Component | Specification |
|-----------|---------------|
| CPU | 4 vCPUs |
| RAM | 8 GB |
| Storage | 100 GB SSD |
| OS | Ubuntu 22.04 LTS / RHEL 8+ |
| Network | 100 Mbps |
| Database | PostgreSQL 14+ (same server) |
| SSL | Optional (self-signed acceptable) |
| Domain | dev.platform.roshn.sa |
| Port | 3001 |
| PM2 Instances | 1 |

### 1.2 Azure Specifications

| Resource | SKU | Specification |
|----------|-----|---------------|
| App Service Plan | B1 (Basic) | 1 core, 1.75 GB RAM |
| App Service | Linux | Node.js 20 LTS |
| PostgreSQL | B_Gen5_1 | 1 vCore, 2 GB RAM, 32 GB storage |
| Storage Account | Standard LRS | 10 GB |

**Resource Group:** `roshn-platform-dev-rg`
**Region:** UAE North (uaenorth)

**Deployment:**
```bash
./scripts/deploy-azure.sh dev
```

### 1.3 GCP Specifications

| Resource | Type | Specification |
|----------|------|---------------|
| Cloud Run | - | 512 Mi RAM, 1 vCPU |
| Cloud SQL | db-f1-micro | Shared core, 0.6 GB RAM |
| Cloud Storage | Standard | 10 GB |
| Min Instances | 0 | Scale to zero |
| Max Instances | 2 | Limited scaling |

**Project:** `roshn-platform-dev`
**Region:** me-central1 (Dammam)

**Deployment:**
```bash
./scripts/deploy-gcp.sh dev
```

---

## 2. UAT Environment (User Acceptance Testing)

### Purpose

- User acceptance testing before production
- Pre-production validation
- Integration testing
- Data migration testing
- Stakeholder reviews

### 2.1 On-Premise Specifications

| Component | Specification |
|-----------|---------------|
| CPU | 4 vCPUs |
| RAM | 8 GB |
| Storage | 150 GB SSD |
| OS | Ubuntu 22.04 LTS / RHEL 8+ |
| Network | 1 Gbps |
| Database | PostgreSQL 14+ (separate server recommended) |
| DB CPU | 2 vCPUs |
| DB RAM | 4 GB |
| DB Storage | 100 GB SSD |
| SSL | Required (valid certificate) |
| Domain | uat.platform.roshn.sa |
| Port | 3002 |
| PM2 Instances | 2 |
| Load Balancer | Optional |

### 2.2 Azure Specifications

| Resource | SKU | Specification |
|----------|-----|---------------|
| App Service Plan | S1 (Standard) | 1 core, 1.75 GB RAM |
| App Service | Linux | Node.js 20 LTS |
| PostgreSQL | GP_Gen5_2 | 2 vCores, 4 GB RAM, 128 GB storage |
| Storage Account | Standard LRS | 50 GB |

**Resource Group:** `roshn-platform-uat-rg`
**Region:** UAE North (uaenorth)

**Deployment:**
```bash
./scripts/deploy-azure.sh staging
```

### 2.3 GCP Specifications

| Resource | Type | Specification |
|----------|------|---------------|
| Cloud Run | - | 1 Gi RAM, 1 vCPU |
| Cloud SQL | db-custom-1-3840 | 1 vCPU, 3.75 GB RAM |
| Cloud Storage | Standard | 50 GB |
| Min Instances | 0 | Scale to zero |
| Max Instances | 5 | Moderate scaling |

**Project:** `roshn-platform-uat`
**Region:** me-central1 (Dammam)

**Deployment:**
```bash
./scripts/deploy-gcp.sh staging
```

---

## 3. Production Environment (Prod)

### Purpose

- Live business operations
- 24/7 availability
- High availability configuration
- Full monitoring and alerting
- Regular backups and disaster recovery

### 3.1 On-Premise Specifications

| Component | Specification |
|-----------|---------------|
| Application Servers | 2x for high availability |
| CPU (per server) | 8 vCPUs |
| RAM (per server) | 16 GB |
| Storage (per server) | 250 GB SSD (RAID 1) |
| OS | Ubuntu 22.04 LTS / RHEL 8+ |
| Network | 1 Gbps (redundant) |
| Database Server | Dedicated |
| DB CPU | 4 vCPUs |
| DB RAM | 16 GB |
| DB Storage | 500 GB SSD (RAID 10) |
| DB Replication | Standby recommended |
| SSL | Required (valid certificate) |
| Domain | platform.roshn.sa |
| Port | 3000 |
| PM2 Instances | max (all CPUs) |
| Load Balancer | Required |
| Backup Storage | 1 TB |

### 3.2 Azure Specifications

| Resource | SKU | Specification |
|----------|-----|---------------|
| App Service Plan | P1V2 (Premium) | 1 core, 3.5 GB RAM |
| App Service | Linux | Node.js 20 LTS, 2 instances min |
| PostgreSQL | GP_Gen5_4 | 4 vCores, 8 GB RAM, 256 GB storage |
| Storage Account | Standard GRS | 100 GB |
| Azure CDN | Standard | Static asset delivery |
| Application Insights | - | Monitoring and logging |

**Resource Group:** `roshn-platform-rg`
**Region:** UAE North (uaenorth)

**Deployment:**
```bash
./scripts/deploy-azure.sh prod
```

### 3.3 GCP Specifications

| Resource | Type | Specification |
|----------|------|---------------|
| Cloud Run | - | 2 Gi RAM, 2 vCPU |
| Cloud SQL | db-custom-2-4096 | 2 vCPU, 4 GB RAM |
| Cloud Storage | Standard | 100 GB |
| Cloud CDN | - | Static asset delivery |
| Cloud Monitoring | - | Logging and alerts |
| Min Instances | 1 | Always running |
| Max Instances | 10 | Auto-scaling |

**Project:** `roshn-platform`
**Region:** me-central1 (Dammam)

**Deployment:**
```bash
./scripts/deploy-gcp.sh prod
```

---

## Environment Comparison

### Resource Comparison

| Resource | Dev | UAT | Prod |
|----------|-----|-----|------|
| **App CPU** | 4 vCPU | 4 vCPU | 8 vCPU x 2 |
| **App RAM** | 8 GB | 8 GB | 16 GB x 2 |
| **App Storage** | 100 GB | 150 GB | 250 GB x 2 |
| **DB CPU** | Shared | 2 vCPU | 4 vCPU |
| **DB RAM** | 2 GB | 4 GB | 16 GB |
| **DB Storage** | 50 GB | 100 GB | 500 GB |
| **Network** | 100 Mbps | 1 Gbps | 1 Gbps x 2 |
| **Load Balancer** | No | Optional | Yes |
| **SSL** | Optional | Yes | Yes |
| **High Availability** | No | No | Yes |
| **Backup Retention** | 7 days | 14 days | 30 days |

### Cloud SKU Comparison

| Environment | Azure App | Azure DB | GCP Run | GCP SQL |
|-------------|-----------|----------|---------|---------|
| Dev | B1 | B_Gen5_1 | 512Mi/1CPU | db-f1-micro |
| UAT | S1 | GP_Gen5_2 | 1Gi/1CPU | db-custom-1-3840 |
| Prod | P1V2 | GP_Gen5_4 | 2Gi/2CPU | db-custom-2-4096 |

### Domain Configuration

| Environment | On-Premise Domain | Port |
|-------------|-------------------|------|
| Dev | dev.platform.roshn.sa | 3001 |
| UAT | uat.platform.roshn.sa | 3002 |
| Prod | platform.roshn.sa | 3000 |

---

## Environment Variables

Each environment requires the following configuration:

| Variable | Description | Dev | UAT | Prod |
|----------|-------------|-----|-----|------|
| NODE_ENV | Environment mode | development | production | production |
| DATABASE_URL | PostgreSQL connection | Dev DB | UAT DB | Prod DB |
| NEXTAUTH_SECRET | Auth encryption key | Unique | Unique | Unique |
| NEXTAUTH_URL | Application URL | Dev URL | UAT URL | Prod URL |

---

## Security Configuration

| Feature | Dev | UAT | Prod |
|---------|-----|-----|------|
| HTTPS/SSL | Optional | Required | Required |
| 2FA | Optional | Recommended | Required |
| IP Restrictions | No | Optional | Recommended |
| VPN Access | No | Optional | Recommended |
| Audit Logging | Basic | Full | Full |
| Session Timeout | 24h | 8h | 4h |

---

## Monitoring & Alerting

| Metric | Dev | UAT | Prod |
|--------|-----|-----|------|
| Health Checks | Manual | Hourly | Every 5 min |
| Log Retention | 7 days | 14 days | 30 days |
| Alerts | None | Email | Email + SMS |
| Uptime SLA | None | 95% | 99.5% |

---

## Backup Configuration

| Setting | Dev | UAT | Prod |
|---------|-----|-----|------|
| Database Backup | Daily | Daily | Daily |
| Backup Retention | 7 days | 14 days | 30 days |
| Point-in-Time Recovery | No | No | Yes |
| Geo-Redundancy | No | No | Recommended |

---

## Deployment Commands

### Azure

```bash
# Development
./scripts/deploy-azure.sh dev

# UAT
./scripts/deploy-azure.sh staging

# Production
./scripts/deploy-azure.sh prod
```

### Google Cloud Platform

```bash
# Development
./scripts/deploy-gcp.sh dev

# UAT
./scripts/deploy-gcp.sh staging

# Production
./scripts/deploy-gcp.sh prod
```

### On-Premise

```bash
# Development
sudo ./scripts/deploy-onprem.sh dev

# UAT
sudo ./scripts/deploy-onprem.sh staging

# Production
sudo ./scripts/deploy-onprem.sh prod
```

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Azure Deployment](/docs/azure-deployment) | Complete Azure deployment guide |
| [GCP Deployment](/docs/gcp-deployment) | Complete GCP deployment guide |
| [On-Premise Deployment](/docs/onprem-deployment) | Complete on-premise guide |
| [Infrastructure Sizing](/docs/infrastructure-sizing) | Detailed sizing specifications |
| [High-Level Design](/docs/architecture-hld) | System architecture overview |
