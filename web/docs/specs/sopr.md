# `sopr` — Schedule of Project Requirements

The project-specific brief: **what the Employer wants delivered, in what
format, by when, and to what standard**. Sits between ITT (rules of
submission) and COC (contract terms).

The Dubai Creek Harbour Bridges District SOPR is **553 pages** with **12
main sections + 18 appendices**. It is the most data-rich doc in the
tender package.

---

## 1. Identity

| Field | Value |
| --- | --- |
| `id` | `sopr` |
| `label` | Schedule of Project Requirements |
| `shortLabel` | SOPR |
| `scope` | required |
| `category` | "Schedule of Project Requirements" |
| `required` | ✓ |
| `manualFeasible` | **mixed** — quantitative blocks are manual-friendly; appendices vary; descriptive clauses are upload-only |
| Sample | `Bridges District Schedule of Project Requirements- SOPR.pdf` · 553 pages · Dec 2025 Rev 00 · Microsoft Word → Print To PDF |

---

## 2. Field inventory — main body (Sections 1-12)

### Section 1 — SCOPE (pp 1-8)

| Field | Class | Notes |
| --- | --- | --- |
| `scope.introduction.workType` | EXTRACT | "Buildings, Public Realm & Landscape Design" |
| `scope.introduction.locationDistrict` | EXTRACT | "Bridges District" |
| `scope.introduction.developmentName` | VERIFY | "Dubai Creek Harbour Development" |
| `scope.introduction.employer` | VERIFY | "Dubai Creek Harbour LLC" |
| `scope.introduction.emirate` | EXTRACT | "Dubai" |
| `scope.introduction.developmentSize` | DISPLAY | "7.4 million sqm residential + 500,000 sqm parks" |
| `scope.introduction.districtsCount` | DISPLAY | "9 districts" |
| `scope.drawingsAndSpec.deviationClauseRef` | EXTRACT | "Clause 22 (Variations) of COC" |
| `scope.extentOfWorks.obligations[]` | DISPLAY | Bullet list of standards (skill, care, diligence) |
| `scope.extentOfWorks.elements[]` | EXTRACT | The N-item list under Clause 1.3(b) — checkbox per element |
| `scope.extentOfWorks.elements[].name` | EXTRACT | "Hardscape", "Softscape", "Steps", "Ramps", "Planter Walls", "Street Furniture", "Play Equipment", "Shade Structures", "Architectural Structures (Urban Beach Hub & Substation)", "Pools and Water features", "Signage and Wayfinding", "Landscape Lighting" |
| `scope.utilityNetworks[]` | EXTRACT | Letter-coded sub-list (a-n): Potable Water, Fire Fighting, Storm Water, Sewerage, Irrigation, Power, Landscape Lighting Cable Circuitry, Fire Alarm + Emergency Lighting, Ducting/Manholes/Cabling, Earthing System, Public Address, HVAC, Security CCTV, Telephone System |
| `scope.ancillaryItems[]` | EXTRACT | Numbered list of 8 ancillary obligations (Drawings, Equipment, Security, etc.) |
| `scope.designAndBuild.flag` | EXTRACT | true/false from Clause 1.4 |
| `scope.designAndBuild.scope` | EXTRACT | which elements are D&B |
| `scope.worksByOthers[]` | EXTRACT | List of adjacent / nominated subcontractor scopes (Clause 1.5) |
| `scope.worksByOthers[].provider` | EXTRACT | who carries out |
| `scope.worksByOthers[].interfacePoints` | EXTRACT | coordination touchpoints |

### Section 2 — KEY DATES (pp 9-10)

This is **the heart of the compliance matrix seeding**.

| Field | Class | Notes |
| --- | --- | --- |
| `keyDates.commencementSubmissions[].id` | EXTRACT | (i)–(vii) |
| `keyDates.commencementSubmissions[].label` | EXTRACT | "Programme for the carrying out and completion of the Works", "Detailed method statement", "Detailed schedule of material submittals", "Detailed schedule of drawings", "Safety plan", "QA/QC plan", "Staffing schedule" |
| `keyDates.commencementSubmissions[].daysAfterCommencement` | EXTRACT | 28 (all 7 in this sample) |
| `keyDates.sequenceAndTiming.notes` | DISPLAY | Sectional Completion + Plot Access Required By + All Plot Utilities/Road Connections Required By |
| `keyDates.sequenceAndTiming.scheduleRef` | EXTRACT | "Appendix F — Schedule Requirements (Infrastructure)" |
| `keyDates.possessionOfSite.deliveryMode` | EXTRACT | "in portions" |
| `keyDates.otherContractors.coordinationRequired` | EXTRACT | true |
| `sectionsOfTheWorks[].milestone` | EXTRACT | 1, 2, 3 … |
| `sectionsOfTheWorks[].sectionName` | EXTRACT | "Buildings, Public Realm & Landscape Design Works in Bridges District" |
| `sectionsOfTheWorks[].timeForCompletionDays` | EXTRACT (number) | 480 |
| `sectionsOfTheWorks[].startReference` | EXTRACT | "Commencement Date" |
| `sectionsOfTheWorks[].finishReference` | EXTRACT | "Time for Completion stated in Particular Conditions of Contract" |
| (Cross-check) | VERIFY | `sectionsOfTheWorks[i].timeForCompletionDays` must equal corresponding `fot.timesForCompletion[i].days` |

### Section 3 — SITE CONDITIONS AND TEMPORARY SERVICES (pp 10-13)

**3.1 Site Conditions (8 climate/environment data points):**

