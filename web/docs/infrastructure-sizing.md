# Infrastructure Sizing Details

## ROSHN Parametric Masterplan Modelling Platform

**Version:** 1.0
**Date:** 5 January 2026
**Status:** Production Ready
**Purpose:** Infrastructure provisioning guide for ROSHN IT

> **Note:** The application stack is certified production-ready. Any future enhancements or modifications based on ROSHN feedback will be implemented as iterative improvements and do not affect the current production readiness status.

---

## Executive Summary

This document provides detailed infrastructure specifications for deploying the ROSHN Platform across three environments (Development, Staging, Production) and three deployment options (Azure, GCP, On-Premise).

---

## Environment Overview

| Environment | Purpose | Availability | Users |
|-------------|---------|--------------|-------|
| Development | Feature development and testing | Business hours | 5-10 developers |
| Staging | UAT and pre-production testing | Business hours | 10-20 testers |
| Production | Live business operations | 24/7 | 50-100+ users |

---

## 1. Development Environment

### 1.1 On-Premise Specifications

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT ENVIRONMENT - ON-PREMISE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   APPLICATION SERVER                                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  CPU:        4 vCPUs                                                │   │
│   │  RAM:        8 GB                                                   │   │
│   │  Disk:       100 GB SSD                                             │   │
│   │  OS:         Ubuntu 22.04 LTS / RHEL 8+                             │   │
│   │  Network:    100 Mbps                                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   DATABASE (can be on same server)                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PostgreSQL: 14+                                                    │   │
│   │  Storage:    50 GB (included in above)                              │   │
│   │  Connections: 20 max                                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Component | Specification |
|-----------|---------------|
| CPU | 4 vCPUs (Intel Xeon or equivalent) |
| RAM | 8 GB DDR4 |
| Storage | 100 GB SSD (NVMe preferred) |
| Operating System | Ubuntu 22.04 LTS or RHEL 8+ |
| Network | 100 Mbps dedicated |
| Database | PostgreSQL 14+ (same server) |
| SSL | Optional (self-signed acceptable) |

### 1.2 Azure Specifications

| Resource | SKU | Specification |
|----------|-----|---------------|
| App Service Plan | B1 (Basic) | 1 core, 1.75 GB RAM |
| App Service | Linux | Node.js 20 LTS |
| PostgreSQL | B_Gen5_1 | 1 vCore, 2 GB RAM, 32 GB storage |
| Storage Account | Standard LRS | 10 GB for file uploads |

**Azure Resource Group:** `roshn-platform-dev-rg`

### 1.3 GCP Specifications

| Resource | Type | Specification |
|----------|------|---------------|
| Cloud Run | - | 512 Mi RAM, 1 vCPU |
| Cloud SQL | db-f1-micro | Shared core, 0.6 GB RAM |
| Cloud Storage | Standard | 10 GB for file uploads |
| Min Instances | 0 | Scale to zero when idle |
| Max Instances | 2 | Limited scaling |

**GCP Project:** `roshn-platform-dev`

---

## 2. Staging Environment

### 2.1 On-Premise Specifications

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STAGING ENVIRONMENT - ON-PREMISE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   APPLICATION SERVER                                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  CPU:        4 vCPUs                                                │   │
│   │  RAM:        8 GB                                                   │   │
│   │  Disk:       150 GB SSD                                             │   │
│   │  OS:         Ubuntu 22.04 LTS / RHEL 8+                             │   │
│   │  Network:    1 Gbps                                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   DATABASE SERVER (separate recommended)                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PostgreSQL: 14+                                                    │   │
│   │  CPU:        2 vCPUs                                                │   │
│   │  RAM:        4 GB                                                   │   │
│   │  Storage:    100 GB SSD                                             │   │
│   │  Connections: 50 max                                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Component | Specification |
|-----------|---------------|
| CPU | 4 vCPUs (Intel Xeon or equivalent) |
| RAM | 8 GB DDR4 |
| Storage | 150 GB SSD (NVMe preferred) |
| Operating System | Ubuntu 22.04 LTS or RHEL 8+ |
| Network | 1 Gbps dedicated |
| Database | PostgreSQL 14+ (separate server recommended) |
| SSL | Required (valid certificate) |
| Load Balancer | Optional |

