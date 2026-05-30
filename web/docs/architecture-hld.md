# High-Level Design (HLD)

## ROSHN Parametric Masterplan Modelling Platform

**Version:** 1.0
**Date:** 5 January 2026
**Status:** Production Ready

> **Note:** The application stack is certified production-ready. Any future enhancements or modifications based on ROSHN feedback will be implemented as iterative improvements and do not affect the current production readiness status.

---

## 1. Executive Summary

The ROSHN Parametric Masterplan Modelling Platform is a web-based application designed to calculate and model construction costs for real estate development projects. The platform enables cost estimation through parametric modelling, benchmark comparison, and multi-phase project planning.

---

## 2. System Overview

### 2.1 Purpose

The platform provides:
- Parametric cost modelling for masterplan developments
- Benchmark project comparison and analysis
- Multi-phase project timeline planning
- Role-based access control with team collaboration
- Comprehensive audit logging and reporting

### 2.2 Key Features

| Feature | Description |
|---------|-------------|
| Masterplan Modelling | Create and manage development cost estimates |
| Cost Calculations | Automated building, infrastructure, and parking cost calculations |
| Benchmark Projects | Import and compare against historical project data |
| Phase Planning | Multi-phase timeline with quarterly scheduling |
| Team Collaboration | Assign team members with role-based permissions |
| Configuration | Customizable cost factors and parametric matrices |
| Audit Trail | Complete activity logging for compliance |

---

## 3. Architecture Overview

### 3.1 System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ROSHN PLATFORM ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                           PRESENTATION LAYER                             │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│   │  │  Dashboard  │  │ Masterplans │  │  Projects   │  │   Admin     │    │   │
│   │  │    Page     │  │    Pages    │  │   Pages     │  │   Pages     │    │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│   │                           React Components (Next.js 14)                  │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                         │
│                                        ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          APPLICATION LAYER                               │   │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │   │
│   │  │  Server Actions │  │   API Routes    │  │  Auth (NextAuth)│         │   │
│   │  │  (Business Logic)│ │   (REST API)    │  │   + 2FA/SSO     │         │   │
│   │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │   │
│   │                                                                          │   │
│   │  ┌─────────────────────────────────────────────────────────────┐        │   │
│   │  │                   CALCULATION ENGINE                         │        │   │
│   │  │  • Building Asset Costs    • Infrastructure Costs            │        │   │
│   │  │  • Car Parking Costs       • Public Realm Costs              │        │   │
│   │  │  • Parametric Adjustments  • Cost Factor Uplift              │        │   │
│   │  └─────────────────────────────────────────────────────────────┘        │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                         │
│                                        ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                            DATA LAYER                                    │   │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │   │
│   │  │   Prisma ORM    │  │   PostgreSQL    │  │  File Storage   │         │   │
│   │  │   (Data Access) │  │   (Database)    │  │  (Uploads)      │         │   │
│   │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14, React 18, TypeScript | User interface and client-side logic |
| Styling | Tailwind CSS, shadcn/ui | Component styling and UI library |
| State | React Query, Zustand | Data fetching and client state |
| Backend | Next.js API Routes, Server Actions | Business logic and API endpoints |
| Authentication | NextAuth.js v5 | User authentication with 2FA and SSO |
| Database | PostgreSQL 14+ | Relational data storage |
| ORM | Prisma | Database access and migrations |
| Process Manager | PM2 | Production process management |
| Reverse Proxy | Nginx | Load balancing and SSL termination |

---

## 4. Component Architecture

