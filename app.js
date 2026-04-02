/* ── SPENDWISE APP.JS ── */

// ── CATEGORIES ──
const CATEGORIES = [
  { id: 'food',      emoji: '🍽️', name: 'Food',      color: '#C8FF00' },
  { id: 'transport', emoji: '🚗', name: 'Transport',  color: '#FF6B35' },
  { id: 'shopping',  emoji: '🛍️', name: 'Shopping',  color: '#00D4FF' },
  { id: 'bills',     emoji: '⚡', name: 'Bills',      color: '#FF3CAC' },
  { id: 'health',    emoji: '💊', name: 'Health',     color: '#FFD700' },
  { id: 'entertain', emoji: '🎬', name: 'Fun',        color: '#7B61FF' },
  { id: 'travel',    emoji: '✈️', name: 'Travel',    color: '#00E5A0' },
  { id: 'other',     emoji: '📦', name: 'Other',      color: '#FF8A65' },
];

// ── STATE ──
let expenses = [];
let settings = { name: 'Varghese', budget: 50000, currency: '₹' };
let editingId = null;
let selectedCat = 'food';
let analyticsMonth = new Date().getMonth();
let analyticsYear = new Date().getFullYear();
let currentView = 'dashboard';

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  buildCategoryGrid();
  buildFilterDropdowns();
  setGreeting();
  loadSettingsForm();
  setTodayDate();

  setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    renderAll();
  }, 1500);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

// ── DATA PERSISTENCE ──
function loadData() {
  try {
    const e = localStorage.getItem('spendwise_expenses');
    const s = localStorage.getItem('spendwise_settings');
    if (e) expenses = JSON.parse(e);
    if (s) settings = { ...settings, ...JSON.parse(s) };
  } catch {}
}

function saveData() {
  localStorage.setItem('spendwise_expenses', JSON.stringify(expenses));
  localStorage.setItem('spendwise_settings', JSON.stringify(settings));
}

// ── HELPERS ──
function fmt(n) {
  return settings.currency + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function getCat(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[7]; }
function setGreeting() {
  const h = new Date().getHours();
  document.getElementById('greeting-text').textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function setTodayDate() {
  document.getElementById('form-date').value = new Date().toISOString().split('T')[0];
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function showToast(msg, dur = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), dur);
}

// ── VIEWS ──
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  currentView = view;
  if (view === 'analytics') renderAnalytics();
  if (view === 'expenses') renderExpenses();
  if (view === 'dashboard') renderDashboard();
  if (view === 'settings') loadSettingsForm();
}
function renderAll() { renderDashboard(); renderExpenses(); }

// ── DASHBOARD ──
function renderDashboard() {
  document.getElementById('user-display-name').textContent = settings.name.split(' ')[0];
  document.getElementById('avatar-circle').textContent = (settings.name[0] || 'U').toUpperCase();
  const now = new Date();
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const total = thisMonth.reduce((s, e) => s + e.amount, 0);
  document.getElementById('total-month').textContent = fmt(total);
  document.getElementById('dash-count').textContent = `${thisMonth.length} transaction${thisMonth.length !== 1 ? 's' : ''}`;
  const bud = settings.budget || 0;
  document.getElementById('budget-label').textContent = `Budget: ${fmt(bud)}`;
  const pct = bud > 0 ? Math.min(100, (total / bud) * 100) : 0;
  document.getElementById('balance-bar').style.width = pct + '%';

  const bycat = {};
  thisMonth.forEach(e => { bycat[e.category] = (bycat[e.category] || 0) + e.amount; });
  const chipsEl = document.getElementById('category-chips');
  chipsEl.innerHTML = '';
  if (Object.keys(bycat).length === 0) {
    chipsEl.innerHTML = '<span style="color:var(--text2);font-size:13px;padding:12px 0">No spending this month yet</span>';
  } else {
    CATEGORIES.filter(c => bycat[c.id]).forEach(cat => {
      const chip = document.createElement('div');
      chip.className = 'cat-chip';
      chip.innerHTML = `<span class="cat-chip-icon">${cat.emoji}</span><span class="cat-chip-name">${cat.name}</span><span class="cat-chip-amt" style="color:${cat.color}">${fmt(bycat[cat.id])}</span>`;
      chipsEl.appendChild(chip);
    });
  }
  const recent = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  renderTxList('recent-list', recent);
}