| Field | Class | Source / value example |
| --- | --- | --- |
| `siteConditions.locationSummary` | DISPLAY | "Site is located at Dubai Creek Harbour Development …" |
| `siteConditions.ambientTempMaxC` | EXTRACT | 50 |
| `siteConditions.ambientTempMinC` | EXTRACT | 7 |
| `siteConditions.relativeHumidityMaxPct` | EXTRACT | 100 |
| `siteConditions.seawaterTempMaxC` | EXTRACT | 40 |
| `siteConditions.seawaterTempMinC` | EXTRACT | 19 |
| `siteConditions.rainfallNotes` | DISPLAY | "low precipitation, distribution erratic, heavy showers …" |
| `siteConditions.fogAndDewNotes` | DISPLAY | "winter night/morning fog 2h post-sunset to 2h post-dawn …" |
| `siteConditions.windGust3sec50yrMs` | EXTRACT | 44 |
| `siteConditions.windRecordedGustMs[]` | EXTRACT | [23, 35] (Dubai Intl Airport history) |
| `siteConditions.sandstormSeasons[]` | EXTRACT | ["Jan-Mar", "Aug-Oct"] |
| `siteConditions.seismicIntensity` | EXTRACT | "MMV II (Modified Mercalli) or greater in 60 years" |
| `siteConditions.corrosionNotes` | DISPLAY | salt-spray + saline dew → severe corrosion conditions |

**3.2 Temporary Services and Facilities (13 sub-services):**

Each sub-service is a row in `tempServicesAndFacilities[]`:

