# ROSHN Deployment Requirements

## Overview

This document summarizes the requirements for deploying the ROSHN Parametric Masterplan Modelling Platform. The platform supports three deployment options: Azure Cloud, Google Cloud Platform (GCP), and On-Premise servers.

---

## Current Status

| Item | Status |
|------|--------|
| PoC Completion | Completed (Azure Cloud, UAE) |
| Business Validation | Processes and use cases confirmed |
| Production Deployment | Pending (4-8 weeks from kick-off) |

---

## Technical Documentation

All technical documentation is available for ROSHN IT and GRC review:

### Architecture Documents

| Document | Description | Link |
|----------|-------------|------|
| High-Level Design (HLD) | System architecture, technology stack, security layers | [View HLD](/docs/architecture-hld) |
| Detailed Design (DLD) | Database schema, API specs, authentication flows | [View DLD](/docs/architecture-dld) |
| Infrastructure Sizing | Server specifications for all environments | [View Sizing](/docs/infrastructure-sizing) |

### Deployment Guides

| Document | Description | Link |
|----------|-------------|------|
| Azure Deployment | Complete Azure deployment guide | [View Guide](/docs/azure-deployment) |
| GCP Deployment | Complete GCP deployment guide | [View Guide](/docs/gcp-deployment) |
| On-Premise Deployment | Complete on-premise deployment guide | [View Guide](/docs/onprem-deployment) |

### Calculation Documentation

| Document | Description | Link |
|----------|-------------|------|
| Calculations Overview | All calculation formulas and data flow | [View Calculations](/docs/calculations) |
| Building Assets | Building cost calculation methodology | [View Doc](/docs/building-assets) |
| Car Parking | Parking cost calculation methodology | [View Doc](/docs/car-parking) |
| Infrastructure | Infrastructure cost calculation | [View Doc](/docs/infrastructure) |
| Public Realm | Public realm cost calculation | [View Doc](/docs/public-realm) |

---

## Deployment Options

### Option 1: Microsoft Azure

Best for organizations already using Azure or requiring UAE-based hosting.

| Environment | App Service | Database | Use Case |
|-------------|-------------|----------|----------|
| dev | B1 (Basic) | B_Gen5_1 (Basic, 1 vCore) | Development and testing |
| staging | S1 (Standard) | GP_Gen5_2 (2 vCores) | Pre-production testing |
| prod | P1V2 (Premium) | GP_Gen5_4 (4 vCores) | Production workloads |

**Deployment Command:**

```bash
./scripts/deploy-azure.sh [dev|staging|prod]
```

**Region:** UAE North (uaenorth)

**Full Guide:** [Azure Deployment](/docs/azure-deployment)

### Option 2: Google Cloud Platform (GCP)

Best for GCP Dammam region deployment (Saudi Arabia data residency).

| Environment | Cloud SQL | Cloud Run | Scaling | Use Case |
|-------------|-----------|-----------|---------|----------|
| dev | db-f1-micro | 512Mi, 1 CPU | 0-2 instances | Development (scale to zero) |
| staging | db-custom-1-3840 | 1Gi, 1 CPU | 0-5 instances | Pre-production testing |
| prod | db-custom-2-4096 | 2Gi, 2 CPU | 1-10 instances | Production (always-on) |

**Deployment Command:**

```bash
./scripts/deploy-gcp.sh [dev|staging|prod]
```

**Region:** me-central1 (Dammam, Saudi Arabia)

**Full Guide:** [GCP Deployment](/docs/gcp-deployment)

### Option 3: On-Premise Servers

Best for full data sovereignty and ROSHN infrastructure integration.

| Environment | Port | PM2 Instances | SSL | Domain |
|-------------|------|---------------|-----|--------|
| dev | 3001 | 1 | Optional | dev.platform.roshn.sa |
| staging | 3002 | 2 | Required | staging.platform.roshn.sa |
| prod | 3000 | max (all CPUs) | Required | platform.roshn.sa |

