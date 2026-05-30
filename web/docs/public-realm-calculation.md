# Public Realm Cost Calculation

## Original Requirement (from Project Documentation)

> **Calculation of Public Realm Cost**
>
> This will be calculated based on the selected lines of Public Realm typologies as follows: District Park, Neighborhood Park, Local Park, Pocket Park, and Buffer Landscapes and Trails
>
> 1. Area of each type will be multiplied by the rates inserted in the configuration based on each price Point
> 2. Remaining/Balance of external area (GLA - total building assets plot areas - public realm areas) will be calculated automatically and it will give error if negative.

---

## Public Realm Typologies

The platform supports five types of public realm spaces:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    PUBLIC REALM TYPOLOGIES                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  DISTRICT PARK                                                 │     │
│  │  Large community parks serving multiple neighborhoods          │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  NEIGHBORHOOD PARK                                             │     │
│  │  Medium-sized parks serving a single neighborhood              │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  LOCAL PARK                                                    │     │
│  │  Smaller parks serving immediate local area                    │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  POCKET PARK                                                   │     │
│  │  Small urban parks in compact spaces                           │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  BUFFER LANDSCAPES AND TRAILS                                  │     │
│  │  Linear parks, walking trails, green buffers                   │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Calculation Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INPUTS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Dropdown Selections:                    Free Entry:                    │
│  • Asset Class: "Public Realm"           • Park Area (m²)               │
│  • Asset Type L1: "Public Realm"         • Number of Parks              │
│  • Asset Typology L2 (5 options)         • General Requirements %       │
│  • Price Point (Basic/Premium)                                          │
│  • Phase                                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 1: AREA CALCULATION                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Total Park Area = Park Area × Number of Parks                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 2: GET RATE FROM COST MODEL                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SAR per m² = Retrieved from Cost Model based on:                       │
│               • Public Realm Typology (District Park, etc.)             │
│               • Price Point (Basic or Premium)                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 3: COST CALCULATIONS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Net Build Cost = Total Park Area × SAR per m²                          │
│                                                                         │
│  General Requirements Amount = Net Build Cost × (Gen Req % ÷ 100)       │
│                                                                         │
│  Total Cost = Net Build Cost × (1 + Gen Req % ÷ 100)                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 4: VALIDATE BALANCE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Balance External Area = GLA - Building Plot Areas - Public Realm Areas │
│                                                                         │
│  ├── If Balance ≥ 0: Valid allocation                                   │
│  │                                                                      │
│  └── If Balance < 0: ERROR - Areas exceed available land                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           OUTPUT                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  • Total Park Area (m²)                                                 │
│  • Net Build Cost (SAR)                                                 │
│  • General Requirements Amount (SAR)                                    │
│  • Total Cost (SAR)                                                     │
│  • Balance External Area (m²) with validation                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Example Calculation

**Input:**

- Typology: Neighborhood Park
- Price Point: Premium
- Park Area: 5,000 m²
- Number of Parks: 3
- General Requirements: 10%
- SAR per m² (from Cost Model): 150 SAR

**Step 1 - Area Calculation:**

- Total Park Area = 5,000 × 3 = **15,000 m²**

**Step 2 - Cost Calculation:**

- Net Build Cost = 15,000 × 150 = **2,250,000 SAR**
- General Requirements = 2,250,000 × 0.10 = **225,000 SAR**
- Total Cost = 2,250,000 + 225,000 = **2,475,000 SAR**

---

## Balance External Area Validation

The platform continuously validates that all allocated areas fit within the Gross Land Area:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    BALANCE CALCULATION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Gross Land Area (from Masterplan)                                      │
│          │                                                              │
│          ├── Minus: Total Building Plot Areas                           │
│          │                                                              │
│          ├── Minus: Total Public Realm Areas                            │
│          │                                                              │
│          └── = Balance External Area                                    │
│                                                                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Example:                                                       │    │
│  │  GLA: 500,000 m²                                                │    │
│  │  Building Plot Areas: 350,000 m²                                │    │
│  │  Public Realm Areas: 80,000 m²                                  │    │
│  │  Balance: 500,000 - 350,000 - 80,000 = 70,000 m²               │    │
│  │                                                                 │    │
│  │  This 70,000 m² is available for roads, utilities, etc.        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Error Condition

If the Balance External Area becomes negative, the platform shows an error:

**"Total allocated areas exceed Gross Land Area by X m². Please reduce Building Assets plot areas or Public Realm areas."**

### Warning Condition

If the Balance External Area is less than 5% of the GLA, the platform shows a warning:

**"Balance External Area is only X% of Gross Land Area. Consider if this is sufficient for roads, utilities, and other infrastructure."**

---

## Price Points

Public realm costs vary by price point:

| Price Point | Description | Typical Use |
|-------------|-------------|-------------|
| Basic | Standard landscaping and amenities | Economy developments |
| Premium | High-quality materials and features | Premium developments |

The rate per m² is different for each price point and is configured in the Cost Model.

---

## Aggregated Totals

When multiple public realm entries are added, the platform calculates:

- **Total Public Realm Area**: Sum of all park areas
- **Total Public Realm Cost**: Sum of all park costs
- **Breakdown by Typology**: Area and cost for each park type