| Sub-clause | Field | Class |
| --- | --- | --- |
| 3.2.1 | `tempServices.electricity.provision` | DISPLAY (full text) |
| 3.2.1 | `tempServices.electricity.contractorObligation` | EXTRACT (yes/no/shared) |
| 3.2.2 | `tempServices.water.provision` | DISPLAY |
| 3.2.2 | `tempServices.water.contractorObligation` | EXTRACT |
| 3.2.3 | `tempServices.compressedAir.provision` | DISPLAY |
| 3.2.4 | `tempServices.telephoneEmailFax.provision` | DISPLAY |
| 3.2.5 | `tempServices.temporaryOfficesAndSanitary.provision` | DISPLAY |
| 3.2.6 | `tempServices.ablutionFacilities.provision` | DISPLAY |
| 3.2.7 | `tempServices.storageFabricationAssemblyArea.provision` | DISPLAY |
| 3.2.8 | `tempServices.messingFacilities.provision` | DISPLAY |
| 3.2.9 | `tempServices.facilitiesForEmployerEngineer.provision` | EXTRACT (the Contractor's obligation) |
| 3.2.10 | `tempServices.designOfTemporaryWorks.contractorResponsibility` | EXTRACT |
| 3.2.11 | `tempServices.removalOfTemporaryWorks.endOfContractDuty` | EXTRACT |
| 3.2.12 | `tempServices.liftingEquipment.standards[]` | EXTRACT |
| 3.2.13 | `tempServices.transportationOfPersonnel.requirements` | EXTRACT |

### Section 4 — NOT USED (p 14)

Marker only — `notUsed: true`. No fields.

### Section 5 — TRANSPORT AND HANDLING (pp 15-16)

| Field | Class |
| --- | --- |
| `transport.packingAndMarking.requirements[]` | EXTRACT |
| `transport.packingAndMarking.markingFormat` | EXTRACT |
| `transport.transportationToSite.routeApprovalRequired` | EXTRACT |
| `transport.transportationToSite.specialEquipmentNotice` | EXTRACT |
| `transport.storageHandlingUnpacking.requirements[]` | EXTRACT |
| `transport.protectionOfPlant.measures[]` | EXTRACT |

### Section 6 — SITE REQUIREMENTS (pp 16-21)

18 sub-clauses. Each contributes one to several form fields.

| Sub-clause | Key fields |
| --- | --- |
| 6.1 Site Plan Demarcation | `site.demarcationPlanRequired`, `site.demarcationApprovalDays` |
| 6.2 Access | `site.accessRoutes[]`, `site.accessApprovalRequired` |
| 6.3 Obstruction of Access | `site.obstructionPolicy` |
| 6.4 Temporary Roads and Access Ramps | `site.tempRoadsApprovedBy`, `site.maintenanceObligation` |
| 6.5 Use and Protection of the Site | `site.protectionMeasures[]` |
| 6.6 Nameboards and Advertisements | `site.nameboardRequired`, `site.advertisingProhibited` |
| 6.7 Cleaning of Site | `site.cleaningFrequency`, `site.finalCleaningDuty` |
| 6.8 Contractor's Working Area | `site.workingAreaBoundary`, `site.workingAreaApprovalRequired` |
| 6.9 Site Security | `site.securityObligation`, `site.guardingHours`, `site.fencingRequirement` |
| 6.10 Safety, Health and Welfare | `site.safetyPolicyRequired`, `site.welfareFacilitiesRequired[]`, `site.medicalRoomRequired` |
| 6.11 Precautions against Fire | `site.firePolicyRequired`, `site.fireFightingEquipment[]`, `site.fireWatchHours` |
| 6.12 Working Hours | `site.normalHoursStart`, `site.normalHoursEnd`, `site.weekendWork`, `site.nightWorkPermitRequired` |
| 6.13 Scaffolding | `site.scaffoldingStandard`, `site.scaffoldingInspectionFrequency` |
| 6.14 Dewatering | `site.dewateringRequired`, `site.dewateringDischargeApprovedBy` |
| 6.15 Existing Site Services | `site.existingServicesNotice`, `site.utilityCoordinationRequired` |
| 6.16 Setting Out and Levels | `site.settingOutSurvey`, `site.surveyRecordSubmissionFrequency` |
| 6.17 Additional Works | `site.additionalWorks` (here: "CREEK BEACH LINEAR PARK" — VERIFY) |
| 6.18 Work by Others | `site.workByOthers[]` |

### Section 7 — DRAWINGS AND DOCUMENTATION (pp 22-30)

This section is heavy on submittal-deadline requirements.

| Field | Class | Notes |
| --- | --- | --- |
| `drawings.general.standards[]` | EXTRACT | British / ISO / Emaar in-house |
| `drawings.toBeProvidedByContractor.generalRules` | EXTRACT | scale, sheet sizes, software |
| `drawings.submissionAndApproval.workflow` | EXTRACT | submit → engineer review → resubmit cycles |
| `drawings.programForSubmission.framework` | EXTRACT | per Clause 2.1 + as needed for sequence |
| `drawings.programForSubmission.earlyApprovalNotice` | EXTRACT | latest-date-required policy |
| `drawings.siteRevision.revisionWorkflow` | EXTRACT | two marked-up prints |
| `drawings.asBuilt.markupRequirement` | EXTRACT | red-line markup |
| `drawings.asBuilt.takingOverPrerequisite` | EXTRACT | true |
| `drawings.asBuilt.updateWindowMonths` | EXTRACT | 1 |
| `drawings.asBuilt.digitalUploadTarget` | EXTRACT | "Client's file sharing portal (UNIFIER)" |
| `drawings.methodStatement.submissionDays` | EXTRACT | 14 (≥ 2 weeks before activity) |
| `drawings.testCertificates.copiesRequired` | EXTRACT | 3 |
| `drawings.testCertificates.submissionDays` | EXTRACT | 7 (after completion of test) |
| `drawings.omManuals.requiredPerSectionPortion` | EXTRACT | true |
| `drawings.omManuals.takingOverPrerequisite` | EXTRACT | true |
| `drawings.omManuals.pageSize` | EXTRACT | "A4" |
| `drawings.omManuals.bindingType` | EXTRACT | "black durable rigid cover, gold lettering, no threaded posts" |
| `drawings.omManuals.firstVolumeContents[]` | EXTRACT | Title / Index / TOC / Use / Operating philosophy / Operating conditions / Description of equipment / Description of operation / Plant arrangement |
| `drawings.omManuals.perPartVolumes.section1Operation[]` | EXTRACT | (General description, Performance, Starting instructions, Operating, Shut-down, Emergency, Preservation, Installation/commissioning, Design data) |
| `drawings.omManuals.perPartVolumes.section2Maintenance[]` | EXTRACT | (Fault finding, Dismantling, Maintenance, Settings, Assembly, Circuit diagrams, Exploded views) |
| `drawings.omManuals.perPartVolumes.section3PartsCatalogue[]` | EXTRACT | (Replacement list, Drawings, Ordering instructions) |
| `drawings.omManuals.submissionWindow` | EXTRACT | (per Clause 7.6.3 — typically 2-4 weeks before substantial completion) |
| `drawings.testingCommissioning.programRequired` | EXTRACT | true |
| `drawings.testingCommissioning.snaglistResolutionMaxDays` | EXTRACT | |
| `drawings.computerSoftware.licensingTransfer` | EXTRACT | true (transfers to Employer) |
| `drawings.computerSoftware.sourceCodeRequired` | EXTRACT | true/false |

### Section 8 — COORDINATION (p 30)

| Field | Class |
| --- | --- |
| `coordination.general.workflow` | EXTRACT |
| `coordination.general.coordinationMeetingFrequency` | EXTRACT |
| `coordination.general.interfaceManagementPlanRequired` | EXTRACT |

### Section 9 — PLANNING, MONITORING AND ADMINISTRATION (pp 31-33)

Critical compliance-criterion seeder. Each sub-clause = 1+ criteria.

| Sub-clause | Field | Class |
| --- | --- | --- |
| 9.1 Programme | `planning.programme.softwareRequired` | EXTRACT (Primavera P6 / MS Project) |
| 9.1 | `planning.programme.timeScale` | EXTRACT (weekly) |
| 9.1 | `planning.programme.detailLevel` | EXTRACT |
| 9.1 | `planning.programme.activityCountMin` | EXTRACT |
| 9.2 Submittal Schedule | `planning.submittalSchedule.format` | EXTRACT |
| 9.2 | `planning.submittalSchedule.updateFrequency` | EXTRACT (weekly / fortnightly) |
| 9.3 Programme Systems | `planning.programmeSystems.systems[]` | EXTRACT |
| 9.4 Calendar | `planning.calendar.workingDaysPerWeek` | EXTRACT |
| 9.4 | `planning.calendar.publicHolidaysObserved` | EXTRACT |
| 9.5 Access to Offices | `planning.accessToOffices.hours` | EXTRACT |
| 9.6 Meetings | `planning.meetings.kickoffRequired` | EXTRACT |
| 9.6 | `planning.meetings.weeklyProgressMeeting` | EXTRACT (true/false) |
| 9.6 | `planning.meetings.monthlyExecutiveMeeting` | EXTRACT |
| 9.6 | `planning.meetings.attendeesRequired[]` | EXTRACT |
| 9.7 Progress Reports | `planning.progressReports.frequency` | EXTRACT (weekly) |
| 9.7 | `planning.progressReports.sectionsRequired[]` | EXTRACT |
| 9.7 | `planning.progressReports.format` | EXTRACT |
| 9.8 Site Photographs | `planning.sitePhotographs.frequency` | EXTRACT |
| 9.8 | `planning.sitePhotographs.formatResolution` | EXTRACT |
| 9.8 | `planning.sitePhotographs.subjectsRequired[]` | EXTRACT |
| 9.9 Staffing Schedule | `planning.staffingSchedule.format` | EXTRACT |
| 9.9 | `planning.staffingSchedule.updateFrequency` | EXTRACT |
| 9.10 Subcontractors | `planning.subcontractors.approvalRequired` | EXTRACT (true) |
| 9.10 | `planning.subcontractors.listSubmissionWindowDays` | EXTRACT |
| 9.11 Handovers | `planning.handovers.documentsList[]` | EXTRACT |
| 9.11 | `planning.handovers.materialReturnPolicy` | EXTRACT |
| 9.12 Site Diaries and Quality Records | `planning.siteDiaries.format` | EXTRACT |
| 9.12 | `planning.siteDiaries.retentionPeriodYears` | EXTRACT |
| 9.13 Quality Management | `planning.qm.qmsStandard` | EXTRACT (ISO 9001) |
| 9.13 | `planning.qm.itpRequiredPerActivity` | EXTRACT |

### Section 10 — MATERIALS (p 33)

| Field | Class |
| --- | --- |
| `materials.standards.bsCompliance` | EXTRACT |
| `materials.standards.aciCompliance` | EXTRACT |
| `materials.standards.enCompliance` | EXTRACT |
| `materials.standards.astmCompliance` | EXTRACT |
| `materials.unobtainable.approvalWorkflow` | EXTRACT |
| `materials.unobtainable.substitutionApprovedBy` | EXTRACT |

### Section 11 — MOCK UPS AND SAMPLES (p 34)

| Field | Class |
| --- | --- |
| `mockups.required[]` | EXTRACT (list of elements requiring mock-up) |
| `mockups.location` | EXTRACT (on-site) |
| `mockups.approvalWindowDays` | EXTRACT |
| `mockups.mayBecomePartOfWorks` | EXTRACT |

### Section 12 — PROJECT CLOSE-OUT REQUIREMENTS (p 34)

| Field | Class |
| --- | --- |
| `closeout.handoverChecklist[]` | EXTRACT |
| `closeout.warrantyDocumentationRequired` | EXTRACT |
| `closeout.demobilisationDays` | EXTRACT |
| `closeout.finalCleaningStandard` | EXTRACT |
| `closeout.documentBundleFormat` | EXTRACT |
| `closeout.refer` | DISPLAY | "Appendix J for full close-out requirements" |

---

## 3. Field inventory — Appendices (A through U)

### Appendix A — Public Realm Phasing (pp ~35-50)

| Field | Class |
| --- | --- |
| `appA.phasingPlan.phases[].phaseId` | EXTRACT |
| `appA.phasingPlan.phases[].name` | EXTRACT |
| `appA.phasingPlan.phases[].startMilestone` | EXTRACT |
| `appA.phasingPlan.phases[].finishMilestone` | EXTRACT |
| `appA.phasingPlan.phases[].plotsCovered[]` | EXTRACT |
| `appA.phasingPlan.phases[].accessConstraints[]` | EXTRACT |
| `appA.phasingPlan.handoverSequence[]` | EXTRACT |

### Appendix B — List of Tender Drawings (pp ~50-150)

| Field | Class |
| --- | --- |
| `appB.drawingsRegister.totalCount` | EXTRACT |
| `appB.drawingsRegister.disciplines[]` | EXTRACT |
| `appB.drawingsRegister.drawings[].drawingNumber` | EXTRACT |
| `appB.drawingsRegister.drawings[].title` | EXTRACT |
| `appB.drawingsRegister.drawings[].revision` | EXTRACT |
| `appB.drawingsRegister.drawings[].dateIssued` | EXTRACT |
| `appB.drawingsRegister.drawings[].discipline` | EXTRACT |
| `appB.drawingsRegister.drawings[].scale` | EXTRACT |
| `appB.drawingsRegister.drawings[].sheetSize` | EXTRACT |
| `appB.drawingsRegister.drawings[].status` | EXTRACT (Issued for Tender / Information) |

### Appendix C — Schedules & Specifications (pp ~150-310)

Reference index into the Spec sections (Volume 5). Same structure as
`specification.md` but lighter — just the index entries.

| Field | Class |
| --- | --- |
| `appC.scheduleOfSpecifications[].csiCode` | EXTRACT |
| `appC.scheduleOfSpecifications[].title` | EXTRACT |
| `appC.scheduleOfSpecifications[].discipline` | EXTRACT |
| `appC.scheduleOfSpecifications[].pageRefInVolume5` | EXTRACT |
| `appC.scheduleOfSpecifications[].partOfWorks` | EXTRACT |

### Appendix D — Site Plan (pp ~310-340)

| Field | Class |
| --- | --- |
| `appD.sitePlan.figureRefs[]` | EXTRACT |
| `appD.sitePlan.boundaryCoordinates[]` | EXTRACT (corner coords) |
| `appD.sitePlan.totalAreaSqm` | EXTRACT |
| `appD.sitePlan.coastalFrontageMetres` | EXTRACT |

### Appendix E — Construction Resource Histogram (pp ~340-360)

| Field | Class |
| --- | --- |
| `appE.resourceHistogram.weeklyResources[].weekNo` | EXTRACT |
| `appE.resourceHistogram.weeklyResources[].laborCount` | EXTRACT |
| `appE.resourceHistogram.weeklyResources[].peakLabor` | EXTRACT |
| `appE.resourceHistogram.peakWeek` | EXTRACT |
| `appE.resourceHistogram.totalManhours` | EXTRACT |

### Appendix F — Schedule Requirements (Infrastructure) (referenced from §2.1)

| Field | Class |
| --- | --- |
| `appF.scheduleRequirements.plotAccessRequiredBy[]` | EXTRACT |
| `appF.scheduleRequirements.plotUtilitiesRoadConnectionsRequiredBy[]` | EXTRACT |

### Appendix G — Responsibility Matrix (pp ~360-380, very large table)

The most data-rich appendix. Each row = one responsibility, columns =
who carries it (GC = General Contractor / PS = Package Subcontractor / EM
= Emaar / EM/DC = Emaar Design Consultant / N/A).

Matrix structure:

| Field | Class | Notes |
| --- | --- | --- |
| `appG.responsibilityMatrix.categories[]` | EXTRACT | "1. Safety & Site Environment", "2. Temporary Accommodation for Contractor", "3. Temporary On-Site Accommodation for the Employer/Engineer", "4. Temporary Off-Site Accommodation", "5. Insurance", "6. Permits", "7. Logistics / Cranes / Hoists", "8. Power", "9. Water", "10. Fire Protection", "11. Site Surveying", "12. Materials Testing", "13. Commissioning", "14. Snagging", "15. Handover", "16. Warranties", … |
| `appG.responsibilityMatrix.rows[].categoryRef` | EXTRACT | e.g. "1.7" |
| `appG.responsibilityMatrix.rows[].itemLabel` | EXTRACT | "Safety Register", "First Aid Facilities", … |
| `appG.responsibilityMatrix.rows[].responsibleBy.colA_xxx` | EXTRACT | GC/PS/EM per column (multiple package columns) |
| `appG.responsibilityMatrix.rows[].pricingNote` | EXTRACT | "Priced as Fixed Lump Sum under GC Preliminaries BOQ" |

(Sample row from page extract: `1.7 Safety Register : GC | GC | GC | PS | PS | EM`.)

This appendix has ~200 line items across all categories.

### Appendix H — BIM Requirements (pp ~380-410)

| Field | Class |
| --- | --- |
| `appH.bim.lod.level` | EXTRACT (350 / 400) |
| `appH.bim.modellingPlatform` | EXTRACT (Revit version) |
| `appH.bim.disciplinesRequired[]` | EXTRACT |
| `appH.bim.clashDetectionTools[]` | EXTRACT |
| `appH.bim.clashRoundsRequiredBeforeIFC` | EXTRACT |
| `appH.bim.deliverables[]` | EXTRACT (BEP, clash reports, federated models, etc.) |
| `appH.bim.cobiePropertiesRequired` | EXTRACT |
| `appH.bim.commonDataEnvironment` | EXTRACT (UNIFIER) |

### Appendix I — Unifier Requirements (pp ~410-420)

| Field | Class |
| --- | --- |
| `appI.unifier.workflowsRequired[]` | EXTRACT |
| `appI.unifier.userRolesRequired[]` | EXTRACT |
| `appI.unifier.trainingHoursMin` | EXTRACT |
| `appI.unifier.dataMigrationPolicy` | EXTRACT |

### Appendix J — Project Close-Out Requirements (pp ~420-440)

Expands Section 12 with the full close-out checklist.

| Field | Class |
| --- | --- |
| `appJ.closeOut.deliverables[]` | EXTRACT (~30-50 items: as-built drawings, manuals, warranties, training, spares, demobilisation) |
| `appJ.closeOut.deliverables[].id` | EXTRACT |
| `appJ.closeOut.deliverables[].label` | EXTRACT |
| `appJ.closeOut.deliverables[].format` | EXTRACT |
| `appJ.closeOut.deliverables[].submissionWindowDays` | EXTRACT |
| `appJ.closeOut.deliverables[].acceptanceCriterion` | EXTRACT |

### Appendix K — Construction Signage Requirements (pp ~440-460)

| Field | Class |
| --- | --- |
| `appK.signage.mandatoryBoards[]` | EXTRACT |
| `appK.signage.boards[].location` | EXTRACT |
| `appK.signage.boards[].sizeMm` | EXTRACT |
| `appK.signage.boards[].brandingTemplate` | EXTRACT |
| `appK.signage.boards[].installDays` | EXTRACT |

### Appendix L — Elemental Cost Breakdown (pp ~460-475)

The format the bidder must use for the **Cost Breakdown** schedule.
**This is a checklist + template — populated values come from the priced
BOQ at evaluation.**

| Field | Class |
| --- | --- |
| `appL.elementalCostBreakdown.elements[].code` | EXTRACT |
| `appL.elementalCostBreakdown.elements[].label` | EXTRACT (e.g. "Substructure", "Superstructure", "External Works") |
| `appL.elementalCostBreakdown.elements[].unitOfMeasure` | EXTRACT |
| `appL.elementalCostBreakdown.elements[].format` | EXTRACT (qty / rate / amount) |
| `appL.elementalCostBreakdown.totalRowRequired` | EXTRACT (true) |
| `appL.elementalCostBreakdown.crossCheckAgainstBoqMs` | EXTRACT (true) |

### Appendix M — Tender Technical Deliverables (pp ~475-500)

**The master submission checklist** — what bidders MUST submit. Direct
seed for the compliance matrix.

| Field | Class |
| --- | --- |
| `appM.technicalDeliverables[].id` | EXTRACT (e.g. "T1", "T2") |
| `appM.technicalDeliverables[].name` | EXTRACT |
| `appM.technicalDeliverables[].description` | EXTRACT |
| `appM.technicalDeliverables[].format` | EXTRACT (PDF / Word / Excel / Primavera / Revit) |
| `appM.technicalDeliverables[].submissionMandatory` | EXTRACT |
| `appM.technicalDeliverables[].submissionWindow` | EXTRACT (with tender / 28 days post-commencement / per programme) |
| `appM.technicalDeliverables[].acceptanceCriterion` | EXTRACT |
| `appM.technicalDeliverables[].penaltyForNonCompliance` | EXTRACT |

### Appendix N — Earned Value Requirements (pp ~500-520)

Performance reporting framework.

| Field | Class |
| --- | --- |
| `appN.earnedValue.cpiThresholdMin` | EXTRACT (e.g. 0.95) |
| `appN.earnedValue.spiThresholdMin` | EXTRACT (e.g. 0.95) |
| `appN.earnedValue.reportingFrequency` | EXTRACT (monthly) |
| `appN.earnedValue.workgroupActivityRequired` | EXTRACT |
| `appN.earnedValue.toolchainAccepted[]` | EXTRACT (Primavera + Excel / Deltek Cobra / …) |
| `appN.earnedValue.curveSCurveRequired` | EXTRACT |
| `appN.earnedValue.bbcLoadedScheduleRequired` | EXTRACT |
| `appN.earnedValue.varianceExplanationThresholdPct` | EXTRACT |

### Appendix O — HSE Guidelines (pp ~520-540)

| Field | Class |
| --- | --- |
| `appO.hse.policiesRequired[]` | EXTRACT |
| `appO.hse.permitTypes[]` | EXTRACT (hot work / confined space / dig / high-work / electrical isolation) |
| `appO.hse.inductionMandatory` | EXTRACT (true) |
| `appO.hse.toolboxTalksFrequency` | EXTRACT (daily / weekly) |
| `appO.hse.incidentReportingChannel` | EXTRACT |
| `appO.hse.zeroToleranceItems[]` | EXTRACT (drugs / alcohol / fall protection / hot work without permit) |
| `appO.hse.ppeMinimums[]` | EXTRACT |
| `appO.hse.medicalServicesRequired` | EXTRACT |
| `appO.hse.environmentalControls[]` | EXTRACT |
| `appO.hse.wasteSegregationRequired` | EXTRACT |
| `appO.hse.workerWelfareCompliance` | EXTRACT (UAE Ministry of Labour) |

### Appendix R — Sustainability Requirements (pp ~540-555)

| Field | Class |
| --- | --- |
| `appR.sustainability.targetCertification` | EXTRACT (LEED / Estidama / WELL) |
| `appR.sustainability.targetCertificationLevel` | EXTRACT |
| `appR.sustainability.complianceLogsRequired[]` | EXTRACT (waste / material delivery / energy / water) |
| `appR.sustainability.esgMetrics[]` | EXTRACT |
| `appR.sustainability.materialSourcing[]` | EXTRACT (local content % / recycled %) |
| `appR.sustainability.energyMonitoringRequired` | EXTRACT |
| `appR.sustainability.waterMonitoringRequired` | EXTRACT |
| `appR.sustainability.wasteTargetDivertedFromLandfillPct` | EXTRACT |
| `appR.sustainability.reportingFrequency` | EXTRACT |

### Appendix S — Master Community Policy & Fee Schedule (pp ~555-575)

| Field | Class |
| --- | --- |
| `appS.masterCommunity.policy.barriersPolicy` | EXTRACT (no concrete jersey in certain locations) |
| `appS.masterCommunity.policy.protectedSurfaces[]` | EXTRACT (Corbel stone Pavements, Granite/Marble) |
| `appS.masterCommunity.policy.workingHoursInCommunity` | EXTRACT |
| `appS.masterCommunity.policy.clubCarRules` | EXTRACT |
| `appS.masterCommunity.policy.complaintsHandlingDays` | EXTRACT |
| `appS.masterCommunity.fees.feeItems[].name` | EXTRACT |
| `appS.masterCommunity.fees.feeItems[].amount` | EXTRACT |
| `appS.masterCommunity.fees.feeItems[].frequency` | EXTRACT (one-time / monthly / per incident) |
| `appS.masterCommunity.fees.feeItems[].payee` | EXTRACT |

### Appendix T — Emaar Security Group Requirements (pp ~575-585)

| Field | Class |
| --- | --- |
| `appT.security.accessControlSystem` | EXTRACT |
| `appT.security.gateProceduresRequired[]` | EXTRACT |
| `appT.security.cctvCoverageMin` | EXTRACT |
| `appT.security.guardForceMinHours` | EXTRACT |
| `appT.security.incidentReportingChannel` | EXTRACT |
| `appT.security.communityViolationsPolicy[]` | EXTRACT |

### Appendix U — Creek Beach Linear Park Drawings (pp ~585-553 end)

| Field | Class |
| --- | --- |
| `appU.creekBeachLinearPark.drawingsList[]` | EXTRACT (sub-set of Appendix B for this Additional Works scope) |

---

## 4. Zod schema (overview)

```ts
export const soprSchema = z.object({
  identity: z.object({
    employerLegalName: z.string(),
    development: z.string(),
    district: z.string(),
    volumeReference: z.string(),
    revision: z.string(),                       // "Rev. 00"
    issuedAt: z.string().date(),
  }),

  scope: scopeSchema,                            // Section 1
  keyDates: keyDatesSchema,                      // Section 2
  sectionsOfTheWorks: z.array(sectionOfWorksSchema),
  siteConditions: siteConditionsSchema,           // Section 3.1
  tempServicesAndFacilities: tempServicesSchema, // Section 3.2
  transport: transportSchema,                    // Section 5
  site: siteRequirementsSchema,                  // Section 6
  drawings: drawingsAndDocsSchema,               // Section 7
  coordination: coordinationSchema,              // Section 8
  planning: planningSchema,                      // Section 9
  materials: materialsSchema,                    // Section 10
  mockups: mockupsSchema,                        // Section 11
  closeout: closeoutSchema,                      // Section 12

  appendices: z.object({
    A_phasingPlan: phasingPlanSchema,
    B_tenderDrawings: tenderDrawingsRegisterSchema,
    C_schedulesAndSpecifications: schedulesAndSpecsSchema,
    D_sitePlan: sitePlanSchema,
    E_resourceHistogram: resourceHistogramSchema,
    F_scheduleRequirements: scheduleRequirementsSchema.optional(),
    G_responsibilityMatrix: responsibilityMatrixSchema,
    H_bim: bimRequirementsSchema,
    I_unifier: unifierRequirementsSchema,
    J_closeOut: closeOutSchema,
    K_signage: signageSchema,
    L_elementalCostBreakdown: elementalCostBreakdownSchema,
    M_technicalDeliverables: technicalDeliverablesSchema,
    N_earnedValue: earnedValueSchema,
    O_hse: hseSchema,
    R_sustainability: sustainabilityRequirementsSchema,
    S_masterCommunity: masterCommunityPolicyFeesSchema,
    T_security: securityRequirementsSchema,
    U_creekBeachLinearPark: creekBeachLinearParkSchema.optional(),
  }),
})

export type Sopr = z.infer<typeof soprSchema>
```

Each sub-schema is in its own file under
`modules/ai-extraction/schemas/sopr/*.ts` to keep this manageable.

---

## 5. Manual UI layout — the accordion-of-accordions

Because SOPR has 12 main sections + 18 appendices, the SOPR card itself
expands into a **nested DisclosureGroup**:

```text
[Accordion: Schedule of Project Requirements (SOPR)]
└── [Tabs: Manual | Upload]
    └── Manual tab
        └── Nested accordion group ("Section navigator"):
            ├── 1. Scope (5 sub-sections)
            ├── 2. Key Dates  ← high priority, simple form
            │   ├── Commencement submissions table (7 rows, days)
            │   ├── Sections of the Works table (milestone, name, days)
            │   └── Possession + Other contractors flags
            ├── 3. Site Conditions & Temporary Services
            │   ├── Site Conditions (8 numeric/textual fields)
            │   └── Temporary Services (13 sub-services)
            ├── 4. Not Used  ← marker, no fields
            ├── 5. Transport & Handling (4 sub-clauses)
            ├── 6. Site Requirements (18 sub-clauses)
            ├── 7. Drawings & Documentation (8 sub-clauses, OMM is huge)
            ├── 8. Coordination (1)
            ├── 9. Planning, Monitoring & Admin (13)
            ├── 10. Materials (2)
            ├── 11. Mock-ups & Samples (1)
            ├── 12. Project Close-Out (high-level — full list in Appendix J)
            └── Appendices (18 nested cards):
                ├── A — Phasing Plan
                ├── B — List of Tender Drawings  (repeating rows, ~hundreds)
                ├── C — Schedules & Specifications  (repeating rows, ~50)
                ├── D — Site Plan
                ├── E — Resource Histogram
                ├── F — Schedule Requirements (Infra)
                ├── G — Responsibility Matrix  (big grid editor)
                ├── H — BIM Requirements
                ├── I — Unifier Requirements
                ├── J — Project Close-Out
                ├── K — Signage Requirements
                ├── L — Elemental Cost Breakdown  (template grid)
                ├── M — Tender Technical Deliverables  ← critical compliance seed
                ├── N — Earned Value Requirements
                ├── O — HSE Guidelines
                ├── R — Sustainability Requirements
                ├── S — Master Community Policy & Fees
                ├── T — Security Requirements
                └── U — Creek Beach Linear Park
```

Each leaf renders its own `<DynamicForm>` instance. The top-level
accordion's status badge aggregates: "X / Y sections complete".

A **completion meter** at the top of the SOPR card shows progress
(e.g. `45 / 168 fields filled`).

---

## 6. Persistor mapping

| Form field | DB row |
| --- | --- |
| `keyDates.commencementSubmissions[i]` | `compliance_record_template`: section_code='B' (Time for Completion / Key Dates), criterion_code=label, expected_value={days} |
| `sectionsOfTheWorks[i]` | `compliance_record_template`: section_code='B', criterion_code=`section_${i}`, expected_value={days} (cross-check vs FOT) |
| `siteConditions.*` | `project.site_conditions` jsonb (single row of climate / seismic / corrosion data) |
| `site.workingHoursStart/End` | `project.working_hours` jsonb |
| `planning.programme.softwareRequired` | `compliance_record_template` row (Schedule A1) |
| `planning.progressReports.frequency` | `project.reporting_frequency` |
| `planning.qm.qmsStandard` | `compliance_record_template` row (Schedule A5) |
| `materials.standards.*` | `project.material_standards_required` jsonb |
| `appA.phasingPlan` | `project_phase[]` table (new) |
| `appB.drawingsRegister.drawings[]` | logical `document` rows with `target_kind='drawing'`, metadata jsonb |
| `appG.responsibilityMatrix` | `responsibility_matrix_row[]` table (new) |
| `appH.bim.*` | `project.bim_requirements` jsonb + per-deliverable `compliance_record_template` rows |
| `appJ.closeOut.deliverables[]` | `compliance_record_template` rows (Schedule J series) |
| `appL.elementalCostBreakdown.elements[]` | `boq_section_template[]` for the Elemental Cost Breakdown report (new mini-table) |
| `appM.technicalDeliverables[]` | **the primary compliance criteria seed** — one `compliance_record_template` per deliverable |
| `appN.earnedValue.*` | `project.earned_value_config` jsonb |
| `appO.hse.*` | `project.hse_requirements` jsonb |
| `appR.sustainability.*` | `project.sustainability_config` jsonb |
| `appS.masterCommunity.*` | `project.master_community_policy` jsonb |
| `appT.security.*` | `project.security_requirements` jsonb |

**New DB tables required for SOPR persistence:**

```sql
CREATE TABLE project_phase (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  phase_id text NOT NULL,
  name text NOT NULL,
  start_milestone text,
  finish_milestone text,
  plots_covered jsonb,
  access_constraints jsonb,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE responsibility_matrix_row (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  category text NOT NULL,                       -- "1. Safety & Site Environment"
  ref text NOT NULL,                            -- "1.7"
  item_label text NOT NULL,                     -- "Safety Register"
  responsible_by jsonb NOT NULL,                -- per-column { gc, ps1, ps2, em, em_dc }
  pricing_note text,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE compliance_record_template (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  section_code text NOT NULL,                   -- 'A'..'J' or 'M'/'J'/'A1'…
  criterion_code text NOT NULL,                 -- machine-readable id
  criterion_label text NOT NULL,                -- human-readable
  expected_value jsonb,
  source_ref text,                              -- "SOPR §9.1" / "ITT Clause 8.1.A1"
  submission_mandatory boolean NOT NULL DEFAULT true,
  submission_window text,
  format_required text,
  acceptance_criterion text,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE project_close_out_item (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  appendix_ref text,                            -- "J"
  item_id text NOT NULL,
  label text NOT NULL,
  format text,
  submission_window_days int,
  acceptance_criterion text,
  position int NOT NULL DEFAULT 0
);
```

When a bidder submission lands, the analysis pipeline creates one
`compliance_record` row per `compliance_record_template` row, evaluated.

---

## 7. Cross-doc validation rules

| Rule | Trigger | Type |
| --- | --- | --- |
| `sectionsOfTheWorks[i].timeForCompletionDays` must equal `fot.timesForCompletion[i].days` | save SOPR or FOT | hard |
| `sectionsOfTheWorks[i].timeForCompletionDays` must equal `coc.particular.timesForCompletionDays[i]` | save SOPR or COC | hard |
| `appB.drawingsRegister.drawings[]` cross-check vs `drawings-register.md` upload | save | soft (warn) |
| `appM.technicalDeliverables[]` must be a superset of `itt.submissionSchedules[]` | save SOPR or ITT | hard (the SOPR formalises what ITT mentions) |
| `appH.bim.commonDataEnvironment` ↔ `itt.formOfAgreement.documentSharingPortal` | save | soft |
| `materials.standards.*` ↔ `specification.sections[].references.*` (BS/ACI/EN/ASTM consistency) | save | soft |
| `appR.sustainability.targetCertification` set → project must have sustainability submission flag enabled | save | soft |
| `appG.responsibilityMatrix` rows referencing "GC Preliminaries BOQ" → those items must appear in Bill 1 General Requirements | save | soft |
| `closeout.documentBundleFormat` ↔ `appJ.closeOut.deliverables[].format` | save | hard |
| `appA.phasingPlan.phases[].finishMilestone` ↔ `sectionsOfTheWorks[i]` ↔ `fot.timesForCompletion[]` | save | soft (chained) |

---

## 8. Agent extraction notes

For the AI agent reading the uploaded SOPR:

- **The surface is inlined in the user message.** Read it directly — no
  shell, no file fetches. The pre-extractor produces a section-by-section
  markdown view of the SOPR.
- **Per-section convergence rules:**
  - Section 2 Key Dates is short and structured → high-confidence extraction expected.
  - Section 6 Site Requirements has many sub-clauses → expect partial extraction; mark INSUFFICIENT_EVIDENCE for fields where the sample text is too vague.
  - Section 9 Planning Sub-clauses are the **compliance seeders** — extract every detail; if a field is missing, fall back to a sensible default from the ITT's Clause 8.1 schedule list.
- **Appendix detection:**
  - Each Appendix has a distinct title page ("APPENDIX X — Title").
  - Appendix G (Responsibility Matrix) is a **wide grid table** — use the XLSX-style table extractor branch; never try the prose extractor on it.
  - Appendix B (Drawings list) is a **table** — same.
  - Appendices H, N, O, R, S, T are **prose-heavy** — main extractor branch.
- **Coverage warnings the pre-extractor must surface:**
  - "Appendix F not found in this PDF" (sometimes Infrastructure schedules ship separately).
  - "Appendix P / Q skipped" (intentional — confirm via SOPR TOC).
  - "Appendix M Technical Deliverables count mismatch vs ITT Clause 8.1" — agent must reconcile.

---

## 9. Sample evidence (Bridges District SOPR)

- **TOC** — pp 4-6 (sections 1-12 listed + appendix index)
- **Sections 1-12** — pp 1-34
- **Appendix A — Phasing Plan** — starts ~p 35
- **Appendix B — List of Tender Drawings** — starts ~p 50
- **Appendix C — Schedules and Specifications** — starts ~p 150
- **Appendix D — Site Plan** — starts ~p 310
- **Appendix G — Responsibility Matrix** — starts ~p 360 (very wide table, ~200 rows)
- **Appendix H — BIM** — starts ~p 380
- **Appendix N — Earned Value** — starts ~p 500
- **Appendix R — Sustainability** — starts ~p 540

**Project-specific values observed in the sample (for the seed compliance criteria):**

- All 7 commencement-window submittals due **28 days** after Commencement
- Single section: "Buildings, Public Realm & Landscape Design Works in Bridges District", **480 days**
- Ambient temperatures: max 50°C, min 7°C
- Wind gust 3-sec 50-yr: 44 m/s
- Site has corrosion-class exposure (saline dew + sea breeze)
- BIM platform: Revit (LOD per Appendix H)
- Common Data Environment: **UNIFIER**
- Programme software: **Primavera P6 or MS Project**
- Test certificates: 3 copies, within 7 days of test completion
- O&M Manuals: A4 size, four-hole binding, black durable rigid cover with gold lettering
- Material standards: BS / ACI / EN / ASTM

These exact values become the **expected_value** column of the seeded
`compliance_record_template` rows for the project.
