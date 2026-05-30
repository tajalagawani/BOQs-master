# Building Assets Cost Calculation

## Original Requirement (from Project Documentation)

> **Calculation of Building Assets**
>
> The following entries are required to calculate the total building assets construction costs:
>
> **Dropdown selection:**
> Asset Class - Asset Type L1 - Asset Type L2 - Price Point - Phase - Base Date - Percentage of contractors' general requirements
>
> **Free entry:**
> Plot Area per building - GFA per building - Number of buildings - Levels of each building
>
> **Automated Calculations:**
> - The total plot area is the plot area per building multiplied by the number of buildings. Similarly for total GFA
> - The FAR is calculated based on Total GFA Area / Total Plot Area
> - The building footprint for each asset entered into the parametric model is calculated by dividing the total GFA by the number of levels of the asset (excluding any applicable podiums and/or basements). It is assumed that all storeys have a consistent and uniform GFA for the purposes of high-level estimation.
> - External Area will be calculated automatically as the total plot area minus building Footprint
> - Lastly the cost section will be calculated based on the selected asset typology and price point plus contractor's general requirements and any other configured parametric adjustments e.g. glazing ratio (calculated separately)
>
> **Note:** For multifamily assets, as discussed with development team, insert the total plot area of all buildings and total GFA, then insert 1 in the number of buildings.

---

## Asset Hierarchy

Building assets follow the ROSHN asset classification structure:

```
Asset Class (Level 1)
├── Residential
├── Commercial
└── Retail

    └── Asset Type L1 (Level 2)
        ├── Multi Family
        ├── Single Family
        ├── Office
        ├── Hotel
        └── ...

            └── Asset Type L2 / Form (Level 3)
                ├── Low Rise
                ├── Mid Rise
                ├── High Rise
                └── ...

                    └── Price Point (Level 4)
                        ├── Economy
                        ├── Standard
                        └── Premium
```

---

## Calculation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INPUTS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Dropdown Selections:                    Free Entry:                    │
│  • Asset Class                           • Plot Area per Building (m²)  │
│  • Asset Type L1                         • GFA per Building (m²)        │
│  • Asset Type L2                         • Number of Buildings          │
│  • Price Point                           • Levels per Building          │
│  • Phase                                                                │
│  • Base Date                                                            │
│  • General Requirements %                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 1: AREA CALCULATIONS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Total Plot Area = Plot Area per Building × Number of Buildings         │
│                                                                         │
│  Total GFA = GFA per Building × Number of Buildings                     │
│                                                                         │
│  FAR = Total GFA ÷ Total Plot Area                                      │
│                                                                         │
│  Building Footprint = Total GFA ÷ Number of Levels                      │
│                                                                         │
│  External Area = Total Plot Area − Building Footprint                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 2: GET RATE FROM COST MODEL                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SAR per m² GFA = Retrieved from Cost Model based on:                   │
│                   Asset Class + Asset Type L1 + Asset Type L2 +         │
│                   Price Point selection                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 3: COST CALCULATIONS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Net Build Cost = Total GFA × SAR per m² GFA                            │
│                                                                         │
│  General Requirements Amount = Net Build Cost × (Gen Req % ÷ 100)       │
│                                                                         │
│  Total Cost = Net Build Cost + General Requirements Amount              │
│             = Net Build Cost × (1 + Gen Req % ÷ 100)                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 4: PARAMETRIC ADJUSTMENTS                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Glazing Adjustment = Total Cost × (Glazing Adjustment % ÷ 100)         │
│                                                                         │
│  Final Cost = Total Cost + Glazing Adjustment                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 5: BASE DATE ADJUSTMENT                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  If Base Date is future:                                                │
│  Final Cost = Final Cost × Cost Factor (from Base Date configuration)   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           OUTPUT                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  • Total Plot Area (m²)                                                 │
│  • Total GFA (m²)                                                       │
│  • FAR (Floor Area Ratio)                                               │
│  • Building Footprint (m²)                                              │
│  • External Area (m²)                                                   │
│  • Net Build Cost (SAR)                                                 │
│  • General Requirements Amount (SAR)                                    │
│  • Total Cost (SAR)                                                     │
│  • Final Cost (SAR)                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Example Calculation

**Input:**
- Asset: Residential > Multi Family > Mid Rise > Premium
- Plot Area per Building: 5,000 m²
- GFA per Building: 15,000 m²
- Number of Buildings: 4
- Levels: 6
- General Requirements: 10%
- SAR per m² GFA (from Cost Model): 3,500 SAR

**Step 1 - Area Calculations:**
- Total Plot Area = 5,000 × 4 = **20,000 m²**
- Total GFA = 15,000 × 4 = **60,000 m²**
- FAR = 60,000 ÷ 20,000 = **3.0**
- Building Footprint = 60,000 ÷ 6 = **10,000 m²**
- External Area = 20,000 − 10,000 = **10,000 m²**

**Step 2 - Cost Calculations:**
- Net Build Cost = 60,000 × 3,500 = **210,000,000 SAR**
- General Requirements = 210,000,000 × 0.10 = **21,000,000 SAR**
- Total Cost = 210,000,000 + 21,000,000 = **231,000,000 SAR**

---

## Cost Structure (NRM Level 1)

The building costs are structured according to RICS NRM Level 1:

| NRM Category | Description |
|--------------|-------------|
| 0. Facilitating Works | Site preparation, demolition |
| 1. Substructure | Foundations, basement |
| 2. Superstructure | Frame, floors, roof, stairs, external walls |
| 3. Internal Finishes | Wall, floor, ceiling finishes |
| 4. FF&E | Fittings, furnishings, equipment |
| 5. Services | MEP systems |
| 6. External Works | Site works, landscaping |
| 7. Preliminaries | Site management, temporary works |

---

## Special Rules

### Multifamily Assets
For multifamily developments with multiple buildings sharing common areas:
- Enter the **total plot area** of all buildings combined
- Enter the **total GFA** of all buildings combined
- Set **Number of Buildings = 1**

This ensures accurate FAR and external area calculations for the entire development.

### FAR Decimal Precision
FAR is calculated to **3 decimal places** for precision in density calculations.

### General Requirements
Default General Requirements is **10%** of net build cost, reflecting contractor overhead and site management costs.