// ── EXPENSES VIEW ──
function buildFilterDropdowns() {
  const catSel = document.getElementById('filter-cat');
  CATEGORIES.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.emoji + ' ' + c.name;
    catSel.appendChild(o);
  });
}
function updateMonthFilter() {
  const sel = document.getElementById('filter-month');
  const months = new Set();
  expenses.forEach(e => {
    const d = new Date(e.date);
    months.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  });
  const current = sel.value;
  sel.innerHTML = '<option value="all">All Time</option>';
  [...months].sort().reverse().forEach(m => {
    const [y, mo] = m.split('-');
    const label = new Date(y, mo-1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const o = document.createElement('option');
    o.value = m; o.textContent = label;
    if (m === current) o.selected = true;
    sel.appendChild(o);
  });
}
function renderExpenses() {
  updateMonthFilter();
  const monthFilter = document.getElementById('filter-month').value;
  const catFilter = document.getElementById('filter-cat').value;
  let filtered = [...expenses];
  if (monthFilter !== 'all') {
    filtered = filtered.filter(e => {
      const d = new Date(e.date);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === monthFilter;
    });
  }
  if (catFilter !== 'all') filtered = filtered.filter(e => e.category === catFilter);
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  renderTxList('expense-list', filtered);
  const empty = document.getElementById('expense-empty');
  filtered.length === 0 ? empty.classList.remove('hidden') : empty.classList.add('hidden');
}

// ── TX RENDERER ──
function renderTxList(elId, list) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  if (list.length === 0 && elId === 'recent-list') {
    el.innerHTML = '<div style="color:var(--text2);font-size:13px;padding:8px 0">No recent transactions</div>';
    return;
  }
  list.forEach(exp => {
    const cat = getCat(exp.category);
    const d = new Date(exp.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const needsCheck = exp.notes && exp.notes.includes('cross-check');
    const item = document.createElement('div');
    item.className = 'tx-item';
    item.innerHTML = `
      <div class="tx-icon" style="background:${cat.color}22">${cat.emoji}</div>
      <div class="tx-info">
        <div class="tx-desc">${exp.desc || cat.name} ${needsCheck ? '<span class="check-badge">⚠ check</span>' : ''}</div>
        <div class="tx-meta">${cat.name} · ${dateStr}</div>
      </div>
      <div class="tx-amount" style="color:${cat.color}">${fmt(exp.amount)}</div>
    `;
    item.addEventListener('click', () => openEditModal(exp.id));
    el.appendChild(item);
  });
}

// ── CATEGORY GRID ──
function buildCategoryGrid() {
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (cat.id === selectedCat ? ' selected' : '');
    btn.innerHTML = `<span>${cat.emoji}</span><span>${cat.name}</span>`;
    btn.onclick = () => {
      selectedCat = cat.id;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
    grid.appendChild(btn);
  });
}

// ── MODAL ──
function openModal() {
  editingId = null; selectedCat = 'food';
  document.getElementById('modal-title').textContent = 'Add Expense';
  document.getElementById('btn-save-expense').textContent = 'Add Expense';
  document.getElementById('form-amount').value = '';
  document.getElementById('form-desc').value = '';
  document.getElementById('form-notes').value = '';
  setTodayDate();
  buildCategoryGrid();
  document.getElementById('modal-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('form-amount').focus(), 400);
}
function openEditModal(id) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;
  editingId = id; selectedCat = exp.category;
  document.getElementById('modal-title').textContent = 'Edit Expense';
  document.getElementById('btn-save-expense').textContent = 'Save Changes';
  document.getElementById('form-amount').value = exp.amount;
  document.getElementById('form-desc').value = exp.desc || '';
  document.getElementById('form-notes').value = exp.notes || '';
  document.getElementById('form-date').value = exp.date;
  buildCategoryGrid();
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }
function closeModalOutside(e) { if (e.target === document.getElementById('modal-overlay')) closeModal(); }
function saveExpense() {
  const amount = parseFloat(document.getElementById('form-amount').value);
  const desc = document.getElementById('form-desc').value.trim();
  const date = document.getElementById('form-date').value;
  const notes = document.getElementById('form-notes').value.trim();
  if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
  if (!date) { showToast('Pick a date'); return; }
  if (editingId) {
    const idx = expenses.findIndex(e => e.id === editingId);
    if (idx > -1) { expenses[idx] = { ...expenses[idx], amount, desc, category: selectedCat, date, notes }; showToast('Expense updated ✓'); }
  } else {
    expenses.push({ id: genId(), amount, desc, category: selectedCat, date, notes, createdAt: Date.now() });
    showToast('Expense added ✓');
  }
  saveData(); closeModal(); renderAll();
  if (currentView === 'expenses') renderExpenses();
}