**Deployment Command:**

```bash
sudo ./scripts/deploy-onprem.sh [dev|staging|prod]
```

**Full Guide:** [On-Premise Deployment](/docs/onprem-deployment)

---

## Infrastructure Requirements

**Full Details:** [Infrastructure Sizing Document](/docs/infrastructure-sizing)

### Summary by Environment

| Component | Development | Staging | Production |
|-----------|-------------|---------|------------|
| CPU | 4 vCPUs | 4 vCPUs | 8 vCPUs × 2 |
| RAM | 8 GB | 8 GB | 16 GB × 2 |
| Storage | 100 GB SSD | 150 GB SSD | 250 GB SSD × 2 |
| Database | Same server | Separate (2 vCPU, 4GB) | Dedicated (4 vCPU, 16GB) |
| SSL | Optional | Required | Required |
| Load Balancer | No | Optional | Required |

---

## Deployment Timeline (4-8 Weeks)

### Phase 1: Project Initiation

| Action | Owner | Status | Documentation |
|--------|-------|--------|---------------|
| Initiate new demand for project with PM | Ahmad Kawakbi | Pending | - |
| Share infrastructure sizing details | Omnium/Innovaite | ✅ Complete | [Infrastructure Sizing](/docs/infrastructure-sizing) |
| Sign NDA and AUA documents | Omnium team members | Pending | - |

### Phase 2: Environment Setup

| Action | Owner | Status | Documentation |
|--------|-------|--------|---------------|
| Prepare ROSHN environment (on-prem or GCP) | ROSHN IT | Pending | [Infrastructure Sizing](/docs/infrastructure-sizing) |
| Share technical architecture (HLD) | Omnium/Innovaite | ✅ Complete | [High-Level Design](/docs/architecture-hld) |
| Share technical architecture (DLD) | Omnium/Innovaite | ✅ Complete | [Detailed Design](/docs/architecture-dld) |
| Align with GRC requirements | Both parties | ✅ Docs Ready | [HLD](/docs/architecture-hld) + [DLD](/docs/architecture-dld) |

### Phase 3: Deployment & Integration

| Action | Owner | Status | Documentation |
|--------|-------|--------|---------------|
| Onboard vendor on VDI/VPN with PAM | ROSHN IT | Pending | - |
| Deploy application | Omnium/Innovaite | ✅ Scripts Ready | [Azure](/docs/azure-deployment) / [GCP](/docs/gcp-deployment) / [On-Prem](/docs/onprem-deployment) |
| SSO integration with ROSHN-IAM | Both parties | ✅ Docs Ready | [DLD Section 3](/docs/architecture-dld) |

### Phase 4: Security & Testing

| Action | Owner | Status | Documentation |
|--------|-------|--------|---------------|
| Conduct VAPT post UAT setup | ROSHN GRC | ✅ Docs Ready | [HLD Section 7](/docs/architecture-hld) + [DLD Section 6](/docs/architecture-dld) |
| Revise GRC checklist with evidences | Both parties | ✅ Docs Ready | All architecture docs |
| Complete UAT | ROSHN Business | Pending | - |

### Phase 5: Go-Live

| Action | Owner | Status | Documentation |
|--------|-------|--------|---------------|
| Align with change management processes | Both parties | Pending | - |
| GRC approval | ROSHN GRC | Pending | - |
| Production deployment | Omnium/Innovaite | ✅ Scripts Ready | [Azure](/docs/azure-deployment) / [GCP](/docs/gcp-deployment) / [On-Prem](/docs/onprem-deployment) |
| Production launch | Both parties | Pending | - |

---

## Documentation Status

