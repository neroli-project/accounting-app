// --- 1. データの管理（ローカルストレージからの読み込み） ---
// 保存データがなければサンプルを1件入れる
let journalEntries = JSON.parse(localStorage.getItem('haru_journal')) || [
  { id: 1, date: '2026-09-03', category: '事務用品費', amount: 500, credit: '事業主借', memo: 'ノートとペン' }
];

let editingId = null; // 編集中のデータID（新規のときはnull）

// --- 2. データの登録・更新処理 ---
function saveEntry() {
  const dateEl = document.getElementById('input-date');
  const categoryEl = document.getElementById('input-category');
  const amountEl = document.getElementById('input-amount');
  const creditEl = document.getElementById('input-credit');
  const memoEl = document.getElementById('input-memo');

  // 要素が存在するか確認
  if (!dateEl || !amountEl) {
    alert('画面の入力フォームが見つかりませんでした。HTMLを確認してね！');
    return;
  }

  const date = dateEl.value;
  const category = categoryEl.value;
  const amount = Number(amountEl.value);
  const credit = creditEl.value;
  const memo = memoEl.value;

  // 入力チェック（日付と1円以上の金額が必要）
  if (!date || !amount || amount <= 0) {
    alert('日付と金額を入力してね！');
    return;
  }

  if (editingId) {
    // 【編集の場合】既存データを上書き
    journalEntries = journalEntries.map(entry => {
      if (entry.id === editingId) {
        return { id: editingId, date, category, amount, credit, memo };
      }
      return entry;
    });
    editingId = null;
    document.getElementById('btn-save').innerText = '＋ 登録する';
  } else {
    // 【新規の場合】新しいデータを追加
    const newEntry = {
      id: Date.now(),
      date,
      category,
      amount,
      credit,
      memo
    };
    journalEntries.push(newEntry);
  }

  // 保存 & リセット & 再描画
  saveToStorage();
  resetForm();
  render();
}

// --- 3. 削除処理 ---
function deleteEntry(id) {
  if (confirm('この仕訳を消してもいい？')) {
    journalEntries = journalEntries.filter(entry => entry.id !== id);
    saveToStorage();
    render();
  }
}

// --- 4. 編集モード切り替え ---
function editEntry(id) {
  const entry = journalEntries.find(e => e.id === id);
  if (!entry) return;

  document.getElementById('input-date').value = entry.date;
  document.getElementById('input-category').value = entry.category;
  document.getElementById('input-amount').value = entry.amount;
  document.getElementById('input-credit').value = entry.credit;
  document.getElementById('input-memo').value = entry.memo;

  editingId = id;
  document.getElementById('btn-save').innerText = '✏️ 変更を保存する';
  
  // 画面上部へスクロール
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// フォームリセット
function resetForm() {
  document.getElementById('input-amount').value = '500'; // 自動で500に戻す
  document.getElementById('input-memo').value = '';
}

// ローカルストレージに保存
function saveToStorage() {
  localStorage.setItem('haru_journal', JSON.stringify(journalEntries));
}

// --- 5. 画面の再描画（一覧・B/S・P/Lの集計） ---
function render() {
  renderTable();
  renderPL();
  renderBS();
}

// 5-1. 入力一覧テーブルの表示
function renderTable() {
  const tbody = document.querySelector('#tab-list tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  // 日付順にソート（新しい順）
  const sorted = [...journalEntries].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.date.slice(5)}</td>
      <td>${item.category}<br><small style="color:#666;">(${item.credit})</small></td>
      <td>${item.amount.toLocaleString()}円</td>
      <td>
        <button class="btn-action btn-edit" onclick="editEntry(${item.id})">直す</button>
        <button class="btn-action btn-delete" onclick="deleteEntry(${item.id})">消す</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 5-2. 損益計算書 (P/L) の自動集計
function renderPL() {
  const target = document.getElementById('tab-pl');
  if (!target) return;

  let sales = 0;
  const expenses = {};

  journalEntries.forEach(item => {
    if (item.category === '売上') {
      sales += item.amount;
    } else {
      expenses[item.category] = (expenses[item.category] || 0) + item.amount;
    }
  });

  const totalExpense = Object.values(expenses).reduce((a, b) => a + b, 0);
  const profit = sales - totalExpense;

  let expenseDetailsHtml = '';
  for (const [cat, amt] of Object.entries(expenses)) {
    expenseDetailsHtml += `<li>${cat}: ${amt.toLocaleString()}円</li>`;
  }

  target.innerHTML = `
    <h4>📈 損益計算書 (P/L)</h4>
    <p><strong>売上高:</strong> ${sales.toLocaleString()}円</p>
    <p><strong>費用合計:</strong> ${totalExpense.toLocaleString()}円</p>
    <ul style="font-size:0.85rem; color:#555;">${expenseDetailsHtml || '<li>費用なし</li>'}</ul>
    <hr style="border:none; border-top:1px dashed #ccc;">
    <p><strong>差引当期純利益:</strong> <span style="color:${profit >= 0 ? 'blue' : 'red'};">${profit.toLocaleString()}円</span></p>
  `;
}

// 5-3. 貸借対照表 (B/S) の自動集計
function renderBS() {
  const target = document.getElementById('tab-bs');
  if (!target) return;

  let cash = 0;
  let ownerBorrowing = 0;

  journalEntries.forEach(item => {
    if (item.category === '売上') {
      cash += item.amount;
    } else {
      if (item.credit === '現金') {
        cash -= item.amount;
      } else if (item.credit === '事業主借') {
        ownerBorrowing += item.amount;
      }
    }
  });

  target.innerHTML = `
    <h4>⚖️ 貸借対照表 (B/S)</h4>
    <div style="background:#f9fafb; padding:8px; border-radius:4px; margin-bottom:8px;">
      <strong>【資産の部】</strong><br>
      現金: ${cash.toLocaleString()}円
    </div>
    <div style="background:#f9fafb; padding:8px; border-radius:4px;">
      <strong>【負債・資本の部】</strong><br>
      事業主借: ${ownerBorrowing.toLocaleString()}円
    </div>
  `;
}

// --- 6. タブ切り替え処理 ---
function switchTab(tabName, element) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.btn-tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  element.classList.add('active');
}

// ページの読み込み完了時に初期表示を実行する
window.addEventListener('DOMContentLoaded', () => {
  render();
});