// ── ANALYTICS ──
function changeAnalyticsMonth(delta) {
  analyticsMonth += delta;
  if (analyticsMonth > 11) { analyticsMonth = 0; analyticsYear++; }
  if (analyticsMonth < 0) { analyticsMonth = 11; analyticsYear--; }
  renderAnalytics();
}
function renderAnalytics() {
  document.getElementById('analytics-month-label').textContent =
    new Date(analyticsYear, analyticsMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const monthExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === analyticsMonth && d.getFullYear() === analyticsYear;
  });
  const total = monthExp.reduce((s, e) => s + e.amount, 0);
  document.getElementById('analytics-total').textContent = fmt(total);
  const bycat = {};
  monthExp.forEach(e => { bycat[e.category] = (bycat[e.category] || 0) + e.amount; });
  drawDonut(bycat, total); drawLegend(bycat, total); drawBar(monthExp);
}
function drawDonut(bycat, total) {
  const canvas = document.getElementById('donut-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (total === 0) {
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 28;
    ctx.beginPath(); ctx.arc(W/2, H/2, 80, 0, Math.PI * 2); ctx.stroke();
    document.getElementById('donut-label').textContent = 'No data'; return;
  }
  let start = -Math.PI / 2;
  const cats = Object.entries(bycat).sort((a, b) => b[1] - a[1]);
  cats.forEach(([catId, amt]) => {
    const cat = getCat(catId);
    const angle = (amt / total) * Math.PI * 2;
    ctx.strokeStyle = cat.color; ctx.lineWidth = 28; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(W/2, H/2, 80, start + 0.04, start + angle - 0.04); ctx.stroke();
    start += angle;
  });
  const top = cats[0]; const topCat = getCat(top[0]);
  document.getElementById('donut-label').innerHTML = `${topCat.emoji}<br>${topCat.name}<br><strong>${Math.round((top[1]/total)*100)}%</strong>`;
}
function drawLegend(bycat, total) {
  const el = document.getElementById('legend'); el.innerHTML = '';
  CATEGORIES.filter(c => bycat[c.id]).forEach(cat => {
    const pct = total > 0 ? Math.round((bycat[cat.id] / total) * 100) : 0;
    const item = document.createElement('div'); item.className = 'legend-item';
    item.innerHTML = `<div class="legend-dot" style="background:${cat.color}"></div><span>${cat.emoji} ${cat.name}</span><span style="color:var(--text2);font-family:var(--font-mono);margin-left:auto">${pct}%</span>`;
    el.appendChild(item);
  });
}
function drawBar(monthExp) {
  const canvas = document.getElementById('bar-canvas');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth || 340;
  canvas.width = W * dpr; canvas.height = 160 * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = '160px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, 160);
  const daysInMonth = new Date(analyticsYear, analyticsMonth + 1, 0).getDate();
  const daily = Array(daysInMonth).fill(0);
  monthExp.forEach(e => { const day = new Date(e.date).getDate(); daily[day - 1] += e.amount; });
  const max = Math.max(...daily, 1);
  const barW = Math.max(4, (W - 32) / daysInMonth - 3);
  const padLeft = 16;
  daily.forEach((val, i) => {
    const barH = Math.max(2, (val / max) * 120);
    const x = padLeft + i * ((W - 32) / daysInMonth);
    const y = 140 - barH;
    ctx.fillStyle = val > 0 ? '#C8FF00' : '#2a2a2a';
    ctx.globalAlpha = val > 0 ? 1 : 0.15;
    ctx.beginPath(); ctx.roundRect(x, y, barW, barH, 3); ctx.fill(); ctx.globalAlpha = 1;
  });
  ctx.fillStyle = '#555'; ctx.font = `10px 'DM Mono', monospace`; ctx.textAlign = 'center';
  [1, 10, 20, daysInMonth].forEach(d => {
    const x = padLeft + (d-1) * ((W - 32) / daysInMonth) + barW/2;
    ctx.fillText(d, x, 158);
  });
}

