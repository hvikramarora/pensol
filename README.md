# PensionVal — a markiV Actuarial Engineering demo

**Excel reference model → reusable JavaScript actuarial engine → browser application → API-ready architecture**

PensionVal is a practical demonstration of **Actuarial Engineering** using a defined benefit pension valuation workflow that would commonly be built and operated in Excel.

The purpose is not to argue that Excel is wrong. Excel remains the **independent reference implementation and validation benchmark**. The engineering step is to separate actuarial methodology from spreadsheet cells and turn it into a transparent, testable and reusable calculation engine that can support different user interfaces and integrations.

> **Built by markiV — Actuarial Engineering**  
> Want the application adapted to your scheme rules, data, reporting or API workflow? **+1 954 ACTUARY**

## What the demo does

The bundled synthetic scheme contains **1,000 members**:

- 620 active members
- 130 deferred members
- 250 pensioners

Under the frozen demonstration assumptions, the model produces approximately:

- **Defined benefit liability:** ₹694.83 crore
- **Illustrative scheme assets:** ₹639.24 crore
- **Funding ratio:** 92.0%
- **Illustrative deficit:** ₹55.59 crore

The web app includes:

- member-level pension valuation;
- active, deferred and pensioner calculations;
- centralised actuarial assumptions;
- an illustrative mortality basis;
- funding position and status-level liability analysis;
- 30-year expected benefit cash outgo;
- 12 actuarial sensitivity scenarios;
- member search and drill-down;
- calculation audit trail;
- CSV census upload;
- data-quality checks;
- member-result CSV export;
- a frozen Excel ↔ JavaScript validation benchmark;
- print-friendly scheme summary;
- browser-local calculation with no application backend.

## Repository structure

```text
pensionval-markiv/
├── index.html
├── README.md
├── NOTICE.md
├── .nojekyll
├── assets/
│   ├── css/
│   │   └── app.css
│   └── js/
│       ├── engine.js          # pure actuarial calculation engine
│       ├── app.js             # browser workflow / UI
│       ├── sample-data.js     # bundled synthetic census
│       └── benchmarks.js      # frozen validation values
├── data/
│   ├── sample-members.csv
│   ├── default-assumptions.json
│   ├── sample-summary.json
│   └── validation-benchmarks.csv
├── excel/
│   └── PensionVal_Excel_Reference.xlsx
└── docs/
    ├── METHODOLOGY.md
    ├── VALIDATION.md
    ├── CONFERENCE_DEMO.md
    └── GITHUB_PAGES.md
```

## Architecture

```text
Synthetic / scheme census
        │
        ▼
  Data validation
        │
        ▼
Central assumptions ──────┐
        │                 │
        ▼                 │
JavaScript actuarial engine
        │
        ├────────► Member audit trail
        ├────────► Scheme dashboard
        ├────────► Sensitivities
        ├────────► CSV exports
        └────────► Future API / other applications

Independent control:
Excel reference model ─────► Frozen member & aggregate reconciliation
```

`assets/js/engine.js` contains no DOM or interface logic. It can therefore be tested or moved into another runtime without rewriting the pension formulas.

## Excel reference model

The reference workbook is:

```text
excel/PensionVal_Excel_Reference.xlsx
```

It contains separate sheets for:

1. **Assumptions** — editable financial, scheme and demographic inputs.
2. **Members** — the synthetic pension census.
3. **Mortality** — base qx, scaled qx, px, survival index and increasing annuity factors.
4. **Valuation** — member-level Excel formulas.
5. **Summary** — scheme liability, assets, funding ratio and liability split.
6. **Validation** — frozen aggregate and selected-member benchmarks.

This is deliberate. The workbook is not hidden after the web app exists; it remains part of the model governance story.

## Calculation outline

### Active member

