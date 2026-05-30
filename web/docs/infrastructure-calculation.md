# Infrastructure Cost Calculation

## Original Requirement (from Project Documentation)

> **Calculation of Infrastructure Cost**
>
> This will be fully totally automated based on the Gross Land Area (GLA) entered during the masterplan initiation multiplied by the automatically selected rate of either low, mid, or high density.
>
> There is in-built capability within the platform to enable users (with the appropriate access rights) to reconfigure the FAR density ranges and update the infrastructure cost models accordingly.
>
> The total FAR that will identify the density is calculated based on the total FAR for each building asset.

---

## How Infrastructure Cost Works

Infrastructure cost is **fully automated** - the platform calculates it automatically based on:

1. The **Gross Land Area (GLA)** entered when creating the masterplan
2. The **density category** determined by the total FAR from all building assets
3. The **infrastructure rate** configured for each density level

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTOMATIC CALCULATION                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Infrastructure Cost = Gross Land Area × Density Rate                   │
│                                                                         │
│  The density rate is automatically selected based on the FAR            │
│  calculated from all building assets in the masterplan.                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Density Categories

The platform automatically determines which density category applies based on the total FAR:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    FAR DENSITY RANGES                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FAR < 0.465                                                            │
│  ├── LOW DENSITY                                                        │
│  │   Suburban-style development, lower infrastructure needs             │
│  │                                                                      │
│  FAR 0.465 to 1.5                                                       │
│  ├── MEDIUM DENSITY                                                     │
│  │   Mixed residential/commercial, moderate infrastructure              │
│  │                                                                      │
│  FAR > 1.5                                                              │
│  └── HIGH DENSITY                                                       │
│      Urban high-rise development, highest infrastructure needs          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

| Density Category | FAR Range | Description |
|------------------|-----------|-------------|
| Low | FAR < 0.465 | Lower infrastructure requirements |
| Medium | 0.465 ≤ FAR < 1.5 | Moderate infrastructure requirements |
| High | FAR ≥ 1.5 | Higher infrastructure requirements |

---

## Calculation Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    FROM MASTERPLAN                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Gross Land Area (GLA) = Entered during masterplan creation             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FROM BUILDING ASSETS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Total GFA = Sum of all building assets GFA                             │
│  Total Plot Area = Sum of all building assets plot areas                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 1: CALCULATE FAR                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Total FAR = Total GFA ÷ Total Plot Area                                │
│                                                                         │
│  This FAR is calculated from ALL building assets combined               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 2: DETERMINE DENSITY                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FAR < 0.465      →  LOW DENSITY                                        │
│  0.465 ≤ FAR < 1.5  →  MEDIUM DENSITY                                   │
│  FAR ≥ 1.5        →  HIGH DENSITY                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 3: GET RATE                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Infrastructure Rate (SAR per m²) = Retrieved from Cost Model           │
│                                     based on density category           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 4: CALCULATE COST                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Net Infrastructure Cost = Gross Land Area × Rate per m²                │
│                                                                         │
│  General Requirements Amount = Net Cost × (Gen Req % ÷ 100)             │
│                                                                         │
│  Total Infrastructure Cost = Net Cost × (1 + Gen Req % ÷ 100)           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 5: CALCULATE SPLIT                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Infrastructure is split into Primary and Secondary:                    │
│                                                                         │
│  Primary Infrastructure (30%)   = Roads, main utilities, trunk lines    │
│  Secondary Infrastructure (70%) = Distribution networks, connections    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           OUTPUT                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  • Calculated FAR                                                       │
│  • Density Category (Low/Medium/High)                                   │
│  • Rate per m² GLA                                                      │
│  • Net Infrastructure Cost (SAR)                                        │
│  • Primary Cost (30%)                                                   │
│  • Secondary Cost (70%)                                                 │
│  • General Requirements Amount (SAR)                                    │
│  • Total Infrastructure Cost (SAR)                                      │
│  • Balance External Area (GLA - Total Plot Area)                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Example Calculation

**Masterplan Input:**

- Gross Land Area: 500,000 m²
- General Requirements: 10%

**Building Assets Totals:**

- Total GFA from all buildings: 750,000 m²
- Total Plot Area from all buildings: 400,000 m²

**Step 1 - Calculate FAR:**

- FAR = 750,000 ÷ 400,000 = **1.875**

**Step 2 - Determine Density:**

- FAR 1.875 ≥ 1.5 → **HIGH DENSITY**

**Step 3 - Get Rate:**

- High Density Rate (from Cost Model): **350 SAR per m²**

**Step 4 - Calculate Cost:**

- Net Infrastructure Cost = 500,000 × 350 = **175,000,000 SAR**
- General Requirements = 175,000,000 × 0.10 = **17,500,000 SAR**
- Total Infrastructure Cost = 175,000,000 + 17,500,000 = **192,500,000 SAR**

**Step 5 - Calculate Split:**

- Primary Infrastructure (30%) = 175,000,000 × 0.30 = **52,500,000 SAR**
- Secondary Infrastructure (70%) = 175,000,000 × 0.70 = **122,500,000 SAR**

**Balance External Area:**

- Balance = 500,000 - 400,000 = **100,000 m²** (available for roads, utilities, etc.)

---

## What Infrastructure Includes

Standard infrastructure costs cover:

| Category | Items Included |
|----------|---------------|
| Roads | Main roads, internal roads, paving |
| Drainage | Storm water, sewerage networks |
| Water Supply | Water distribution networks, connections |
| Electrical | Power distribution, street lighting |
| Telecommunications | Network infrastructure |
| Landscaping | Basic landscaping allowances |

---

## Configuration Options

Users with appropriate access can configure:

1. **FAR Density Thresholds** - Adjust the FAR ranges that define Low/Medium/High density
2. **Infrastructure Rates** - Update the SAR per m² rate for each density level
3. **Infrastructure Split** - Modify the 30/70 split between primary and secondary infrastructure

---

## Balance External Area

The platform automatically calculates the Balance External Area:

**Balance External Area = Gross Land Area - Total Building Plot Areas**

This represents the land available for:

- Roads and circulation
- Utilities and infrastructure
- Public spaces not allocated to public realm
- Buffer zones

If this value becomes negative, it indicates that building plot areas exceed the available land.