// ── SETTINGS ──
function loadSettingsForm() {
  document.getElementById('settings-name').value = settings.name;
  document.getElementById('settings-budget').value = settings.budget;
  document.getElementById('settings-currency').value = settings.currency;
}
function saveSettings() {
  settings.name = document.getElementById('settings-name').value.trim() || 'User';
  settings.budget = parseFloat(document.getElementById('settings-budget').value) || 0;
  settings.currency = document.getElementById('settings-currency').value.trim() || '₹';
  saveData(); renderAll(); showToast('Settings saved ✓');
}

// ── EXPORT CSV ──
function exportCSV() {
  if (expenses.length === 0) { showToast('No expenses to export'); return; }
  const rows = [['Date', 'Description', 'Category', 'Amount', 'Notes']];
  [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(e => {
    rows.push([e.date, e.desc || '', getCat(e.category).name, e.amount, e.notes || '']);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `spendwise_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); showToast('CSV exported ✓');
}

// ── EXPORT JSON BACKUP ──
function exportBackup() {
  const data = { expenses, settings, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `spendwise_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click(); showToast('Backup downloaded ✓');
}

// ── IMPORT JSON BACKUP ──
function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.expenses) { showToast('Invalid backup file'); return; }
      if (!confirm(`Import ${data.expenses.length} expenses? This will REPLACE all current data.`)) return;
      expenses = data.expenses;
      if (data.settings) settings = { ...settings, ...data.settings };
      saveData(); renderAll(); loadSettingsForm();
      showToast(`Imported ${expenses.length} expenses ✓`);
    } catch { showToast('Could not read file'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ── IMPORT CSV ──
function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const lines = ev.target.result.split('\n').filter(l => l.trim());
      if (lines.length < 2) { showToast('CSV appears empty'); return; }
      const header = lines[0].toLowerCase();
      if (!header.includes('date') || !header.includes('amount')) {
        showToast('CSV must have Date and Amount columns'); return;
      }
      // parse header to find column indices
      const cols = parseCSVLine(lines[0]).map(c => c.toLowerCase().trim());
      const iDate = cols.findIndex(c => c.includes('date'));
      const iDesc = cols.findIndex(c => c.includes('desc') || c.includes('name') || c.includes('detail'));
      const iAmt  = cols.findIndex(c => c.includes('amount') || c.includes('amt'));
      const iCat  = cols.findIndex(c => c.includes('cat'));
      const iNote = cols.findIndex(c => c.includes('note'));

      let added = 0, skipped = 0;
      lines.slice(1).forEach(line => {
        if (!line.trim()) return;
        const parts = parseCSVLine(line);
        const rawDate = parts[iDate] || '';
        const rawAmt  = parts[iAmt]  || '';
        const rawDesc = iDesc >= 0 ? (parts[iDesc] || '') : '';
        const rawCat  = iCat  >= 0 ? (parts[iCat]  || '') : '';
        const rawNote = iNote >= 0 ? (parts[iNote]  || '') : '';

        const amount = parseFloat(rawAmt.replace(/[^0-9.]/g, ''));
        const date   = normaliseDate(rawDate);
        if (!date || isNaN(amount) || amount <= 0) { skipped++; return; }

        const category = mapCategoryName(rawCat) || classifyByName(rawDesc, amount);
        expenses.push({ id: genId(), amount, desc: rawDesc, category, date, notes: rawNote, createdAt: Date.now() });
        added++;
      });
      saveData(); renderAll();
      showToast(`Imported ${added} rows${skipped ? `, skipped ${skipped}` : ''} ✓`);
    } catch(err) { showToast('Could not parse CSV'); console.error(err); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function parseCSVLine(line) {
  const result = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function normaliseDate(raw) {
  raw = raw.replace(/"/g, '').trim();
  // try yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // try dd/mm/yyyy or dd-mm-yyyy
  const m1 = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  // try mm/dd/yyyy
  const m2 = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) { const d = new Date(raw); if (!isNaN(d)) return d.toISOString().split('T')[0]; }
  // generic parse
  const d = new Date(raw);
  if (!isNaN(d)) return d.toISOString().split('T')[0];
  return null;
}

function mapCategoryName(name) {
  name = (name || '').toLowerCase();
  if (!name) return null;
  if (name.includes('food') || name.includes('restaur') || name.includes('cafe') || name.includes('eat')) return 'food';
  if (name.includes('transport') || name.includes('travel') || name.includes('cab') || name.includes('metro') || name.includes('train') || name.includes('bus') || name.includes('flight')) return 'transport';
  if (name.includes('shop') || name.includes('market') || name.includes('store')) return 'shopping';
  if (name.includes('bill') || name.includes('electric') || name.includes('util') || name.includes('insur')) return 'bills';
  if (name.includes('health') || name.includes('med') || name.includes('pharma') || name.includes('doctor')) return 'health';
  if (name.includes('entertain') || name.includes('fun') || name.includes('movie') || name.includes('netflix')) return 'entertain';
  return null;
}

// ──────────────────────────────────────────────
// GPAY PDF TEXT IMPORT — Auto-classifier
// Tested against real Varkey GPay PDF (March 2026)
// ──────────────────────────────────────────────

const MON_MAP = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                  jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };

// Classification rules — specific before generic, all lowercase
const CLASSIFY_RULES = [
  // Transport — specific apps & services first
  { cat: 'transport', kw: ['indian railways', 'railways uts', 'msrtc', 'roppen transportation',
      'mumbai metro', 'metro one', 'adani airport', 'sahar parking', 'ss multiservices',
      'rapido', 'uber', 'ola cab', 'toll', 'petrol', 'fuel', 'service station',
      'motor store', 'motor stores', 'parking'] },
  // Bills — insurance, utilities, finance
  { cat: 'bills', kw: ['adani electricity', 'hdfc ergo', 'care health insurance',
      'bajaj life insurance', 'insurance', 'zerodha', 'sbi atm cash withdrawal',
      'atm cash', 'india1 payments', 'animesh kumar'] },
  // Health
  { cat: 'health', kw: ['wellness forever', 'pharmacy', 'medical', 'hospital',
      'clinic', 'doctor', 'chemist', 'medicine'] },
  // Food — restaurants, cafes, canteen, bars
  { cat: 'food', kw: ['compass india food', 'the adda', 'swagat restaurant',
      'swagat enterprise', 'hotel prithviraj', 'victory restaurant', 'district dining',
      'doolally', 'bharat cafe', 'cafe 2', 'semolina kitchen', 'n r wines',
      'restaurant', 'kitchen', 'cafe', 'hotel ', 'dining', 'food services',
      'wines', 'bar '] },
  // Shopping — supermarkets, stores, markets
  { cat: 'shopping', kw: ['sweety home super market', 'supermarket', 'super market',
      'kashyap corporations', 'apala bazar', 'bazar', 'market', 'store', 'mall',
      'enterprises'] },
  // Entertainment
  { cat: 'entertain', kw: ['starlit studio', 'studio', 'netflix', 'amazon prime',
      'hotstar', 'spotify', 'google play', 'cinema', 'movie', 'edunetwork'] },
  // Travel — intercity/flights
  { cat: 'travel', kw: ['air india', 'indigo', 'spicejet', 'makemytrip',
      'goibibo', 'oyo', 'hotel booking'] },
];

// Vehicle registration plate pattern → auto/cab payment
const PLATE_RE = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;

// Looks like a person's name (2–4 words, title-cased, no numbers)
function looksLikePersonName(name) {
  const honorifics = /^(mr|mrs|ms|dr|prof|sri|smt)\s/i;
  const n = name.replace(honorifics, '').trim();
  const words = n.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  // All words start with capital or are fully uppercase (like GPay stores them)
  return words.every(w => /^[A-Za-z]{2,}$/.test(w));
}

function classifyByName(name, amount) {
  const n = (name || '').toLowerCase().trim();

  // Vehicle plate → transport (auto rickshaw payment)
  if (PLATE_RE.test(name.trim().toUpperCase())) return 'transport';

  // Transport keywords — specific enough to avoid false matches
  const isTransport = ['mumbai metro', 'metro one', 'indian railways', 'railways uts',
    'msrtc', 'roppen', 'rapido', 'ola cab', 'uber', 'sahar parking',
    'ss multiservices', 'adani airport', 'service station', 'motor store',
    'toll', 'petrol', 'fuel'].some(k => n.includes(k));
  if (isTransport) return 'transport';

  // ≤ ₹20 with non-transport name → chai / small purchase → food
  if (amount <= 20) return 'food';

  // Check all rules
  for (const rule of CLASSIFY_RULES) {
    if (rule.kw.some(k => n.includes(k))) return rule.cat;
  }

  // Person name → likely personal transfer → cross-check
  if (looksLikePersonName(name)) return null;

  // Single-word ALL-CAPS names that are common vendors (laxman, sangeeta etc)
  // → small amounts treated as food/chai
  if (amount <= 100 && /^[A-Z\s]+$/.test(name.trim())) return 'food';

  return null; // → cross-check
}

function parseGPayText(rawText) {
  /*
   Real GPay PDF text structure (from actual statement):
   
   Each page starts with noise:
     "Transaction statement"
     "8547222360, varkey1999@gmail.com"
     "Note: This statement..."
     "Page X of Y"
     "Date & time Transaction details Amount"  ← table header
   
   Each transaction block:
     "01 Mar, 2026"          ← date (matches /^\d{1,2} \w+, \d{4}$/)
     "04:26 AM"              ← time (matches /^\d{1,2}:\d{2} (AM|PM)$/)
     "Paid to MERCHANT"      ← or "Received from" or "Top-up to UPI Lite"
     "UPI Transaction ID: XXXXXXXXX"
     "Paid by Federal Bank 4934"   ← bank line (variants below)
     "₹552"                  ← amount (starts with ₹)
   
   Bank line variants:
     "Paid by Federal Bank 4934"
     "Paid by State Bank of India 2212"
     "Paid by UPI Lite | State Bank of India 2212"
     "Paid by Federal Bank XX99 | RuPay credit card"
  */

  // Strip page headers — lines matching noise patterns
  const NOISE = [
    /^Transaction statement$/i,
    /^\d{10},\s*.+@.+$/,           // phone, email line
    /^Note: This statement/i,
    /^Page \d+ of \d+$/i,
    /^Date & time/i,
    /^Powered by/i,
    /^Any payments transactions/i,
    /^received\. Any payments/i,
    /^8547/,                        // phone number line
  ];

  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !NOISE.some(re => re.test(l)));

  const DATE_RE  = /^(\d{1,2})\s+(\w{3}),?\s+(\d{4})$/;
  const TIME_RE  = /^\d{1,2}:\d{2}\s+(AM|PM)$/i;
  const UPI_RE   = /^UPI Transaction ID:/i;
  const BANK_RE  = /^Paid by /i;
  const AMT_RE   = /^₹[\d,]+(\.\d+)?$/;

  const parsed = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Look for date
    const dm = line.match(DATE_RE);
    if (!dm) { i++; continue; }

    const day  = dm[1].padStart(2, '0');
    const mon  = MON_MAP[dm[2].toLowerCase()] || '01';
    const year = dm[3];
    const date = `${year}-${mon}-${day}`;
    i++;

    // Expect time next (skip if missing)
    if (i < lines.length && TIME_RE.test(lines[i])) i++;

    if (i >= lines.length) break;

    const txLine = lines[i]; i++;
    const txLower = txLine.toLowerCase();

    // Skip: Received from (income), Top-up to UPI Lite (internal)
    const skip = txLower.startsWith('received from') || txLower.startsWith('top-up to');
    if (skip) {
      // Advance past UPI ID, bank line, amount
      while (i < lines.length && !AMT_RE.test(lines[i]) && !DATE_RE.test(lines[i])) i++;
      if (i < lines.length && AMT_RE.test(lines[i])) i++; // consume amount
      continue;
    }

    if (!txLower.startsWith('paid to')) continue;

    const recipient = txLine.replace(/^paid to\s+/i, '').trim();

    // Advance past UPI ID line, bank line(s) to reach amount
    while (i < lines.length && !AMT_RE.test(lines[i]) && !DATE_RE.test(lines[i])) {
      i++;
    }

    if (i >= lines.length || !AMT_RE.test(lines[i])) continue;

    const amtStr = lines[i].replace(/[₹,]/g, '');
    i++;
    const amount = parseFloat(amtStr);
    if (isNaN(amount) || amount <= 0) continue;

    parsed.push({ date, name: recipient, amount });
  }

  return parsed;
}

function classifyGPayTransactions(txList) {
  return txList.map(tx => {
    const cat = classifyByName(tx.name, tx.amount);
    const needsCheck = !cat;
    return {
      id: genId(),
      amount: tx.amount,
      desc: tx.name,
      category: cat || 'other',
      date: tx.date,
      notes: needsCheck ? 'cross-check' : '',
      createdAt: Date.now(),
    };
  });
}

// ── GPAY PDF IMPORT ──
function importGPayPDF(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Use PDF.js from CDN loaded in HTML
  if (typeof pdfjsLib === 'undefined') {
    showToast('PDF library not loaded yet, try again');
    return;
  }

  showToast('Reading PDF…', 8000);

  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const typedArray = new Uint8Array(ev.target.result);
      const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
      let fullText = '';

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join('\n');
        fullText += pageText + '\n';
      }

      const txList = parseGPayText(fullText);
      if (txList.length === 0) {
        showToast('No transactions found in PDF. Ensure it is a GPay statement.');
        return;
      }

      const classified = classifyGPayTransactions(txList);
      const crossChecks = classified.filter(c => c.notes === 'cross-check').length;

      if (!confirm(`Found ${txList.length} expenses.\n${crossChecks} need cross-check.\n\nAdd to existing expenses?`)) return;

      // Deduplicate by date+amount+desc
      const existing = new Set(expenses.map(e => `${e.date}_${e.amount}_${e.desc}`));
      let added = 0;
      classified.forEach(tx => {
        const key = `${tx.date}_${tx.amount}_${tx.desc}`;
        if (!existing.has(key)) { expenses.push(tx); existing.add(key); added++; }
      });

      saveData(); renderAll();
      showToast(`Added ${added} transactions. ${crossChecks} flagged for review ✓`, 4000);
    } catch(err) {
      console.error(err);
      showToast('Error reading PDF. Try the text paste option.');
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
}

