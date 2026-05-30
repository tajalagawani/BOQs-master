# Car Parking Cost Calculation

## Original Requirement (from Project Documentation)

> **Calculation of Car Parking**
>
> The following entries are required to calculate the total building assets construction costs:
>
> **Dropdown selection:**
> - Asset Group is the selection of the asset typology that this car parking entry will be related to
> - Asset Typology is the car parking type i.e. Above_Ground, Basement, Podium or Free Standing
> - Similar to building assets, base date, phase etc.
>
> **Free entry:**
> Plot Area (in case of Free Standing parking it will make effect) - GFA/total parking area - Levels of each building, and levels (can't exceed 2 levels for basement due to the rate used).
>
> **Automated Calculations:**
> - In case of Free-Standing Parking, the total plot area is the plot area per building multiplied by the number of buildings. Similarly for total GFA. However, this is locked for basement and podium parking
> - The FAR is locked/not needed
> - The cost section will be calculated based on the selected car parking typology multiplied by parking area

---

## Parking Types

The platform supports four types of car parking:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        CAR PARKING TYPES                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐                               │
│  │    BASEMENT     │  │     PODIUM      │                               │
│  │   Underground   │  │  Ground level   │                               │
│  │   parking below │  │  parking with   │                               │
│  │   buildings     │  │  building above │                               │
│  │  MAX 2 LEVELS   │  │                 │                               │
│  └─────────────────┘  └─────────────────┘                               │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐                               │
│  │  ABOVE GROUND   │  │  FREE STANDING  │                               │
│  │   Multi-level   │  │    Separate     │                               │
│  │   parking on    │  │   multi-storey  │                               │
│  │   grade         │  │   structure on  │                               │
│  │                 │  │   own plot      │                               │
│  └─────────────────┘  └─────────────────┘                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration by Type

| Parking Type | Plot Area | FAR | Max Levels | Description |
|--------------|-----------|-----|------------|-------------|
| Basement | Not applicable | Not calculated | **2** | Underground parking below buildings |
| Podium | Not applicable | Not calculated | No limit | Parking integrated into building podium |
| Above Ground | Applicable | Calculated | No limit | Surface-level multi-level structure |
| Free Standing | Applicable | Calculated | No limit | Separate parking structure on own plot |

---

## Calculation Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INPUTS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Dropdown Selections:                    Free Entry:                    │
│  • Asset Group (linked building)         • Plot Area (Free Standing)    │
│  • Parking Type                          • Total Parking Area (m²)      │
│  • Phase                                 • Number of Buildings          │
│  • Base Date                             • Number of Levels             │
│  • General Requirements %                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 1: CHECK PARKING TYPE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Is it Basement or Podium?                                              │
│  ├── YES: Plot Area = LOCKED (not applicable)                           │
│  │        Total Parking Area = Input parking area (no multiplication)   │
│  │                                                                      │
│  └── NO (Free Standing / Above Ground):                                 │
│           Total Plot Area = Plot Area × Number of Buildings             │
│           Total Parking Area = Parking Area × Number of Buildings       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 2: VALIDATE LEVELS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Is it Basement parking?                                                │
│  ├── YES: Check if Levels ≤ 2                                           │
│  │        If Levels > 2 → ERROR: Basement cannot exceed 2 levels        │
│  │                                                                      │
│  └── NO: No level restriction                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 3: GET RATE FROM COST MODEL                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SAR per m² = Retrieved from Cost Model based on Parking Type           │
│                                                                         │
│  Different rates for: Basement | Podium | Above Ground | Free Standing  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 4: COST CALCULATIONS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Net Build Cost = Total Parking Area × SAR per m²                       │
│                                                                         │
│  General Requirements Amount = Net Build Cost × (Gen Req % ÷ 100)       │
│                                                                         │
│  Total Cost = Net Build Cost × (1 + Gen Req % ÷ 100)                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 5: ADJUSTMENTS (Optional)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  For Above Ground structures:                                           │
│  Facade Adjustment = Total Cost × (Facade Adjustment % ÷ 100)           │
│                                                                         │
│  Final Cost = Total Cost + Facade Adjustment                            │
│                                                                         │
│  Apply Base Date Cost Factor if applicable                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           OUTPUT                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  • Total Plot Area (m²) - if applicable                                 │
│  • Total Parking Area (m²)                                              │
│  • Net Build Cost (SAR)                                                 │
│  • General Requirements Amount (SAR)                                    │
│  • Total Cost (SAR)                                                     │
│  • Final Cost (SAR)                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Example Calculations

### Example 1: Basement Parking

**Input:**

- Parking Type: Basement
- Total Parking Area: 5,000 m²
- Levels: 2
- General Requirements: 10%
- SAR per m² (from Cost Model): 2,500 SAR

**Calculation:**

- Total Parking Area = 5,000 m² (no multiplication for basement)
- Net Build Cost = 5,000 × 2,500 = **12,500,000 SAR**
- General Requirements = 12,500,000 × 0.10 = **1,250,000 SAR**
- Total Cost = 12,500,000 + 1,250,000 = **13,750,000 SAR**

### Example 2: Free Standing Parking

**Input:**

- Parking Type: Free Standing
- Plot Area: 2,000 m²
- Parking Area per Building: 3,000 m²
- Number of Buildings: 2
- Levels: 4
- General Requirements: 10%
- SAR per m² (from Cost Model): 1,800 SAR

**Calculation:**

- Total Plot Area = 2,000 × 2 = **4,000 m²**
- Total Parking Area = 3,000 × 2 = **6,000 m²**
- Net Build Cost = 6,000 × 1,800 = **10,800,000 SAR**
- General Requirements = 10,800,000 × 0.10 = **1,080,000 SAR**
- Total Cost = 10,800,000 + 1,080,000 = **11,880,000 SAR**

---

## Important Constraints

### Maximum Basement Levels

**Basement parking cannot exceed 2 levels.**

This constraint exists because the cost rates in the model are calibrated for typical basement depths. Deeper basements would require different construction methods and costs that are not reflected in the standard rates.

### Linking to Building Assets

Each car parking entry must be linked to a building asset group. This ensures:

- Proper cost allocation to developments
- Accurate reporting of parking provision per asset
- Correct aggregation in masterplan totals

---

## Parking Space Estimation

The platform can estimate parking spaces based on parking area:

| Parking Type | Area per Space | Notes |
|--------------|----------------|-------|
| Basement | 30 m² | More circulation space needed underground |
| Podium | 28 m² | Standard layout |
| Above Ground | 28 m² | Standard layout |
| Free Standing | 25 m² | More efficient layout possible |

**Estimated Spaces = Total Parking Area ÷ Area per Space**