1. Project salary from current age to normal retirement age.
2. Project pensionable service, subject to maximum service.
3. Calculate projected annual pension using the accrual rate.
4. Apply survival to retirement.
5. Apply the increasing pension annuity factor at retirement.
6. Apply the simplified spouse/dependant benefit loading.
7. Discount the expected retirement benefit to the valuation date.

### Deferred member

1. Calculate accrued pension from exit pensionable salary and accrued service.
2. Increase the pension during deferment.
3. Apply survival, annuity, dependant and discount factors.

### Pensioner

1. Take the current annual pension.
2. Apply the increasing life-annuity factor at current age.
3. Apply the simplified dependant-benefit loading.

See `docs/METHODOLOGY.md` for the detailed formulas and limitations.

## Mortality basis

PensionVal intentionally uses a transparent illustrative curve rather than a proprietary or jurisdiction-specific table:

```text
qx = A + B × c^x
A = 0.00022
B = 0.0000027
c = 1.124
```

A mortality multiplier supports simple sensitivity testing. A production implementation should replace this with the scheme's approved mortality table, population adjustments and improvement basis.

## Privacy characteristic of this static demo

The public demonstration is a **static browser application**. There is no PensionVal application server. An uploaded CSV is parsed and valued by JavaScript in the user's browser.

That is useful for a demo, but it is not in itself a complete security design. A production deployment would still require explicit decisions on authentication, authorisation, encryption, audit logging, data retention, secure hosting and operational controls.

## CSV format

Required columns:

```csv
member_id,status,age,service,pensionable_salary,current_pension
A0001,Active,42,16.0,1850000,0
D0001,Deferred,51,20.0,1400000,0
P0001,Pensioner,68,31.0,0,620000
```

Recognised statuses are `Active`, `Deferred` and `Pensioner`.

## Run locally

Because PensionVal is a static application, any local HTTP server is enough. For example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

The bundled sample data are also embedded in JavaScript, so the demonstration does not depend on fetching the CSV at runtime.

## Publish on GitHub Pages

See `docs/GITHUB_PAGES.md`. In short:

1. Create a GitHub repository.
2. Put the contents of this folder in the repository root.
3. Push to the `main` branch.
4. In **Settings → Pages**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`.
6. Save and use the generated GitHub Pages URL.

## Technology

- HTML5
- vanilla JavaScript
- Bootswatch **Simplex** theme on Bootstrap 5
- no application framework
- no backend required for the public demo

Keeping the JavaScript plain is intentional: conference attendees can open `engine.js` and see the separation between actuarial formulas and interface code without first understanding a framework.

## Important limitations

PensionVal is an educational and architectural demonstration. It does **not** claim compliance with IAS 19, ASC 715 or any pension funding, tax, accounting or regulatory regime. It does not model all real scheme provisions. Examples omitted from the base demo include commutation, guaranteed periods, early/late retirement factors, multiple benefit tranches, sex-specific or member-specific mortality, improvement scales, decrement interactions, expenses and jurisdiction-specific disclosure rules.

Those omissions are intentional: the first version keeps the calculation basis transparent enough to inspect live while still looking and behaving like a genuine pension valuation workflow.

## Customisation

Pension schemes rarely share exactly the same rules. PensionVal is designed so that benefit logic can be extended without rebuilding the entire interface.

Possible extensions include:

- scheme-specific benefit tranches and NRAs;
- early / late retirement factors;
- commutation and lump-sum options;
- spouse and dependant benefits;
- guaranteed periods;
- mortality tables and longevity improvement models;
- member-specific decrement assumptions;
- IAS 19 / ASC 715 / funding output layers;
- plan amendments and past-service-cost calculations;
- cash-flow and asset-liability projections;
- scenario libraries;
- database ingestion;
- authentication and audit logs;
- REST API deployment;
- integration with Excel, web portals or AI workflows.

**For customisation: markiV · +1 954 ACTUARY**

---

**PensionVal · markiV Actuarial Engineering**  
Synthetic data. Illustrative assumptions. Transparent code. Real actuarial workflow.
