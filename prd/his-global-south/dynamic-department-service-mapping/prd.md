# Product Requirements Document (PRD): Dynamic Department & Service Mapping

## 1. Executive Summary
This feature removes all hardcoded consultation and triage service codes (`CONSULT-NEW`, `CONSULT-OPD`, `CONSULT-EMERGENCY`, `TRIAGE-ED`, `REG-FEE`) across the HIS. It allows hospitals to link custom or standard Service Catalog items directly to each department, enabling customized pricing, department-specific consultation fees, triage fees, and configurable free follow-up grace windows.

---

## 2. User Stories & Acceptance Criteria

### US-1: Configure Department Services (Hospital Administrator)
* **As a** Hospital Admin in Facility Master,
* **I want to** select default Doctor Consultation, Follow-up, and Triage services for each department, and set a free follow-up grace window (in days),
* **So that** billing charges automatically reflect our hospital's departmental fee schedule.
* **Acceptance Criteria:**
  - Dropdown selectors in Facility Master for Consultation Service, Follow-up Service, and Triage Service.
  - Number input for Follow-up Grace Days (default: 7 days).
  - Toggle for "Is Follow-up Free during grace window" (default: true).

### US-2: Automatic Check-in & Registration Billing (Receptionist / Cashier)
* **As a** Front Desk Receptionist,
* **I want** the system to automatically calculate the registration and doctor consultation fees based on the selected department,
* **So that** I don't have to manually pick service codes or enter amounts at checkout.
* **Acceptance Criteria:**
  - Department selection dynamically fetches and displays fee breakdown.
  - Check-in creates receipt items linked to the department's configured `service_catalog_id`.
  - Payment collection modal (`CollectPaymentDialog`) pre-populates with the exact database balance.

### US-3: Emergency Fast-Track Intake (ER Nurse & Doctor)
* **As an** Emergency Nurse / Doctor,
* **I want** triage intake to post the department's configured triage service fee, and doctor encounter to post the doctor fee,
* **So that** emergency billing is accurate and unblocked.
* **Acceptance Criteria:**
  - ER triage posts `department.default_triage_service_id`.
  - ER doctor consultation posts `department.default_consultation_service_id`.

---

## 3. Implementation Documentation Links
* 📘 [Implementation Guide](file:///Users/rahulranjan/Desktop/Projects/AI-orchestrator/prd/his-global-south/dynamic-department-service-mapping/implementation-guide.md)
* 📐 [Technical Design](file:///Users/rahulranjan/Desktop/Projects/AI-orchestrator/prd/his-global-south/dynamic-department-service-mapping/technical-design.md)
* 📋 [Feature Specification](file:///Users/rahulranjan/Desktop/Projects/AI-orchestrator/specs/features/his-global-south/dynamic-department-service-mapping.md)