### 2.2 Azure Specifications

| Resource | SKU | Specification |
|----------|-----|---------------|
| App Service Plan | S1 (Standard) | 1 core, 1.75 GB RAM |
| App Service | Linux | Node.js 20 LTS |
| PostgreSQL | GP_Gen5_2 | 2 vCores, 4 GB RAM, 128 GB storage |
| Storage Account | Standard LRS | 50 GB for file uploads |

**Azure Resource Group:** `roshn-platform-staging-rg`

### 2.3 GCP Specifications

| Resource | Type | Specification |
|----------|------|---------------|
| Cloud Run | - | 1 Gi RAM, 1 vCPU |
| Cloud SQL | db-custom-1-3840 | 1 vCPU, 3.75 GB RAM |
| Cloud Storage | Standard | 50 GB for file uploads |
| Min Instances | 0 | Scale to zero when idle |
| Max Instances | 5 | Moderate scaling |

**GCP Project:** `roshn-platform-staging`

---

## 3. Production Environment

### 3.1 On-Premise Specifications

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT - ON-PREMISE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   APPLICATION SERVERS (2x for HA)                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  CPU:        8 vCPUs (each)                                         │   │
│   │  RAM:        16 GB (each)                                           │   │
│   │  Disk:       250 GB SSD (each)                                      │   │
│   │  OS:         Ubuntu 22.04 LTS / RHEL 8+                             │   │
│   │  Network:    1 Gbps                                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   DATABASE SERVER (dedicated)                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PostgreSQL: 14+                                                    │   │
│   │  CPU:        4 vCPUs                                                │   │
│   │  RAM:        16 GB                                                  │   │
│   │  Storage:    500 GB SSD (RAID 10)                                   │   │
│   │  Connections: 200 max                                               │   │
│   │  Replication: Standby recommended                                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   LOAD BALANCER                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Type:       L7 Load Balancer (Nginx/HAProxy)                       │   │
│   │  SSL:        Termination at LB                                      │   │
│   │  Health:     HTTP health checks                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Component | Specification |
|-----------|---------------|
| Application Servers | 2x servers for high availability |
| CPU (per server) | 8 vCPUs (Intel Xeon or equivalent) |
| RAM (per server) | 16 GB DDR4 ECC |
| Storage (per server) | 250 GB SSD (NVMe, RAID 1) |
| Operating System | Ubuntu 22.04 LTS or RHEL 8+ |
| Network | 1 Gbps dedicated, redundant |
| Database Server | Dedicated server |
| Database CPU | 4 vCPUs |
| Database RAM | 16 GB DDR4 ECC |
| Database Storage | 500 GB SSD (RAID 10) |
| SSL | Required (valid certificate) |
| Load Balancer | Required |
| Backup Storage | 1 TB for backups |

### 3.2 Azure Specifications

| Resource | SKU | Specification |
|----------|-----|---------------|
| App Service Plan | P1V2 (Premium) | 1 core, 3.5 GB RAM |
| App Service | Linux | Node.js 20 LTS, 2 instances min |
| PostgreSQL | GP_Gen5_4 | 4 vCores, 8 GB RAM, 256 GB storage |
| Storage Account | Standard GRS | 100 GB for file uploads |
| Azure CDN | Standard | Static asset delivery |
| Application Insights | - | Monitoring and logging |

**Azure Resource Group:** `roshn-platform-rg`

### 3.3 GCP Specifications

| Resource | Type | Specification |
|----------|------|---------------|
| Cloud Run | - | 2 Gi RAM, 2 vCPU |
| Cloud SQL | db-custom-2-4096 | 2 vCPU, 4 GB RAM |
| Cloud Storage | Standard | 100 GB for file uploads |
| Cloud CDN | - | Static asset delivery |
| Min Instances | 1 | Always running |
| Max Instances | 10 | Auto-scaling |
| Cloud Monitoring | - | Logging and alerts |

**GCP Project:** `roshn-platform`

---

## 4. Comparison Summary

