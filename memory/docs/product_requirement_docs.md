# **Product Requirements Document (PRD)**

## **Deployed Software Inventory Platform**

**Version:** 1.1
**Date:** 2026
**Status:** Approved for Implementation
**Product Type:** Internal Tool
**Audience:** Engineering, DevOps, Security, Product, Operations, Leadership

---

## 1. Introduction

### 1.1 Purpose of the Document

This document defines the **product requirements** for an internal platform whose purpose is to **centralize, standardize, and govern information about all software deployed within the organization’s infrastructure**.

It serves as:

* A single source of truth for **business scope and functional expectations**
* A foundation for backlog creation, QA validation, and acceptance testing
* A shared alignment artifact for technical and non-technical stakeholders

This document **does not prescribe technical implementation details**. It defines *what the system must do and why*, from a business and operational perspective.

---

### 1.2 Business Context and Problem Statement

Currently, the organization maintains information about deployed software across:

* Multiple Excel spreadsheets
* Team-specific documents
* Informal and undocumented sources of truth

This results in:

* Inconsistent and contradictory data
* No authoritative inventory of what is deployed, where, and by whom
* High operational risk during incidents, audits, and changes
* Significant friction when onboarding new teams or developers

An MVP based on **YAML editing and visualization** was created to consolidate this information. While effective for DevOps users, it introduced new problems:

* YAML is a barrier for non-DevOps contributors
* Manual editing increases the risk of structural and semantic errors
* Long-term maintainability and governance are not sustainable

The business requires a **form-based, authenticated, governed platform** that replaces Excel and YAML entirely.

---

### 1.3 Product Goals and Success Criteria

#### Primary Goals

1. Establish a **Single Source of Truth (SSOT)** for all deployed software
2. Enable **multi-team ownership and contribution** (DevOps + Developers)
3. Improve **operational visibility** across environments and domains
4. Enforce **data consistency and validation**
5. Provide **easy consumption and sharing** via Excel export

#### Success Metrics (KPIs)

* ≥ 95% of deployed software registered within 90 days
* ≥ 90% of records contain at least one production interface (where applicable)
* Average time to register a software ≤ 5 minutes
* Reduction of duplicated or conflicting records to zero
* Monthly active usage by at least 80% of engineering teams

---

## 2. Project Scope

### 2.1 In Scope

* Auto-registration (sign-up) for users
* Invitation-based access to organization data
* CRUD management of deployed software
* CRUD management of deployment interfaces
* Management of declared dependencies
* Searchable, filterable tabular inventory
* Export of inventory data to Excel
* Schema-based validation and controlled vocabularies
* Complete removal of YAML as a data source

### 2.2 Out of Scope (Initial Release)

* Import from Excel
* Import or migration from YAML
* Automatic discovery from infrastructure
* CI/CD or SCM integrations
* Runtime monitoring or health checks
* Dependency graph visualization

---

## 3. System Overview

### 3.1 Definition of “Software”

For the purposes of this platform, **software** is defined as:

> Any application, service, frontend, backend, job, mini-app, or system component deployed within the organization’s infrastructure.

This explicitly **includes but is not limited to APIs**.

Examples:

* Web applications
* Mini-apps
* Frontend deployments
* Backend services
* Internal tools
* Supporting services with exposed domains

---

### 3.2 Core Capabilities

The system must allow the organization to:

* Know **what software exists**
* Know **where it is deployed** (domains, environments)
* Know **who owns it**
* Know **what it depends on**
* Know **how to access it**
* Share this information easily with internal stakeholders

---

## 4. User Access and Permissions Model

### 4.1 Onboarding and Access Rules

#### Auto-Registration

* Any user can create an account via self-registration.
* Registration **does not grant visibility into organizational data**.

#### Invitation-Based Access (Mandatory)

* To view or manage deployed software, a user **must be explicitly invited** to the organization.
* This ensures:

  * Controlled access
  * Prevention of accidental data exposure
  * Clear accountability

---

### 4.2 Roles and Permissions (Product Decision)

The following roles are defined to balance **simplicity, safety, and collaboration**:

#### Viewer

* Can view all software records
* Can search, filter, and export to Excel
* Cannot create, edit, or delete data

#### Editor