### 4.1 Core Modules

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE MODULES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐              │
│   │   MASTERPLAN  │    │   BENCHMARK   │    │     COST      │              │
│   │    MODULE     │    │    MODULE     │    │    MODULE     │              │
│   ├───────────────┤    ├───────────────┤    ├───────────────┤              │
│   │ • Create/Edit │    │ • Import CSV  │    │ • Cost Model  │              │
│   │ • Phases      │    │ • Compare     │    │ • Parametric  │              │
│   │ • Team        │    │ • Map View    │    │ • Cost Factors│              │
│   │ • Export      │    │ • NRM Data    │    │ • Configuration│             │
│   └───────────────┘    └───────────────┘    └───────────────┘              │
│                                                                              │
│   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐              │
│   │     USER      │    │    ADMIN      │    │    AUDIT      │              │
│   │    MODULE     │    │    MODULE     │    │    MODULE     │              │
│   ├───────────────┤    ├───────────────┤    ├───────────────┤              │
│   │ • Auth/Login  │    │ • User Mgmt   │    │ • Activity Log│              │
│   │ • 2FA Setup   │    │ • Settings    │    │ • Change Track│              │
│   │ • Profile     │    │ • SSO Config  │    │ • Export Logs │              │
│   │ • Permissions │    │ • System      │    │ • Compliance  │              │
│   └───────────────┘    └───────────────┘    └───────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Module Descriptions

| Module | Responsibility |
|--------|---------------|
| **Masterplan** | Create, edit, and manage masterplan projects with multi-phase support |
| **Benchmark** | Import historical projects and compare costs across developments |
| **Cost** | Manage cost model entries, parametric matrices, and cost factors |
| **User** | Authentication, authorization, profile management, and 2FA |
| **Admin** | System administration, user management, and configuration |
| **Audit** | Activity logging, change tracking, and compliance reporting |

---

## 5. Data Flow

### 5.1 Masterplan Creation Flow