// ── GPAY TEXT PASTE IMPORT (fallback) ──
function openGPayTextModal() {
  document.getElementById('gpay-text-modal').classList.remove('hidden');
}
function closeGPayTextModal() {
  document.getElementById('gpay-text-modal').classList.add('hidden');
  document.getElementById('gpay-paste-area').value = '';
}
function processGPayText() {
  const text = document.getElementById('gpay-paste-area').value.trim();
  if (!text) { showToast('Paste your GPay statement text first'); return; }

  const txList = parseGPayText(text);
  if (txList.length === 0) { showToast('Could not find transactions. Check format.'); return; }

  const classified = classifyGPayTransactions(txList);
  const crossChecks = classified.filter(c => c.notes === 'cross-check').length;

  if (!confirm(`Found ${txList.length} expenses. ${crossChecks} need cross-check. Add them?`)) return;

  const existing = new Set(expenses.map(e => `${e.date}_${e.amount}_${e.desc}`));
  let added = 0;
  classified.forEach(tx => {
    const key = `${tx.date}_${tx.amount}_${tx.desc}`;
    if (!existing.has(key)) { expenses.push(tx); existing.add(key); added++; }
  });

  saveData(); renderAll(); closeGPayTextModal();
  showToast(`Added ${added} transactions. ${crossChecks} flagged ✓`, 4000);
}

// ── CLEAR DATA ──
function clearAllData() {
  if (!confirm('Delete all expenses? This cannot be undone.')) return;
  expenses = []; saveData(); renderAll(); renderExpenses();
  showToast('All data cleared');
}
