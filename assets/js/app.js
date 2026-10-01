/* PenSol UI — markiV */
(function () {
  'use strict';

  const E = window.PensionEngine;
  const SAMPLE = (window.PENSOL_SAMPLE_MEMBERS || []).map(E.normaliseMember);
  const BENCH = window.PENSOL_BENCHMARKS || { members: [], tolerance: 0.01 };
  const PAGE_SIZE = 25;

  const DEFAULTS = Object.freeze({
    valuationDate: '2026-03-31',
    discountRate: 0.065,
    salaryGrowth: 0.055,
    pensionIncrease: 0.035,
    defermentIncrease: 0.04,
    normalRetirementAge: 60,
    accrualRate: 1 / 60,
    maxService: 40,
    spouseProbability: 0.75,
    spousePensionPercent: 0.50,
    spouseAnnuityRatio: 0.85,
    mortalityScale: 1.0,
    assets: 6392400000,
    currency: 'INR'
  });

  let assumptions = { ...DEFAULTS };
  let members = SAMPLE.map(x => ({ ...x }));
  let scheme = null;
  let sensitivities = [];
  let dataSource = 'Synthetic sample scheme';
  let currentPage = 1;

  const el = id => document.getElementById(id);

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function currencySymbol() {
    return { INR: '₹', GBP: '£', USD: '$', EUR: '€' }[assumptions.currency] || '';
  }

  function formatMoneyCompact(value) {
    const v = Number(value) || 0;
    const sign = v < 0 ? '-' : '';
    const x = Math.abs(v);
    const symbol = currencySymbol();
    if (assumptions.currency === 'INR') {
      if (x >= 1e7) return `${sign}${symbol}${(x / 1e7).toFixed(x >= 1e9 ? 1 : 2)} Cr`;
      if (x >= 1e5) return `${sign}${symbol}${(x / 1e5).toFixed(1)} L`;
      return `${sign}${symbol}${x.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
    if (x >= 1e9) return `${sign}${symbol}${(x / 1e9).toFixed(1)}bn`;
    if (x >= 1e6) return `${sign}${symbol}${(x / 1e6).toFixed(1)}m`;
    if (x >= 1e3) return `${sign}${symbol}${(x / 1e3).toFixed(1)}k`;
    return `${sign}${symbol}${x.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  function formatMoney(value, decimals = 0) {
    const v = Number(value) || 0;
    const locale = assumptions.currency === 'INR' ? 'en-IN' : 'en-GB';
    return `${currencySymbol()}${v.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }

  function pct(x, digits = 1) {
    return `${(100 * (Number(x) || 0)).toFixed(digits)}%`;
  }

  function setFormFromAssumptions() {
    el('discountRate').value = (assumptions.discountRate * 100).toFixed(2);
    el('salaryGrowth').value = (assumptions.salaryGrowth * 100).toFixed(2);
    el('pensionIncrease').value = (assumptions.pensionIncrease * 100).toFixed(2);
    el('defermentIncrease').value = (assumptions.defermentIncrease * 100).toFixed(2);
    el('normalRetirementAge').value = assumptions.normalRetirementAge;
    el('accrualDenominator').value = Math.round(1 / assumptions.accrualRate);
    el('maxService').value = assumptions.maxService;
    el('mortalityScale').value = assumptions.mortalityScale.toFixed(2);
    el('spouseProbability').value = (assumptions.spouseProbability * 100).toFixed(1);
    el('spousePensionPercent').value = (assumptions.spousePensionPercent * 100).toFixed(1);
    el('spouseAnnuityRatio').value = assumptions.spouseAnnuityRatio.toFixed(2);
    el('assets').value = Math.round(assumptions.assets);
    el('currency').value = assumptions.currency;
  }

  function readAssumptionsFromForm() {
    const denom = Math.max(1, Number(el('accrualDenominator').value) || 60);
    return {
      ...assumptions,
      discountRate: Number(el('discountRate').value) / 100,
      salaryGrowth: Number(el('salaryGrowth').value) / 100,
      pensionIncrease: Number(el('pensionIncrease').value) / 100,
      defermentIncrease: Number(el('defermentIncrease').value) / 100,
      normalRetirementAge: Number(el('normalRetirementAge').value),
      accrualRate: 1 / denom,
      maxService: Number(el('maxService').value),
      mortalityScale: Number(el('mortalityScale').value),
      spouseProbability: Number(el('spouseProbability').value) / 100,
      spousePensionPercent: Number(el('spousePensionPercent').value) / 100,
      spouseAnnuityRatio: Number(el('spouseAnnuityRatio').value),
      assets: Number(el('assets').value),
      currency: el('currency').value
    };
  }

  function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.toggle('active', s.id === viewId));
    document.querySelectorAll('#viewNav .nav-link').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function runValuation(options = {}) {
    scheme = E.valueScheme(members, assumptions);
    currentPage = 1;
    renderDashboard();
    renderMembers();
    renderDataQuality();
    updateValidation();
    if (options.runSensitivities !== false) runSensitivitySet();
    el('valuationStamp').textContent = `${dataSource} · valuation basis ${assumptions.valuationDate} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  function renderDashboard() {
    if (!scheme) return;
    const c = scheme.counts;
    el('metricMembers').textContent = members.length.toLocaleString();
    el('metricMemberSplit').textContent = `${c.Active} active · ${c.Deferred} deferred · ${c.Pensioner} pensioners`;
    el('metricLiability').textContent = formatMoneyCompact(scheme.totalLiability);
    el('metricAssets').textContent = formatMoneyCompact(scheme.assets);
    el('metricFunding').textContent = pct(scheme.fundingRatio, 1);
    el('metricFundingSub').textContent = scheme.fundingRatio >= 1 ? 'funded above 100%' : 'funded below 100%';
    el('metricSurplus').textContent = formatMoneyCompact(scheme.surplus);
    el('metricSurplus').classList.toggle('text-danger', scheme.surplus < 0);
    el('metricSurplus').classList.toggle('text-success', scheme.surplus >= 0);
    const errors = scheme.issues.filter(x => x.severity === 'error').length;
    const warnings = scheme.issues.filter(x => x.severity === 'warning').length;
    el('metricIssues').textContent = errors ? errors : (warnings ? warnings : '0');
    el('metricIssueSub').textContent = errors ? `${errors} error(s), ${warnings} warning(s)` : warnings ? `${warnings} warning(s)` : 'checks passed';
    renderLiabilityDonut();
    renderCashflows();
  }

  function renderLiabilityDonut() {
    const total = scheme.totalLiability || 1;
    const active = scheme.byStatus.Active / total * 100;
    const deferred = scheme.byStatus.Deferred / total * 100;
    const pensioner = 100 - active - deferred;
    el('liabilityDonut').style.background = `conic-gradient(var(--bs-primary) 0 ${active}%, #6c757d ${active}% ${active + deferred}%, #212529 ${active + deferred}% 100%)`;
    el('liabilityLegend').innerHTML = [
      ['var(--bs-primary)', 'Active', scheme.byStatus.Active, active],
      ['#6c757d', 'Deferred', scheme.byStatus.Deferred, deferred],
      ['#212529', 'Pensioner', scheme.byStatus.Pensioner, pensioner]
    ].map(x => `<div class="d-flex justify-content-between align-items-center py-2 border-bottom"><div><span class="legend-dot" style="background:${x[0]}"></span>${x[1]}</div><div class="text-end"><strong>${formatMoneyCompact(x[2])}</strong><div class="small text-muted">${x[3].toFixed(1)}%</div></div></div>`).join('');
  }

  function renderCashflows() {
    const flows = E.projectCashflows(members, assumptions, 30);
    const max = Math.max(...flows.map(x => x.payment), 1);
    el('cashflowChart').innerHTML = flows.map(f => {
      const height = Math.max(2, f.payment / max * 100);
      return `<div class="cashflow-bar" style="height:${height}%" title="Year ${f.year}: ${formatMoney(f.payment)}"></div>`;
    }).join('');
  }

  function filteredResults() {
    if (!scheme) return [];
    const q = el('memberSearch').value.trim().toLowerCase();
    const status = el('statusFilter').value;
    return scheme.results.filter(r => (!q || r.member_id.toLowerCase().includes(q)) && (!status || r.status === status));
  }

  function renderMembers() {
    if (!scheme) return;
    const rows = filteredResults();
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);
    const tbody = el('membersTable').querySelector('tbody');
    tbody.innerHTML = pageRows.map(r => {
      const baseValue = r.status === 'Pensioner' ? r.current_pension : r.pensionable_salary;
      const badge = r.status === 'Active' ? 'primary' : r.status === 'Deferred' ? 'secondary' : 'dark';
      return `<tr role="button" data-member="${escapeHtml(r.member_id)}"><td><strong>${escapeHtml(r.member_id)}</strong></td><td><span class="badge text-bg-${badge} status-pill">${r.status}</span></td><td class="text-end">${r.age.toFixed(0)}</td><td class="text-end">${r.service.toFixed(1)}</td><td class="text-end">${formatMoney(baseValue)}</td><td class="text-end">${formatMoney(r.annual_pension_at_retirement)}</td><td class="text-end"><strong>${formatMoney(r.liability)}</strong></td></tr>`;
    }).join('') || '<tr><td colspan="7" class="text-center text-muted py-4">No members match the filter.</td></tr>';

    tbody.querySelectorAll('tr[data-member]').forEach(tr => tr.addEventListener('click', () => openMember(tr.dataset.member)));
    el('memberPagerText').textContent = rows.length ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, rows.length)} of ${rows.length}` : '0 members';
    el('prevPageBtn').disabled = currentPage <= 1;
    el('nextPageBtn').disabled = currentPage >= totalPages;
  }

  function openMember(memberId) {
    const r = scheme.results.find(x => x.member_id === memberId);
    if (!r) return;
    el('memberModalTitle').textContent = `${r.member_id} · ${r.status}`;
    const topValue = r.status === 'Pensioner' ? r.current_pension : r.pensionable_salary;
    el('memberModalBody').innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3"><div class="border p-3"><div class="small text-muted">Age</div><div class="h4 mb-0">${r.age.toFixed(0)}</div></div></div>
        <div class="col-6 col-md-3"><div class="border p-3"><div class="small text-muted">Service</div><div class="h4 mb-0">${r.service.toFixed(1)} yrs</div></div></div>
        <div class="col-6 col-md-3"><div class="border p-3"><div class="small text-muted">${r.status === 'Pensioner' ? 'Current pension' : 'Pensionable salary'}</div><div class="h4 mb-0">${formatMoneyCompact(topValue)}</div></div></div>
        <div class="col-6 col-md-3"><div class="border p-3"><div class="small text-muted">PV liability</div><div class="h4 mb-0 text-primary">${formatMoneyCompact(r.liability)}</div></div></div>
      </div>
      <div class="row g-4">
        <div class="col-lg-6">
          <h3 class="h6">Calculation components</h3>
          <table class="table table-sm">
            <tbody>
              <tr><th>Years to retirement</th><td class="text-end">${r.years_to_retirement.toFixed(1)}</td></tr>
              <tr><th>Projected salary</th><td class="text-end">${formatMoney(r.projected_salary)}</td></tr>
              <tr><th>Projected service</th><td class="text-end">${r.projected_service.toFixed(1)}</td></tr>
              <tr><th>Annual pension at retirement</th><td class="text-end">${formatMoney(r.annual_pension_at_retirement)}</td></tr>
              <tr><th>Survival to retirement</th><td class="text-end">${r.survival_to_retirement.toFixed(6)}</td></tr>
              <tr><th>Annuity factor</th><td class="text-end">${r.annuity_factor.toFixed(6)}</td></tr>
              <tr><th>Spouse/dependant loading</th><td class="text-end">${r.spouse_loading.toFixed(6)}</td></tr>
              <tr><th>Discount factor</th><td class="text-end">${r.discount_factor_to_retirement.toFixed(6)}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="col-lg-6"><h3 class="h6">Audit trail</h3><div class="audit-box">${escapeHtml(E.memberAuditText(r, assumptions))}</div></div>
      </div>`;
    el('methodologyAuditExample').textContent = E.memberAuditText(r, assumptions);
    bootstrap.Modal.getOrCreateInstance(el('memberModal')).show();
  }

  function renderDataQuality() {
    const issues = scheme?.issues || [];
    const errors = issues.filter(x => x.severity === 'error');
    const warnings = issues.filter(x => x.severity === 'warning');
    const panel = el('dataQualityPanel');
    if (!issues.length) {
      panel.innerHTML = '<div class="validation-pass mb-2">✓ Core data checks passed</div><div class="small-note">IDs are unique; statuses are recognised; age/service fields are in expected ranges; required salary/pension amounts are present.</div>';
      return;
    }
    panel.innerHTML = `<div class="mb-3"><strong>${errors.length}</strong> error(s) · <strong>${warnings.length}</strong> warning(s)</div>` + issues.slice(0, 12).map(i => `<div class="small border-top py-2"><span class="badge ${i.severity === 'error' ? 'text-bg-danger' : 'text-bg-warning'}">${i.severity}</span> <strong>${escapeHtml(i.member_id || `row ${i.row}`)}</strong><br>${escapeHtml(i.message)}</div>`).join('') + (issues.length > 12 ? `<div class="small text-muted mt-2">Showing first 12 of ${issues.length} issues.</div>` : '');
  }

  function runSensitivitySet() {
    sensitivities = E.runSensitivities(members, assumptions);
    renderSensitivities();
  }

  function renderSensitivities() {
    const tbody = el('sensitivityTable').querySelector('tbody');
    if (!sensitivities.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Run sensitivities to populate this table.</td></tr>';
      return;
    }
    const maxAbs = Math.max(...sensitivities.map(s => Math.abs(s.changePercent)), 0.001);
    tbody.innerHTML = sensitivities.map(s => {
      const width = Math.max(2, Math.abs(s.changePercent) / maxAbs * 100);
      const cls = s.changePercent >= 0 ? 'positive' : 'negative';
      return `<tr><td><strong>${escapeHtml(s.scenario)}</strong></td><td class="text-end">${formatMoneyCompact(s.totalLiability)}</td><td class="text-end ${s.changeAmount >= 0 ? 'text-danger' : 'text-success'}">${s.changeAmount >= 0 ? '+' : ''}${formatMoneyCompact(s.changeAmount)}</td><td class="text-end ${s.changePercent >= 0 ? 'text-danger' : 'text-success'}">${s.changePercent >= 0 ? '+' : ''}${pct(s.changePercent, 2)}</td><td><div class="sensitivity-bar-wrap"><div class="sensitivity-bar ${cls}" style="width:${width}%"></div></div></td></tr>`;
    }).join('');
  }

  function benchmarkBasisUnchanged() {
    const keys = ['discountRate','salaryGrowth','pensionIncrease','defermentIncrease','normalRetirementAge','accrualRate','maxService','spouseProbability','spousePensionPercent','spouseAnnuityRatio','mortalityScale'];
    return dataSource === 'Synthetic sample scheme' && keys.every(k => Math.abs(Number(assumptions[k]) - Number(DEFAULTS[k])) < 1e-12);
  }

  function updateValidation() {
    const tbody = el('validationTable').querySelector('tbody');
    if (!scheme || !benchmarkBasisUnchanged()) {
      el('validationAggregateStatus').textContent = 'Basis changed';
      el('validationAggregateStatus').className = 'h5 mb-0 text-warning';
      el('validationMemberStatus').textContent = 'Basis changed';
      el('validationMemberStatus').className = 'h5 mb-0 text-warning';
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Reload the sample scheme and reset demo assumptions to run the frozen Excel ↔ JavaScript benchmark.</td></tr>';
      return;
    }
    const tol = Number(BENCH.tolerance || 0.01);
    const aggDiff = scheme.totalLiability - Number(BENCH.base_total_liability || 0);
    const aggPass = Math.abs(aggDiff) <= tol;
    el('validationAggregateStatus').textContent = aggPass ? '✓ Matched' : '✕ Review';
    el('validationAggregateStatus').className = `h5 mb-0 ${aggPass ? 'validation-pass' : 'validation-fail'}`;

    let memberPass = true;
    tbody.innerHTML = (BENCH.members || []).map(b => {
      const r = scheme.results.find(x => x.member_id === b.member_id);
      const js = r ? r.liability : NaN;
      const diff = js - Number(b.liability);
      const pass = Number.isFinite(js) && Math.abs(diff) <= tol;
      memberPass = memberPass && pass;
      return `<tr><td>${escapeHtml(b.member_id)}</td><td class="text-end">${formatMoney(Number(b.liability), 2)}</td><td class="text-end">${Number.isFinite(js) ? formatMoney(js, 2) : 'missing'}</td><td class="text-end">${Number.isFinite(diff) ? diff.toFixed(6) : '—'}</td><td class="${pass ? 'validation-pass' : 'validation-fail'}">${pass ? '✓ Matched' : '✕ Review'}</td></tr>`;
    }).join('');
    el('validationMemberStatus').textContent = memberPass ? '✓ Matched' : '✕ Review';
    el('validationMemberStatus').className = `h5 mb-0 ${memberPass ? 'validation-pass' : 'validation-fail'}`;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
        else if (ch === '"') quoted = false;
        else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
      else field += ch;
    }
    if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
    const nonBlank = rows.filter(r => r.some(v => String(v).trim() !== ''));
    if (nonBlank.length < 2) return [];
    const headers = nonBlank[0].map(h => h.trim().toLowerCase());
    return nonBlank.slice(1).map(r => Object.fromEntries(headers.map((h, idx) => [h, r[idx] ?? '']))).map(E.normaliseMember);
  }

  function toCsv(rows, headers) {
    const quote = v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers.join(','), ...rows.map(r => headers.map(h => quote(r[h])).join(','))].join('\n');
  }

  function downloadBlob(filename, text, type = 'text/csv;charset=utf-8') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportResults() {
    if (!scheme) return;
    const headers = ['member_id','status','age','service','pensionable_salary','current_pension','years_to_retirement','projected_salary','projected_service','annual_pension_at_retirement','survival_to_retirement','annuity_factor','spouse_loading','discount_factor_to_retirement','liability'];
    downloadBlob('PenSol_member_results.csv', toCsv(scheme.results, headers));
  }

  function downloadSample() {
    const headers = ['member_id','status','age','service','pensionable_salary','current_pension'];
    downloadBlob('PenSol_sample_members.csv', toCsv(SAMPLE, headers));
  }

  function bindEvents() {
    document.querySelectorAll('#viewNav [data-view]').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
    el('runValuationBtn').addEventListener('click', () => { assumptions = readAssumptionsFromForm(); runValuation(); showView('dashboardView'); });
    el('loadSampleBtn').addEventListener('click', () => { members = SAMPLE.map(x => ({ ...x })); dataSource = 'Synthetic sample scheme'; assumptions = { ...DEFAULTS }; setFormFromAssumptions(); runValuation(); });
    el('assumptionsForm').addEventListener('submit', ev => { ev.preventDefault(); assumptions = readAssumptionsFromForm(); runValuation(); showView('dashboardView'); });
    el('resetAssumptionsBtn').addEventListener('click', () => { assumptions = { ...DEFAULTS }; setFormFromAssumptions(); runValuation(); });
    el('rerunSensitivitiesBtn').addEventListener('click', runSensitivitySet);
    el('memberSearch').addEventListener('input', () => { currentPage = 1; renderMembers(); });
    el('statusFilter').addEventListener('change', () => { currentPage = 1; renderMembers(); });
    el('prevPageBtn').addEventListener('click', () => { if (currentPage > 1) { currentPage -= 1; renderMembers(); } });
    el('nextPageBtn').addEventListener('click', () => { currentPage += 1; renderMembers(); });
    el('printBtn').addEventListener('click', () => window.print());
    el('exportResultsBtn').addEventListener('click', exportResults);
    el('downloadSampleBtn').addEventListener('click', downloadSample);
    el('csvUpload').addEventListener('change', ev => {
      const file = ev.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = parseCsv(String(reader.result || ''));
        if (!parsed.length) { alert('No member rows could be read. Check the CSV headers and format.'); return; }
        members = parsed;
        dataSource = `Uploaded CSV: ${file.name}`;
        runValuation();
        showView('dashboardView');
      };
      reader.readAsText(file);
      ev.target.value = '';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setFormFromAssumptions();
    bindEvents();
    runValuation();
  });
})();