### 4.1 Resource Comparison by Environment

| Resource | Development | Staging | Production |
|----------|-------------|---------|------------|
| **App CPU** | 4 vCPU | 4 vCPU | 8 vCPU × 2 |
| **App RAM** | 8 GB | 8 GB | 16 GB × 2 |
| **App Storage** | 100 GB | 150 GB | 250 GB × 2 |
| **DB CPU** | Shared | 2 vCPU | 4 vCPU |
| **DB RAM** | 2 GB | 4 GB | 16 GB |
| **DB Storage** | 50 GB | 100 GB | 500 GB |
| **Network** | 100 Mbps | 1 Gbps | 1 Gbps × 2 |
| **Load Balancer** | No | Optional | Yes |
| **SSL** | Optional | Yes | Yes |
| **HA** | No | No | Yes |

### 4.2 Cloud SKU Comparison

| Environment | Azure App | Azure DB | GCP Run | GCP SQL |
|-------------|-----------|----------|---------|---------|
| Development | B1 | B_Gen5_1 | 512Mi/1CPU | db-f1-micro |
| Staging | S1 | GP_Gen5_2 | 1Gi/1CPU | db-custom-1-3840 |
| Production | P1V2 | GP_Gen5_4 | 2Gi/2CPU | db-custom-2-4096 |

---

## 5. Network Requirements

### 5.1 Required Ports

| Port | Protocol | Service | Access |
|------|----------|---------|--------|
| 22 | TCP | SSH | Internal only (management) |
| 80 | TCP | HTTP | Public (redirects to 443) |
| 443 | TCP | HTTPS | Public |
| 3000 | TCP | Application | Internal only |
| 5432 | TCP | PostgreSQL | Internal only |

### 5.2 Firewall Rules

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FIREWALL CONFIGURATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   INBOUND RULES                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Allow: TCP/443 from 0.0.0.0/0 (HTTPS)                              │   │
│   │  Allow: TCP/80 from 0.0.0.0/0 (HTTP redirect)                       │   │
│   │  Allow: TCP/22 from VPN/Management subnet only                      │   │
│   │  Deny: All other inbound                                            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   INTERNAL RULES                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Allow: TCP/5432 from App servers to DB server                      │   │
│   │  Allow: TCP/3000 from Load balancer to App servers                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   OUTBOUND RULES                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Allow: TCP/443 to Azure AD (SSO)                                   │   │
│   │  Allow: TCP/443 to Mapbox API                                       │   │
│   │  Allow: TCP/443 to npm registry (updates)                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Bandwidth Requirements

| Environment | Minimum | Recommended |
|-------------|---------|-------------|
| Development | 100 Mbps | 100 Mbps |
| Staging | 100 Mbps | 1 Gbps |
| Production | 1 Gbps | 1 Gbps (redundant) |

---

## 6. Storage Requirements

### 6.1 Database Storage Estimates

| Data Type | Est. Size (Year 1) | Est. Size (Year 3) |
|-----------|-------------------|-------------------|
| Users | < 1 MB | < 5 MB |
| Masterplans | ~50 MB | ~500 MB |
| Benchmark Projects | ~100 MB | ~1 GB |
| Cost Model Data | ~20 MB | ~100 MB |
| Audit Logs | ~200 MB | ~2 GB |
| **Total** | **~400 MB** | **~4 GB** |

### 6.2 File Storage Estimates

| File Type | Est. Size (Year 1) | Est. Size (Year 3) |
|-----------|-------------------|-------------------|
| CSV Uploads | ~100 MB | ~500 MB |
| Documents | ~500 MB | ~2 GB |
| Images | ~200 MB | ~1 GB |
| **Total** | **~800 MB** | **~3.5 GB** |

### 6.3 Backup Storage

| Environment | Backup Retention | Storage Required |
|-------------|-----------------|------------------|
| Development | 7 days | 10 GB |
| Staging | 14 days | 50 GB |
| Production | 30 days | 200 GB |

---

## 7. Software Requirements

