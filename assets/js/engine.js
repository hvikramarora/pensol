/*
 * PenSol Engine — markiV Actuarial Engineering Demo
 * Pure actuarial calculation layer: no DOM, no UI dependencies.
 * Educational demonstration only; assumptions and mortality are illustrative.
 */
(function (global) {
  'use strict';

  const MAX_AGE = 120;
  const VALID_STATUSES = ['Active', 'Deferred', 'Pensioner'];

  function num(value, fallback = 0) {
    const x = Number(value);
    return Number.isFinite(x) ? x : fallback;
  }

  function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
  }

  function qx(age, mortalityScale = 1) {
    // Illustrative Makeham/Gompertz-style curve, not a prescribed mortality table.
    const A = 0.00022;
    const B = 2.7e-6;
    const c = 1.124;
    const base = A + B * Math.pow(c, num(age));
    return clamp(base * num(mortalityScale, 1), 0.00005, 0.45);
  }

  function survivalProbability(age, targetAge, mortalityScale = 1) {
    const from = Math.floor(num(age));
    const to = Math.floor(num(targetAge));
    if (to <= from) return 1;
    let p = 1;
    for (let x = from; x < to; x += 1) {
      p *= (1 - qx(x, mortalityScale));
    }
    return p;
  }

  function annuityFactor(age, discountRate, escalationRate, mortalityScale = 1) {
    // Annual pension payable in arrears and increasing annually.
    const x0 = Math.floor(num(age));
    const i = num(discountRate);
    const e = num(escalationRate);
    let factor = 0;
    let survival = 1;

    for (let k = 1; k <= MAX_AGE - x0 + 1; k += 1) {
      const attained = x0 + k - 1;
      survival *= (1 - qx(attained, mortalityScale));
      factor += survival * Math.pow(1 + e, k - 1) / Math.pow(1 + i, k);
      if (survival < 1e-7) break;
    }
    return factor;
  }

  function spouseLoading(a) {
    return 1 + num(a.spouseProbability) * num(a.spousePensionPercent) * num(a.spouseAnnuityRatio);
  }

  function normaliseMember(raw) {
    const statusRaw = String(raw.status || '').trim().toLowerCase();
    const status = statusRaw === 'active' ? 'Active'
      : statusRaw === 'deferred' ? 'Deferred'
        : statusRaw === 'pensioner' || statusRaw === 'retired' ? 'Pensioner'
          : String(raw.status || '').trim();
    return {
      member_id: String(raw.member_id || raw.id || '').trim(),
      status,
      age: num(raw.age),
      service: num(raw.service),
      pensionable_salary: num(raw.pensionable_salary ?? raw.salary),
      current_pension: num(raw.current_pension ?? raw.pension)
    };
  }

  function valueMember(rawMember, a) {
    const m = normaliseMember(rawMember);
    const age = m.age;
    const service = m.service;
    const salary = m.pensionable_salary;
    const pension = m.current_pension;
    const nra = num(a.normalRetirementAge, 60);
    const maxService = num(a.maxService, 40);
    const load = spouseLoading(a);

    const details = {
      member_id: m.member_id,
      status: m.status,
      age,
      service,
      pensionable_salary: salary,
      current_pension: pension,
      years_to_retirement: 0,
      projected_salary: 0,
      projected_service: service,
      annual_pension_at_retirement: 0,
      survival_to_retirement: 1,
      annuity_factor: 0,
      spouse_loading: load,
      discount_factor_to_retirement: 1,
      liability: 0
    };

    if (m.status === 'Pensioner') {
      details.annuity_factor = annuityFactor(age, a.discountRate, a.pensionIncrease, a.mortalityScale);
      details.annual_pension_at_retirement = pension;
      details.liability = pension * details.annuity_factor * load;
      return details;
    }

    const yearsToRetirement = Math.max(0, nra - age);
    details.years_to_retirement = yearsToRetirement;
    details.survival_to_retirement = survivalProbability(age, nra, a.mortalityScale);
    details.annuity_factor = annuityFactor(nra, a.discountRate, a.pensionIncrease, a.mortalityScale);
    details.discount_factor_to_retirement = 1 / Math.pow(1 + num(a.discountRate), yearsToRetirement);

    if (m.status === 'Active') {
      details.projected_salary = salary * Math.pow(1 + num(a.salaryGrowth), yearsToRetirement);
      details.projected_service = Math.min(maxService, service + yearsToRetirement);
      details.annual_pension_at_retirement = details.projected_salary * details.projected_service * num(a.accrualRate, 1 / 60);
    } else if (m.status === 'Deferred') {
      const accruedPension = salary * Math.min(maxService, service) * num(a.accrualRate, 1 / 60);
      details.projected_salary = salary;
      details.projected_service = Math.min(maxService, service);
      details.annual_pension_at_retirement = accruedPension * Math.pow(1 + num(a.defermentIncrease), yearsToRetirement);
    }

    details.liability = details.annual_pension_at_retirement
      * details.survival_to_retirement
      * details.annuity_factor
      * details.spouse_loading
      * details.discount_factor_to_retirement;

    return details;
  }

  function validateMembers(rawMembers) {
    const issues = [];
    const ids = new Set();
    const seenDuplicates = new Set();

    (rawMembers || []).forEach((raw, idx) => {
      const m = normaliseMember(raw);
      const row = idx + 2;
      if (!m.member_id) issues.push({ severity: 'error', row, member_id: '', message: 'Member ID is missing.' });
      if (m.member_id && ids.has(m.member_id) && !seenDuplicates.has(m.member_id)) {
        issues.push({ severity: 'error', row, member_id: m.member_id, message: 'Duplicate member ID.' });
        seenDuplicates.add(m.member_id);
      }
      ids.add(m.member_id);
      if (!VALID_STATUSES.includes(m.status)) issues.push({ severity: 'error', row, member_id: m.member_id, message: `Unknown status: ${m.status || '(blank)'}.` });
      if (m.age < 18 || m.age > 110) issues.push({ severity: 'error', row, member_id: m.member_id, message: `Age ${m.age} is outside the expected 18–110 range.` });
      if (m.service < 0 || m.service > 60) issues.push({ severity: 'error', row, member_id: m.member_id, message: `Service ${m.service} is outside the expected 0–60 range.` });
      if ((m.status === 'Active' || m.status === 'Deferred') && m.pensionable_salary <= 0) issues.push({ severity: 'error', row, member_id: m.member_id, message: 'Pensionable salary must be positive for active/deferred members.' });
      if (m.status === 'Pensioner' && m.current_pension <= 0) issues.push({ severity: 'error', row, member_id: m.member_id, message: 'Current pension must be positive for pensioners.' });
      if (m.service > Math.max(0, m.age - 14)) issues.push({ severity: 'warning', row, member_id: m.member_id, message: 'Service looks high relative to age; review source data.' });
      if (m.status === 'Pensioner' && m.age < 50) issues.push({ severity: 'warning', row, member_id: m.member_id, message: 'Pensioner below age 50; confirm early retirement/ill-health status.' });
    });

    return issues;
  }

  function valueScheme(rawMembers, a) {
    const members = (rawMembers || []).map(normaliseMember);
    const results = members.map(m => valueMember(m, a));
    const byStatus = { Active: 0, Deferred: 0, Pensioner: 0 };
    const counts = { Active: 0, Deferred: 0, Pensioner: 0 };

    results.forEach(r => {
      if (Object.prototype.hasOwnProperty.call(byStatus, r.status)) {
        byStatus[r.status] += r.liability;
        counts[r.status] += 1;
      }
    });

    const totalLiability = results.reduce((s, r) => s + r.liability, 0);
    const assets = num(a.assets);
    const surplus = assets - totalLiability;
    const fundingRatio = totalLiability > 0 ? assets / totalLiability : 0;

    return {
      results,
      counts,
      byStatus,
      totalLiability,
      assets,
      surplus,
      fundingRatio,
      issues: validateMembers(members)
    };
  }

  function runSensitivities(rawMembers, baseAssumptions) {
    const base = valueScheme(rawMembers, baseAssumptions).totalLiability;
    const scenarios = [
      { name: 'Discount rate -1.00%', key: 'discountRate', delta: -0.01 },
      { name: 'Discount rate -0.50%', key: 'discountRate', delta: -0.005 },
      { name: 'Discount rate +0.50%', key: 'discountRate', delta: 0.005 },
      { name: 'Discount rate +1.00%', key: 'discountRate', delta: 0.01 },
      { name: 'Salary growth -0.50%', key: 'salaryGrowth', delta: -0.005 },
      { name: 'Salary growth +0.50%', key: 'salaryGrowth', delta: 0.005 },
      { name: 'Pension increase -0.50%', key: 'pensionIncrease', delta: -0.005 },
      { name: 'Pension increase +0.50%', key: 'pensionIncrease', delta: 0.005 },
      { name: 'Mortality rates -10%', key: 'mortalityScale', multiply: 0.90 },
      { name: 'Mortality rates +10%', key: 'mortalityScale', multiply: 1.10 },
      { name: 'Retirement age -1', key: 'normalRetirementAge', delta: -1 },
      { name: 'Retirement age +1', key: 'normalRetirementAge', delta: 1 }
    ];

    return scenarios.map(s => {
      const a = { ...baseAssumptions };
      if (s.multiply != null) a[s.key] = num(a[s.key], 1) * s.multiply;
      else a[s.key] = num(a[s.key]) + s.delta;
      const total = valueScheme(rawMembers, a).totalLiability;
      return {
        scenario: s.name,
        totalLiability: total,
        changeAmount: total - base,
        changePercent: base ? (total / base - 1) : 0
      };
    });
  }

  function projectCashflows(rawMembers, a, horizon = 30) {
    const members = (rawMembers || []).map(normaliseMember);
    const nra = num(a.normalRetirementAge, 60);
    const load = spouseLoading(a);
    const output = [];

    for (let year = 1; year <= horizon; year += 1) {
      let payment = 0;
      members.forEach(m => {
        const attainedAge = m.age + year;
        if (attainedAge > MAX_AGE) return;
        const survival = survivalProbability(m.age, attainedAge, a.mortalityScale);

        if (m.status === 'Pensioner') {
          payment += m.current_pension * Math.pow(1 + num(a.pensionIncrease), year - 1) * survival * load;
          return;
        }

        const ytr = Math.max(0, nra - m.age);
        if (year < ytr || attainedAge < nra) return;

        let pensionAtRetirement = 0;
        if (m.status === 'Active') {
          const projSalary = m.pensionable_salary * Math.pow(1 + num(a.salaryGrowth), ytr);
          const projService = Math.min(num(a.maxService, 40), m.service + ytr);
          pensionAtRetirement = projSalary * projService * num(a.accrualRate, 1 / 60);
        } else if (m.status === 'Deferred') {
          const accrued = m.pensionable_salary * Math.min(num(a.maxService, 40), m.service) * num(a.accrualRate, 1 / 60);
          pensionAtRetirement = accrued * Math.pow(1 + num(a.defermentIncrease), ytr);
        }

        const yearsInPayment = Math.max(0, year - ytr);
        payment += pensionAtRetirement * Math.pow(1 + num(a.pensionIncrease), yearsInPayment) * survival * load;
      });
      output.push({ year, payment });
    }
    return output;
  }

  function memberAuditText(result, a) {
    const lines = [];
    lines.push(`Member ${result.member_id} — ${result.status}`);
    lines.push(`Age = ${result.age.toFixed(1)}; service = ${result.service.toFixed(1)} years`);
    if (result.status === 'Pensioner') {
      lines.push(`Current annual pension = ${result.current_pension.toFixed(2)}`);
      lines.push(`Increasing annuity factor at age ${result.age.toFixed(0)} = ${result.annuity_factor.toFixed(6)}`);
    } else {
      lines.push(`Years to retirement = ${result.years_to_retirement.toFixed(1)}`);
      if (result.status === 'Active') lines.push(`Projected salary = salary × (1 + salary growth)^years = ${result.projected_salary.toFixed(2)}`);
      lines.push(`Projected service = ${result.projected_service.toFixed(1)} years`);
      lines.push(`Annual pension at retirement = ${result.annual_pension_at_retirement.toFixed(2)}`);
      lines.push(`Survival probability to retirement = ${result.survival_to_retirement.toFixed(6)}`);
      lines.push(`Discount factor to retirement = ${result.discount_factor_to_retirement.toFixed(6)}`);
      lines.push(`Increasing annuity factor at retirement = ${result.annuity_factor.toFixed(6)}`);
    }
    lines.push(`Spouse/dependant loading = ${result.spouse_loading.toFixed(6)}`);
    lines.push(`Present value liability = ${result.liability.toFixed(2)}`);
    lines.push('');
    lines.push('Important: this is an illustrative actuarial engineering demo, not a prescribed valuation basis or accounting-standard calculation.');
    return lines.join('\n');
  }

  global.PensionEngine = {
    MAX_AGE,
    VALID_STATUSES,
    qx,
    survivalProbability,
    annuityFactor,
    spouseLoading,
    normaliseMember,
    valueMember,
    valueScheme,
    validateMembers,
    runSensitivities,
    projectCashflows,
    memberAuditText
  };
})(window);
