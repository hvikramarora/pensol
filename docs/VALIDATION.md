# Excel ↔ JavaScript validation

PensionVal keeps Excel as an independent reference model. The objective is to show how an actuarial model can move into an engineered calculation layer without losing traceability.

## Frozen base benchmark

The base benchmark uses:

- the bundled 1,000-member synthetic census;
- the default assumptions in `data/default-assumptions.json`;
- the Excel reference workbook;
- the JavaScript engine in `assets/js/engine.js`.

Reference aggregate DB liability:

```text
6,948,299,215.042313
```

The web app compares the browser result with a tolerance of 0.01 currency units.

## Member-level benchmark

Twelve members are frozen in `data/validation-benchmarks.csv`: four active, four deferred and four pensioners. This prevents an aggregate total from hiding member-level offsetting differences.

The Validation screen reports, for every benchmark member:

```text
Reference liability
JavaScript liability
Difference
Matched / Review
```

## Assumption changes

A benchmark is only meaningful if the underlying basis is frozen. Therefore, when a user changes a base actuarial assumption, the application does **not** label the reconciliation as failed. Instead it displays **Basis changed** and requires the frozen demonstration assumptions to be restored before the reference comparison is run.

That behaviour is itself a model-control principle: a changed model basis requires a changed independent benchmark.

## Additional controls demonstrated

- unique member ID check;
- permitted status check;
- age range check;
- service range check;
- salary required for active/deferred members;
- current pension required for pensioners;
- age/service plausibility warning;
- selected member audit trail;
- centralised assumptions;
- source-code separation between engine and interface.

## Production control extensions

A real production model would normally add automated unit tests, regression packs, peer review, source-data reconciliation, versioned assumption sets, access controls, signed releases, exception workflows, logging and independently approved actuarial bases.

---

**markiV · Actuarial Engineering · +1 954 ACTUARY**
