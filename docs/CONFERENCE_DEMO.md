# Conference demo run-sheet

## Suggested title

**Actuarial Engineering in Practice: When Should an Excel Pension Model Become an Application?**

## 10–12 minute live demonstration

### 1. Start in Excel — 90 seconds

Open `excel/PenSol_Excel_Reference.xlsx`.

Show:

- central assumptions;
- synthetic member census;
- member-level valuation formulas;
- summary liability;
- validation sheet.

Message:

> Excel is not the problem. It is the reference model. The question is what we do when the model becomes a repeated operational process.

### 2. Open the browser application — 60 seconds

Open PenSol on GitHub Pages.

Point out:

- same 1,000-member dataset;
- same actuarial basis;
- same aggregate liability;
- 92% illustrative funding ratio.

### 3. Show member drill-down — 2 minutes

Go to **Members** and click an active member.

Show:

- projected salary;
- projected service;
- retirement pension;
- survival probability;
- annuity factor;
- discount factor;
- PV liability;
- textual audit trail.

Message:

> The calculation is no longer hidden in a cell address. It has become a reusable actuarial function with an explicit audit trail.

### 4. Change an assumption — 2 minutes

Go to **Assumptions** and reduce the discount rate by 0.50%.

Rerun.

Show:

- liability and funding position change immediately;
- every member was revalued;
- validation correctly changes to **Basis changed** rather than pretending the frozen benchmark should still match.

### 5. Run sensitivities — 90 seconds

Open **Sensitivities**.

Explain that every row invokes the same member-level engine under a changed assumption. There is no copied sensitivity worksheet and no separate formula implementation.

### 6. Show architecture — 90 seconds

Return to the dashboard architecture strip:

```text
Excel reference → JavaScript engine → Web application → API-ready service
```

Open `assets/js/engine.js` briefly if appropriate.

Message:

> The interface is not the model. The engine is the model. The browser happens to be one way of consuming it.

### 7. Upload / privacy point — 60 seconds

Mention that the public demo is static and uploaded CSV data is valued locally in the browser.

Do not oversell this as a complete security architecture; make the distinction between a useful client-side characteristic and production security controls.

### 8. Close — 45 seconds

Suggested close:

> This is what I mean by Actuarial Engineering. We are not replacing actuarial judgement with software. We are taking actuarial logic that has proved itself in models such as Excel and engineering it into transparent, testable and reusable systems.

Then show the footer:

**markiV · +1 954 ACTUARY**

## Backup if live internet fails

The core data and engine are local to the repository. Keep a local copy and run:

```bash
python -m http.server 8000
```

The only externally loaded components are the Bootswatch Simplex / Bootstrap presentation assets. For a completely offline conference setup, vendor those two CDN files into the repository before the event.
