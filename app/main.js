"use strict";

const CATEGORIES = ["Groceries", "Housing", "Transport", "Utilities", "Dining", "Health", "Fun", "Salary", "Other"];
const COLORS = {
  Groceries: "#0f766e", Housing: "#2563eb", Transport: "#7c3aed", Utilities: "#d97706",
  Dining: "#db2777", Health: "#0891b2", Fun: "#65a30d", Salary: "#15803d", Other: "#64748b"
};
const BUDGETS = { Groceries: 600, Housing: 1400, Transport: 250, Utilities: 220, Dining: 200, Health: 150, Fun: 150 };
const KEY = "hearthbudget.tx.v1";

const fmt = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const $ = id => document.getElementById(id);

function seed() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  // Build the date string from local parts: toISOString() would shift
  // day 1 into the previous month for timezones ahead of UTC.
  const d = day => `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return [
    { id: 1, date: d(1), desc: "Monthly salary", cat: "Salary", type: "income", amount: 4200 },
    { id: 2, date: d(2), desc: "Rent", cat: "Housing", type: "expense", amount: 1350 },
    { id: 3, date: d(3), desc: "Weekly groceries", cat: "Groceries", type: "expense", amount: 142.35 },
    { id: 4, date: d(5), desc: "Electricity bill", cat: "Utilities", type: "expense", amount: 96.20 },
    { id: 5, date: d(6), desc: "Fuel", cat: "Transport", type: "expense", amount: 58.40 },
    { id: 6, date: d(8), desc: "Dinner out", cat: "Dining", type: "expense", amount: 64.00 },
    { id: 7, date: d(10), desc: "Groceries top-up", cat: "Groceries", type: "expense", amount: 87.15 },
    { id: 8, date: d(12), desc: "Pharmacy", cat: "Health", type: "expense", amount: 23.90 },
    { id: 9, date: d(14), desc: "Streaming + games", cat: "Fun", type: "expense", amount: 41.98 },
    { id: 10, date: d(15), desc: "Freelance payout", cat: "Other", type: "income", amount: 350 }
  ];
}

let txs;
try { txs = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { txs = null; }
if (!Array.isArray(txs)) { txs = seed(); save(); }

let view = new Date(); view.setDate(1);

function save() { localStorage.setItem(KEY, JSON.stringify(txs)); }

function monthTxs() {
  const y = view.getFullYear(), m = view.getMonth();
  return txs.filter(t => { const dt = new Date(t.date + "T00:00:00"); return dt.getFullYear() === y && dt.getMonth() === m; })
            .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function render() {
  $("month-label").textContent = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const list = monthTxs();
  const income = list.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = list.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  $("sum-income").textContent = fmt(income);
  $("sum-expense").textContent = fmt(expense);
  $("sum-balance").textContent = fmt(income - expense);
  $("sum-rate").textContent = income > 0 ? Math.max(0, ((income - expense) / income) * 100).toFixed(1) + "%" : "–";

  const byCat = {};
  list.filter(t => t.type === "expense").forEach(t => { byCat[t.cat] = (byCat[t.cat] || 0) + t.amount; });
  drawDonut(byCat, expense);
  renderBudgets(byCat);
  renderTable(list);
}

function drawDonut(byCat, total) {
  const cv = $("donut"), ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, cv.width, cv.height);
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const cx = 130, cy = 130, r = 105, w = 42;
  if (!entries.length || total <= 0) {
    ctx.beginPath(); ctx.strokeStyle = "#e3e9ef"; ctx.lineWidth = w;
    ctx.arc(cx, cy, r - w / 2, 0, Math.PI * 2); ctx.stroke();
  } else {
    let a = -Math.PI / 2;
    entries.forEach(([cat, val]) => {
      const sweep = (val / total) * Math.PI * 2;
      ctx.beginPath(); ctx.strokeStyle = COLORS[cat] || "#64748b"; ctx.lineWidth = w;
      ctx.arc(cx, cy, r - w / 2, a, a + sweep); ctx.stroke();
      a += sweep;
    });
  }
  ctx.fillStyle = "#1c2733"; ctx.font = "700 22px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(fmt(total), cx, cy + 2);
  ctx.fillStyle = "#6b7a89"; ctx.font = "12px sans-serif";
  ctx.fillText("spent", cx, cy + 20);

  $("legend").innerHTML = entries.map(([cat, val]) =>
    `<li><span class="dot" style="background:${COLORS[cat] || "#64748b"}"></span>${cat} <b>${fmt(val)}</b> (${((val / total) * 100).toFixed(0)}%)</li>`
  ).join("") || "<li>No expenses yet</li>";
}

function renderBudgets(byCat) {
  $("budgets").innerHTML = Object.entries(BUDGETS).map(([cat, cap]) => {
    const spent = byCat[cat] || 0;
    const pct = Math.min(100, (spent / cap) * 100);
    const cls = spent > cap ? "over" : pct > 80 ? "near" : "";
    return `<div class="budget-row">
      <div class="row-top"><b>${cat}</b><span>${fmt(spent)} of ${fmt(cap)}</span></div>
      <div class="bar"><div class="${cls}" style="width:${pct}%"></div></div>
    </div>`;
  }).join("");
}

function renderTable(list) {
  $("tx-empty").classList.toggle("hidden", list.length > 0);
  const rows = list.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${escapeHtml(t.desc)}</td>
      <td><span class="chip">${t.cat}</span></td>
      <td class="num ${t.type === "income" ? "pos" : "neg"}">${t.type === "income" ? "+" : "−"}${fmt(t.amount)}</td>
      <td><button class="del" data-id="${t.id}" title="Delete">×</button></td>
    </tr>`).join("");
  // A running total row closes the table so the month reads at a glance.
  const net = list.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
  const totalRow = list.length ? `
    <tr class="total-row">
      <td colspan="3">Net for the month</td>
      <td class="num ${net >= 0 ? "pos" : "neg"}">${net >= 0 ? "+" : "−"}${fmt(Math.abs(net))}</td>
      <td></td>
    </tr>` : "";
  $("tx-body").innerHTML = rows + totalRow;
  document.querySelectorAll(".del").forEach(b => b.addEventListener("click", () => {
    txs = txs.filter(t => t.id !== Number(b.dataset.id)); save(); render();
  }));
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

$("f-category").innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join("");
$("f-date").value = new Date().toISOString().slice(0, 10);
$("prev-month").addEventListener("click", () => { view.setMonth(view.getMonth() - 1); render(); });
$("next-month").addEventListener("click", () => { view.setMonth(view.getMonth() + 1); render(); });
$("add-btn").addEventListener("click", () => $("tx-form").classList.toggle("hidden"));
$("f-cancel").addEventListener("click", () => $("tx-form").classList.add("hidden"));
$("tx-form").addEventListener("submit", e => {
  e.preventDefault();
  txs.push({
    id: Date.now(),
    date: $("f-date").value,
    desc: $("f-desc").value.trim(),
    cat: $("f-category").value,
    type: $("f-type").value,
    amount: Math.abs(Number($("f-amount").value))
  });
  save(); render();
  e.target.reset();
  $("f-date").value = new Date().toISOString().slice(0, 10);
  $("tx-form").classList.add("hidden");
});

render();