### 7.1 Required Software Stack

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20 LTS | Application runtime |
| npm | 10+ | Package management |
| PostgreSQL | 14+ | Database |
| Nginx | Latest | Reverse proxy |
| PM2 | Latest | Process manager |
| Git | Latest | Version control |
| OpenSSL | Latest | SSL/TLS |
| Certbot | Latest | SSL certificate management |

### 7.2 Optional Software

| Software | Purpose |
|----------|---------|
| Redis | Session caching (future) |
| Elasticsearch | Log aggregation (future) |
| Prometheus | Metrics collection |
| Grafana | Monitoring dashboard |

---

## 8. High Availability Configuration

### 8.1 Production HA Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HIGH AVAILABILITY ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ┌─────────────┐                                 │
│                              │   Internet  │                                 │
│                              └──────┬──────┘                                 │
│                                     │                                        │
│                              ┌──────▼──────┐                                 │
│                              │    Load     │                                 │
│                              │  Balancer   │                                 │
│                              └──────┬──────┘                                 │
│                         ┌───────────┴───────────┐                            │
│                         │                       │                            │
│                  ┌──────▼──────┐         ┌──────▼──────┐                     │
│                  │   App       │         │   App       │                     │
│                  │  Server 1   │         │  Server 2   │                     │
│                  └──────┬──────┘         └──────┬──────┘                     │
│                         │                       │                            │
│                         └───────────┬───────────┘                            │
│                                     │                                        │
│                              ┌──────▼──────┐                                 │
│                              │  Database   │                                 │
│                              │  Primary    │                                 │
│                              └──────┬──────┘                                 │
│                                     │                                        │
│                              ┌──────▼──────┐                                 │
│                              │  Database   │                                 │
│                              │  Standby    │                                 │
│                              └─────────────┘                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Failover Configuration

| Component | Failover Method | RTO |
|-----------|-----------------|-----|
| Application | Load balancer auto-failover | < 30 seconds |
| Database | Streaming replication | < 5 minutes |
| Load Balancer | Floating IP (if applicable) | < 1 minute |

---

## 9. Monitoring Requirements

### 9.1 Metrics to Monitor

| Category | Metrics |
|----------|---------|
| Application | Response time, error rate, requests/sec |
| Database | Connections, query time, disk usage |
| System | CPU, RAM, disk I/O, network |
| Business | Active users, masterplans created |

### 9.2 Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 75% | > 90% |
| Disk Usage | > 70% | > 85% |
| Response Time | > 2s | > 5s |
| Error Rate | > 1% | > 5% |
| DB Connections | > 70% | > 90% |

---

## 10. Provisioning Checklist

### 10.1 Development Environment

- [ ] Provision application server (4 vCPU, 8 GB RAM, 100 GB SSD)
- [ ] Install Ubuntu 22.04 LTS or RHEL 8+
- [ ] Install Node.js 20 LTS
- [ ] Install PostgreSQL 14+
- [ ] Configure firewall rules
- [ ] Create database and user
- [ ] Deploy application

### 10.2 Staging Environment

- [ ] Provision application server (4 vCPU, 8 GB RAM, 150 GB SSD)
- [ ] Provision database server (2 vCPU, 4 GB RAM, 100 GB SSD)
- [ ] Install operating systems
- [ ] Install required software
- [ ] Configure SSL certificate
- [ ] Configure firewall rules
- [ ] Setup monitoring
- [ ] Deploy application

### 10.3 Production Environment

- [ ] Provision 2x application servers (8 vCPU, 16 GB RAM, 250 GB SSD each)
- [ ] Provision database server (4 vCPU, 16 GB RAM, 500 GB SSD)
- [ ] Provision standby database server
- [ ] Configure load balancer
- [ ] Install operating systems
- [ ] Install required software
- [ ] Configure SSL certificate
- [ ] Configure firewall rules
- [ ] Setup backup solution
- [ ] Setup monitoring and alerting
- [ ] Configure database replication
- [ ] Deploy application
- [ ] Test failover procedures

---

## 11. Contact Information

For infrastructure provisioning questions, contact:

| Role | Contact |
|------|---------|
| Technical Lead | Gavin Britton |
| Operations | Timothy Shelton |
| ROSHN IT | Viquar Hashmi |
