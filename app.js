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

function getCat(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[7];
}

function setGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting-text').textContent = greet;
}

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('form-date').value = today;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 2200);
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

function renderAll() {
  renderDashboard();
  renderExpenses();
}

// ── DASHBOARD ──
function renderDashboard() {
  // update name
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

  // budget bar
  const bud = settings.budget || 0;
  document.getElementById('budget-label').textContent = `Budget: ${fmt(bud)}`;
  const pct = bud > 0 ? Math.min(100, (total / bud) * 100) : 0;
  document.getElementById('balance-bar').style.width = pct + '%';

  // category chips
  const bycat = {};
  thisMonth.forEach(e => {
    bycat[e.category] = (bycat[e.category] || 0) + e.amount;
  });

  const chipsEl = document.getElementById('category-chips');
  chipsEl.innerHTML = '';
  if (Object.keys(bycat).length === 0) {
    chipsEl.innerHTML = '<span style="color:var(--text2);font-size:13px;padding:12px 0">No spending this month yet</span>';
  } else {
    CATEGORIES.filter(c => bycat[c.id]).forEach(cat => {
      const chip = document.createElement('div');
      chip.className = 'cat-chip';
      chip.innerHTML = `
        <span class="cat-chip-icon">${cat.emoji}</span>
        <span class="cat-chip-name">${cat.name}</span>
        <span class="cat-chip-amt" style="color:${cat.color}">${fmt(bycat[cat.id])}</span>
      `;
      chipsEl.appendChild(chip);
    });
  }

  // recent list
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
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      return key === monthFilter;
    });
  }
  if (catFilter !== 'all') {
    filtered = filtered.filter(e => e.category === catFilter);
  }

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
    const item = document.createElement('div');
    item.className = 'tx-item';
    item.innerHTML = `
      <div class="tx-icon" style="background:${cat.color}22">${cat.emoji}</div>
      <div class="tx-info">
        <div class="tx-desc">${exp.desc || cat.name}</div>
        <div class="tx-meta">${cat.name} · ${dateStr}</div>
      </div>
      <div class="tx-amount" style="color:${cat.color}">${fmt(exp.amount)}</div>
    `;
    item.addEventListener('click', () => openEditModal(exp.id));
    el.appendChild(item);
  });
}

// ── CATEGORY GRID IN MODAL ──
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
  editingId = null;
  selectedCat = 'food';
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
  editingId = id;
  selectedCat = exp.category;
  document.getElementById('modal-title').textContent = 'Edit Expense';
  document.getElementById('btn-save-expense').textContent = 'Save Changes';
  document.getElementById('form-amount').value = exp.amount;
  document.getElementById('form-desc').value = exp.desc || '';
  document.getElementById('form-notes').value = exp.notes || '';
  document.getElementById('form-date').value = exp.date;
  buildCategoryGrid();
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function saveExpense() {
  const amount = parseFloat(document.getElementById('form-amount').value);
  const desc = document.getElementById('form-desc').value.trim();
  const date = document.getElementById('form-date').value;
  const notes = document.getElementById('form-notes').value.trim();

  if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
  if (!date) { showToast('Pick a date'); return; }

  if (editingId) {
    const idx = expenses.findIndex(e => e.id === editingId);
    if (idx > -1) {
      expenses[idx] = { ...expenses[idx], amount, desc, category: selectedCat, date, notes };
      showToast('Expense updated ✓');
    }
  } else {
    expenses.push({ id: genId(), amount, desc, category: selectedCat, date, notes, createdAt: Date.now() });
    showToast('Expense added ✓');
  }

  saveData();
  closeModal();
  renderAll();
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
  const label = new Date(analyticsYear, analyticsMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  document.getElementById('analytics-month-label').textContent = label;

  const monthExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === analyticsMonth && d.getFullYear() === analyticsYear;
  });

  const total = monthExp.reduce((s, e) => s + e.amount, 0);
  document.getElementById('analytics-total').textContent = fmt(total);

  // Donut chart
  const bycat = {};
  monthExp.forEach(e => { bycat[e.category] = (bycat[e.category] || 0) + e.amount; });
  drawDonut(bycat, total);
  drawLegend(bycat, total);
  drawBar(monthExp);
}

function drawDonut(bycat, total) {
  const canvas = document.getElementById('donut-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (total === 0) {
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.arc(W/2, H/2, 80, 0, Math.PI * 2);
    ctx.stroke();
    document.getElementById('donut-label').textContent = 'No data';
    return;
  }

  let start = -Math.PI / 2;
  const cats = Object.entries(bycat).sort((a, b) => b[1] - a[1]);

  cats.forEach(([catId, amt]) => {
    const cat = getCat(catId);
    const angle = (amt / total) * Math.PI * 2;
    ctx.strokeStyle = cat.color;
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(W/2, H/2, 80, start + 0.04, start + angle - 0.04);
    ctx.stroke();
    start += angle;
  });

  const top = cats[0];
  const topCat = getCat(top[0]);
  document.getElementById('donut-label').innerHTML =
    `${topCat.emoji}<br>${topCat.name}<br><strong>${Math.round((top[1]/total)*100)}%</strong>`;
}

function drawLegend(bycat, total) {
  const el = document.getElementById('legend');
  el.innerHTML = '';
  CATEGORIES.filter(c => bycat[c.id]).forEach(cat => {
    const pct = total > 0 ? Math.round((bycat[cat.id] / total) * 100) : 0;
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <div class="legend-dot" style="background:${cat.color}"></div>
      <span>${cat.emoji} ${cat.name}</span>
      <span style="color:var(--text2);font-family:var(--font-mono);margin-left:auto">${pct}%</span>
    `;
    el.appendChild(item);
  });
}

function drawBar(monthExp) {
  const canvas = document.getElementById('bar-canvas');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth || 340;
  canvas.width = W * dpr;
  canvas.height = 160 * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = '160px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, 160);

  const daysInMonth = new Date(analyticsYear, analyticsMonth + 1, 0).getDate();
  const daily = Array(daysInMonth).fill(0);
  monthExp.forEach(e => {
    const day = new Date(e.date).getDate();
    daily[day - 1] += e.amount;
  });

  const max = Math.max(...daily, 1);
  const barW = Math.max(4, (W - 32) / daysInMonth - 3);
  const padLeft = 16;

  daily.forEach((val, i) => {
    const barH = Math.max(2, (val / max) * 120);
    const x = padLeft + i * ((W - 32) / daysInMonth);
    const y = 140 - barH;
    const alpha = val > 0 ? 1 : 0.15;
    ctx.fillStyle = val > 0 ? '#C8FF00' : '#2a2a2a';
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // x labels (1, 10, 20, last)
  ctx.fillStyle = '#555';
  ctx.font = `10px 'DM Mono', monospace`;
  ctx.textAlign = 'center';
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
  saveData();
  renderAll();
  showToast('Settings saved ✓');
}

function exportCSV() {
  if (expenses.length === 0) { showToast('No expenses to export'); return; }
  const rows = [['Date', 'Description', 'Category', 'Amount', 'Notes']];
  expenses.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(e => {
    rows.push([e.date, e.desc || '', getCat(e.category).name, e.amount, e.notes || '']);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `spendwise_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('CSV exported ✓');
}

function clearAllData() {
  if (!confirm('Delete all expenses? This cannot be undone.')) return;
  expenses = [];
  saveData();
  renderAll();
  renderExpenses();
  showToast('All data cleared');
}