| Document | Status | For Phase |
|----------|--------|-----------|
| [High-Level Design (HLD)](/docs/architecture-hld) | ✅ Complete | Phase 2, 4 |
| [Detailed Design (DLD)](/docs/architecture-dld) | ✅ Complete | Phase 2, 3, 4 |
| [Infrastructure Sizing](/docs/infrastructure-sizing) | ✅ Complete | Phase 1, 2 |
| [Azure Deployment Guide](/docs/azure-deployment) | ✅ Complete | Phase 3, 5 |
| [GCP Deployment Guide](/docs/gcp-deployment) | ✅ Complete | Phase 3, 5 |
| [On-Premise Deployment Guide](/docs/onprem-deployment) | ✅ Complete | Phase 3, 5 |

---

## Security & Compliance

### Technical Security Documentation

| Topic | Document | Section |
|-------|----------|---------|
| Security Architecture | [HLD](/docs/architecture-hld) | Section 7 |
| Authentication Flow | [DLD](/docs/architecture-dld) | Section 3 |
| Password Security | [DLD](/docs/architecture-dld) | Section 6.1 |
| Session Management | [DLD](/docs/architecture-dld) | Section 6.2 |
| 2FA Implementation | [DLD](/docs/architecture-dld) | Section 6.3 |
| Audit Logging | [DLD](/docs/architecture-dld) | Section 9 |
| Network Security | [Infrastructure Sizing](/docs/infrastructure-sizing) | Section 5 |

### Completed Documents

| Document | Status |
|----------|--------|
| Service Activation Checklist | Submitted |
| 3rd Party Controls Assessment | Submitted |

### Security Requirements

- VDI/VPN access with PAM (Privileged Access Management)
- SSO integration with ROSHN-IAM
- VAPT (Vulnerability Assessment and Penetration Testing) post-UAT
- GRC checklist compliance with evidences

---

## Post-Production Support

### SLA Requirements

| Priority | Response Time | Resolution Time |
|----------|---------------|-----------------|
| P1 (Critical) | 30 minutes | 1 hour |
| P2 (High) | 30 minutes | 4 hours |
| P3 (Medium) | 1 hour | 8 hours |
| P4 (Low) | 4 hours | 24 hours |

### Support Process

- Incident management process applies
- Support via ROSHN IT ticketing system

---

## Key Contacts

### ROSHN

| Name | Role | Email |
|------|------|-------|
| Viquar Hashmi | Senior Manager, IT Development | vhashmi@roshn.sa |
| Ahmad Kawakbi | Director, Digital Strategy | akawakbi@roshn.sa |
| Qamar Shah | Director, Commercial Management | qshah@roshn.sa |
| Bassam Alomari | Senior Manager, QA & Control | balomari@roshn.sa |
| Gamal Mohamed | IT | gelnaggar@roshn.sa |
| Hosam Ebada | IT | hebada@roshn.sa |

### Omnium/Innovaite

| Name | Role | Email |
|------|------|-------|
| Sultan Alsohaibi | Branch Director | sultan.alsohaibi@omniumint.com |
| Timothy Shelton | Operations Director | timothy.shelton@omniumint.com |
| Gavin Britton | Technology Director | gavin.britton.innovaite@omniumint.com |
| Mark Collin | Innovaite | mark.collin.innovaite@omniumint.com |

---

## Quick Links

### All Documentation

- [High-Level Design (HLD)](/docs/architecture-hld)
- [Detailed Design (DLD)](/docs/architecture-dld)
- [Infrastructure Sizing](/docs/infrastructure-sizing)
- [Azure Deployment](/docs/azure-deployment)
- [GCP Deployment](/docs/gcp-deployment)
- [On-Premise Deployment](/docs/onprem-deployment)

### Deployment Scripts

```bash
# Clone repository
git clone https://github.com/tajalagawani/roshn.git
cd roshn

# Azure
./scripts/deploy-azure.sh [dev|staging|prod]

# GCP
./scripts/deploy-gcp.sh [dev|staging|prod]

# On-Premise
sudo ./scripts/deploy-onprem.sh [dev|staging|prod]
```