```text
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │────▶│   Select    │────▶│   Enter     │────▶│  Calculate  │
│  Login  │     │ Asset Type  │     │ Parameters  │     │   Costs     │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                               │
                                                               ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  View   │◀────│   Assign    │◀────│   Define    │◀────│   Review    │
│ Summary │     │    Team     │     │   Phases    │     │   Results   │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 5.2 Cost Calculation Flow

```text
┌─────────────────┐
│  Input Values   │
│  • GLA/GFA      │
│  • Unit Count   │
│  • Parameters   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Cost Model    │────▶│   Parametric    │
│   Lookup        │     │   Adjustments   │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
┌─────────────────┐     ┌─────────────────┐
│   Cost Factor   │◀────│   Base Cost     │
│   Uplift        │     │   Calculation   │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Final Cost    │
│   Summary       │
│   • Building    │
│   • Infra       │
│   • Parking     │
│   • Public Realm│
└─────────────────┘
```

---

## 6. Integration Points

### 6.1 External Integrations

| Integration | Type | Purpose |
|-------------|------|---------|
| Azure AD / ROSHN-IAM | SSO | Single Sign-On authentication |
| Mapbox | API | Map visualization for benchmark projects |
| CSV Import | File | Bulk data import for cost models and benchmarks |
| PDF/Excel Export | File | Report generation and data export |

### 6.2 Integration Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│   │  Azure AD   │    │   Mapbox    │    │    File     │                 │
│   │    SSO      │    │    Maps     │    │   Import    │                 │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│          │                  │                   │                        │
│          ▼                  ▼                   ▼                        │
│   ┌──────────────────────────────────────────────────────────┐          │
│   │                    ROSHN PLATFORM                         │          │
│   └──────────────────────────────────────────────────────────┘          │
│          │                  │                   │                        │
│          ▼                  ▼                   ▼                        │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│   │    User     │    │  Benchmark  │    │    Cost     │                 │
│   │   Session   │    │   Display   │    │    Model    │                 │
│   └─────────────┘    └─────────────┘    └─────────────┘                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Security Architecture

### 7.1 Security Layers

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          SECURITY ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Layer 1: Network Security                                              │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  • HTTPS/TLS encryption    • Firewall rules                     │   │
│   │  • VPN access              • Rate limiting                      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Layer 2: Application Security                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  • JWT session tokens      • CSRF protection                    │   │
│   │  • Input validation        • SQL injection prevention           │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Layer 3: Authentication                                                │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  • Password hashing (bcrypt)  • Two-Factor Auth (TOTP)          │   │
│   │  • Account lockout            • SSO integration                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Layer 4: Authorization                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  • Role-based access (RBAC)   • Project-level permissions       │   │
│   │  • Country/Developer filtering • Team member roles              │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Layer 5: Data Security                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  • Encrypted secrets          • Database encryption             │   │
│   │  • Audit logging              • Data backup                     │   │
│   └─────────────────────────────────────────────────────────────────┘   │.
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full system access, user management, configuration |
| **DEVELOPMENT_MANAGER** | Create/edit masterplans, manage assigned projects |
| **VIEWER** | Read-only access to assigned projects |

### 7.3 Team Roles (Project Level)

| Role | Permissions |
|------|-------------|
| **MANAGER** | Full access to specific project, can edit masterplans |
| **VIEWER** | Read-only access to specific project |

---

## 8. Scalability & Performance

### 8.1 Scalability Strategy

| Aspect | Strategy |
|--------|----------|
| **Horizontal Scaling** | PM2 cluster mode, Cloud Run auto-scaling |
| **Database** | Connection pooling, read replicas for reporting |
| **Caching** | React Query caching, database query optimization |
| **CDN** | Static asset delivery via CDN |

### 8.2 Performance Targets

| Metric | Target |
|--------|--------|
| Page Load Time | < 2 seconds |
| API Response Time | < 500ms |
| Database Query Time | < 100ms |
| Concurrent Users | 100+ simultaneous |

---

## 9. Deployment Architecture

### 9.1 Environment Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ENVIRONMENTS                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│   │   DEVELOPMENT   │  │     STAGING     │  │   PRODUCTION    │        │
│   ├─────────────────┤  ├─────────────────┤  ├─────────────────┤        │
│   │ • Local/Dev     │  │ • Pre-production│  │ • Live system   │        │
│   │ • Feature test  │  │ • UAT testing   │  │ • High availability│     │
│   │ • Debug enabled │  │ • Data migration│  │ • Monitoring    │        │
│   │ • Mock data     │  │ • Integration   │  │ • Backup/DR     │        │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Deployment Options

| Platform | Use Case | Documentation |
|----------|----------|---------------|
| Microsoft Azure | UAE-based cloud hosting | [Azure Guide](/docs/azure-deployment) |
| Google Cloud (GCP) | Saudi Arabia data residency | [GCP Guide](/docs/gcp-deployment) |
| On-Premise | Full data sovereignty | [On-Premise Guide](/docs/onprem-deployment) |

---

## 10. Monitoring & Logging

### 10.1 Monitoring Strategy

| Component | Monitoring |
|-----------|------------|
| Application | PM2 metrics, health checks |
| Database | Connection pool, query performance |
| Infrastructure | CPU, memory, disk usage |
| Security | Failed logins, suspicious activity |

### 10.2 Logging Strategy

| Log Type | Retention | Purpose |
|----------|-----------|---------|
| Application Logs | 30 days | Debugging and troubleshooting |
| Audit Logs | 1 year | Compliance and security |
| Access Logs | 90 days | Security analysis |
| Error Logs | 30 days | Issue resolution |

---

## 11. Disaster Recovery

### 11.1 Backup Strategy

| Data Type | Frequency | Retention |
|-----------|-----------|-----------|
| Database | Daily | 30 days |
| Configuration | On change | 90 days |
| File Uploads | Daily | 30 days |

### 11.2 Recovery Objectives

| Metric | Target |
|--------|--------|
| Recovery Time Objective (RTO) | 4 hours |
| Recovery Point Objective (RPO) | 24 hours |

---

## 12. Compliance & Standards

### 12.1 Compliance Requirements

| Standard | Status |
|----------|--------|
| Data Privacy | Compliant |
| Audit Trail | Implemented |
| Role-Based Access | Implemented |
| Encryption (TLS) | Enabled |
| Password Policy | Enforced |

### 12.2 Security Standards

- OWASP Top 10 protection
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection (React sanitization)
- CSRF protection (NextAuth)
