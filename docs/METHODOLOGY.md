# PenSol methodology

## Purpose

This document describes the pension mathematics used in the public PenSol Actuarial Engineering demonstration. The aim is transparency and reproducibility rather than replication of a jurisdiction-specific actuarial standard.

## Base assumptions

| Assumption | Demo value |
|---|---:|
| Discount rate | 6.50% p.a. |
| Salary growth | 5.50% p.a. |
| Pension increase | 3.50% p.a. |
| Deferred pension increase | 4.00% p.a. |
| Normal retirement age | 60 |
| Accrual rate | 1/60 per year |
| Maximum pensionable service | 40 years |
| Spouse probability | 75% |
| Spouse pension | 50% of member pension |
| Spouse annuity ratio | 0.85 |
| Mortality scale | 1.00 |

## Mortality

The illustrative base mortality curve is:

```text
qx = min(0.45, max(0.00005, A + B × c^x))
A = 0.00022
B = 0.0000027
c = 1.124
```

For a mortality scale `m`:

```text
qx(stressed) = min(0.45, max(0.00005, qx(base) × m))
```

Survival from age x to age y is the product of annual `px = 1 - qx` terms between the two ages.

## Increasing pension annuity factor

For pension paid annually in arrears and escalating at rate `e`, the factor at age x is:

```text
a(x) = Σ [ survival(x → x+k) × (1+e)^(k-1) / (1+i)^k ]
```

The engine projects through the demonstration maximum age of 120.

The Excel workbook calculates the same factor recursively:

```text
a(x) = v × px × [1 + (1+e) × a(x+1)]
```

with the final age handled as a one-period expected payment.

## Active members

Let:

- x = current age
- r = normal retirement age
- s = accrued service
- S = current pensionable salary
- g = salary growth
- n = max(0, r - x)
- α = accrual rate
- smax = maximum pensionable service

Projected salary:

```text
S(r) = S × (1+g)^n
```

Projected service:

```text
service(r) = min(smax, s+n)
```

Projected annual pension:

```text
P(r) = S(r) × service(r) × α
```

The present value is:

```text
PV = P(r)
     × survival(x → r)
     × annuity_factor(r)
     × spouse_loading
     × (1+i)^(-n)
```

## Deferred members

The accrued pension at exit is approximated as:

```text
P(exit) = exit pensionable salary × min(service, smax) × α
```

Projected pension at retirement:

```text
P(r) = P(exit) × (1 + deferment increase)^n
```

The same survival, annuity, dependant and discount framework is then applied.

## Pensioners

For current pension P(x):

```text
PV = P(x) × annuity_factor(x) × spouse_loading
```

## Simplified spouse/dependant loading

The demo uses a transparent multiplicative loading:

```text
spouse_loading = 1
                 + spouse_probability
                   × spouse_pension_percentage
                   × spouse_annuity_ratio
```

This is deliberately simplified. A real implementation would normally value dependant benefits using explicit probabilities, ages, mortality and benefit rules.

## Sensitivities

The web application reruns the full member-level engine for:

- discount rate ±0.50% and ±1.00%;
- salary growth ±0.50%;
- pension increase ±0.50%;
- mortality rates ±10%;
- normal retirement age ±1 year.

This is not a shortcut based on duration. Each scenario revalues every member.

## Cash-flow chart

The expected 30-year pension outgo is a decision-support projection. Pensioners are projected from current pension; active and deferred members enter payment after normal retirement age. Survival and pension escalation are applied consistently with the valuation basis.

The chart is not intended to be a full asset-liability model.

## Deliberate exclusions

The base model does not include every feature of a real pension scheme. Exclusions include multiple service tranches, commutation, guaranteed periods, early-retirement reductions, late-retirement uplifts, ill-health retirement, expenses, tax, accounting attribution methods, contribution requirements and statutory disclosure formats.

These belong in customised implementations rather than being hidden inside a public demonstration.

---

**markiV · Actuarial Engineering · +1 954 ACTUARY**