* Can create and edit software, interfaces, and dependencies
* Cannot delete software
* Intended for Developers and DevOps contributors

#### Admin

* Full CRUD permissions
* Can delete software
* Can invite and manage users
* Intended for platform owners or designated leads

**Rationale:**
Deletion is irreversible and high-impact; restricting it prevents accidental data loss while keeping contribution friction low.

---

## 5. Functional Requirements

### 5.1 Software Management

Each **Software** record must contain:

| Field        | Required | Description                   |
| ------------ | -------- | ----------------------------- |
| Name         | Yes      | Human-readable software name  |
| Owner        | Yes      | Responsible team              |
| Repository   | Yes      | Source code repository URL    |
| Dependencies | No       | Declared logical dependencies |
| Interfaces   | No       | Deployment access points      |

#### Functional Rules

* Software names must be unique within the organization
* Repository must be a valid URL
* Dependencies must not contain duplicates
* Software can exist without interfaces (e.g., internal jobs)

---

### 5.2 Deployment Interfaces

An **Interface** represents a **deployment access point**, not an API contract.

| Field        | Required                   | Notes                              |
| ------------ | -------------------------- | ---------------------------------- |
| Domain       | Yes                        | Fully qualified domain             |
| Environment  | Optional                   | production / staging / development |
| Branch       | Optional                   | Source branch deployed             |
| Runtime Type | Optional                   | Controlled vocabulary              |
| Runtime ID   | Required if runtime exists | Identifier                         |

#### Business Rules

* A software cannot have duplicate domains
* Environment values are restricted to a controlled set
* Runtime is optional, recognizing incomplete infrastructure visibility

---

### 5.3 Dependency Declaration

* Dependencies are **logical declarations**, not enforced relationships
* Stored as strings (e.g., “Upstash Redis”)
* Used for impact analysis and operational awareness

---

## 6. Inventory View (Table)

### 6.1 Table Requirements

The primary interface of the system is a **tabular inventory view**, optimized for scanning and comparison.

Minimum columns:

* Software Name
* Owner
* Repository
* Environments Present (derived)
* Interface Count
* Dependency Count
* Actions (based on role)

---

### 6.2 Search, Filter, and Sort

Users must be able to:

* Search by name, owner, repository, domain, branch
* Filter by environment and runtime type
* Sort by name and owner

---

## 7. Excel Export (Product Decision)

### 7.1 Export Strategy

**Normalized, analysis-friendly format** is chosen.

#### Export Structure

* **One row per interface**
* Software fields repeated per row
* Dependencies exported as a semicolon-separated list

#### Rationale

* Enables pivot tables, filtering, and analysis
* Avoids nested or unreadable cells
* Matches how Excel is actually used in operations and audits

If a software has no interfaces:

* It is exported as a single row with empty interface fields

---

## 8. Non-Functional Requirements

### 8.1 Performance

* Inventory view must load within acceptable operational limits
* Export must complete within reasonable time for large datasets

### 8.2 Usability

* Form-based input with inline validation
* Clear, non-technical error messages
* No YAML or structured text editing

### 8.3 Maintainability

* Validation rules centrally defined
* Controlled vocabularies enforced consistently

---

## 9. Security Requirements

* Authentication required for all access
* Invitation mandatory for data visibility
* Role-based access enforced consistently
* Actions restricted according to permission level

---

## 10. Risks and Mitigation

| Risk                | Mitigation                                       |
| ------------------- | ------------------------------------------------ |
| Low adoption        | Simple UI, Excel export, minimal required fields |
| Incomplete data     | Allow partial records, encourage iteration       |
| Accidental deletion | Restrict delete to Admin role                    |
| Data inconsistency  | Strong validation and controlled vocabularies    |

---

## 11. Future Considerations (Out of Scope)

* Excel import
* Dependency graph visualization
* Integration with SCM or cloud providers
* Automated discovery
* Historical versioning and audit trails

---

## 12. Glossary

| Term        | Definition                         |
| ----------- | ---------------------------------- |
| Software    | Any deployed application or system |
| Interface   | Deployment access point (domain)   |
| Environment | Deployment stage                   |
| Runtime     | Where the software is running      |
| SSOT        | Single Source of Truth             |
