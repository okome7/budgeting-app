// Flatpickr を初期化
flatpickr("#date", {
  dateFormat: "Y-m-d",
  locale: "ja",
  defaultDate: "today",
  disableMobile: true,
});

// カテゴリー
const defaultCategories = {
  expense: ["食費", "交通費", "衣服", "趣味", "その他"],
  income: ["給料", "その他"],
};

let currentType = null;

// セレクトを更新
function loadCategories(type) {
  const select = document.getElementById(`${type}-category`);
  const stored = JSON.parse(
    localStorage.getItem(`${type}Categories`) || "null"
  );
  const categories = stored || defaultCategories[type];

  select.innerHTML = "";
  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });

  // 「管理」項目
  const manageOption = document.createElement("option");
  manageOption.value = "_manage_";
  manageOption.textContent = "+追加/削除";
  select.appendChild(manageOption);
}

// 追加・削除モーダル制御
const modal = document.getElementById("categoryModal");
const modalInput = document.getElementById("modal-category-input");
const modalAddBtn = document.getElementById("modal-add-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");

function setupCategory(type) {
  const select = document.getElementById(`${type}-category`);

  select.addEventListener("change", () => {
    if (select.value === "_manage_") {
      currentType = type;
      openModal();
    }
  });
}

function openModal() {
  modal.style.display = "flex";
  modalInput.value = "";

  // 削除用セレクト更新
  const stored = JSON.parse(
    localStorage.getItem(`${currentType}Categories`) || "null"
  );
  const categories = stored || defaultCategories[currentType];
  // リストを空に
  const categoryList = document.getElementById("categoryList");
  categoryList.innerHTML = "";

  // カテゴリーごとに <li> と削除ボタンを作成
  categories.forEach((cat, index) => {
    const li = document.createElement("li");
    li.textContent = cat;
    li.classList.add("category-item");

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "ー";
    deleteBtn.classList.add("modal-delete-btn");

    // 削除処理
    deleteBtn.addEventListener("click", () => {
      categories.splice(index, 1); // 配列から削除
      localStorage.setItem(
        `${currentType}Categories`,
        JSON.stringify(categories)
      );
      loadCategories(currentType);
      openModal(); // モーダル再描画
    });

    li.appendChild(deleteBtn);
    categoryList.appendChild(li);
  });
}

// エラーメッセージを表示する関数
function showError(message) {
  document.getElementById("error-message").innerHTML = message;
  document.getElementById("errorModal").style.display = "flex";
}

// OKボタンで閉じる
document.getElementById("error-close-btn").addEventListener("click", () => {
  document.getElementById("errorModal").style.display = "none";
});

// 追加処理
modalAddBtn.addEventListener("click", () => {
  const newCat = modalInput.value.trim();
  if (!newCat) return showError("カテゴリー名を<br>入力してください");

  const stored = JSON.parse(
    localStorage.getItem(`${currentType}Categories`) || "null"
  );
  let categories = stored || defaultCategories[currentType];

  if (categories.includes(newCat)) {
    return showError("既に存在する<br>カテゴリーです");
  }

  categories.push(newCat);
  localStorage.setItem(`${currentType}Categories`, JSON.stringify(categories));
  loadCategories(currentType);
  openModal(); // 更新したリストを再表示
});

// 閉じる
modalCancelBtn.addEventListener("click", () => {
  modal.style.display = "none";
  document.getElementById(`${currentType}-category`).value = "";
});

// 初期化
["expense", "income"].forEach((type) => {
  loadCategories(type);
  setupCategory(type);
});

// 保存
const saveBtn = document.getElementById("saveBtn");
const saveTab = document.getElementById("saveTab");
const overlay = document.getElementById("overlay");
const amountModal = document.getElementById("amountModal");

saveBtn.addEventListener("click", () => {
  const isExpense = !expenseScreen.classList.contains("hidden");
  const type = isExpense ? "expense" : "income";

  const date = document.getElementById("date").value;
  const amount = document.getElementById("amount").value.trim();
  const category = isExpense
    ? document.getElementById("expense-category").value
    : document.getElementById("income-category").value;
  const memo = document.getElementById("memo").value;

  // 金額チェック（空または0円）
  if (!amount || Number(amount) === 0) {
    amountModal.style.display = "block";
    overlay.style.display = "block";
    setTimeout(() => {
      amountModal.style.display = "none";
      overlay.style.display = "none";
    }, 1500);
    return;
  }

  // 既存データを取得
  const data = JSON.parse(localStorage.getItem("financeData") || "[]");

  // 「変更」モードの場合（currentEditItemがある）
  if (currentEditItem) {
    const index = data.findIndex((d) => d.id === currentEditItem.id);
    if (index !== -1) {
      data[index] = {
        ...data[index],
        date,
        amount: Number(amount),
        category,
        memo,
        type,
      };
    }
  } else {
    //  新規追加モード
    const newItem = {
      id: Date.now(),
      date,
      amount: Number(amount),
      category,
      memo,
      type,
    };
    data.push(newItem);
  }

  // データを保存
  localStorage.setItem("financeData", JSON.stringify(data));

  // **画面切替処理**
  if (currentEditItem) {
    // 編集モード → カレンダー画面に戻す
    document.getElementById("screen-input").style.display = "none";
    document.getElementById("screen-list").style.display = "flex";
  } else {
    // 新規追加モード → 入力画面を維持（そのまま）
    // もし初期化したい場合は以下の処理だけ残す
    document.getElementById("amount").value = "";
    document.getElementById("memo").value = "";
    document.getElementById("date")._flatpickr.setDate(new Date());
  }

  // メニュー再表示
  const menu = document.getElementById("menu");
  if (menu) menu.style.display = "flex";

  // 保存完了タブを表示
  overlay.style.display = "block";
  saveTab.style.display = "block";
  setTimeout(() => {
    overlay.style.display = "none";
    saveTab.style.display = "none";
  }, 1500);

  // リスト・グラフを再描画
  updateDailyTotals();
  renderExpenseChart(currentYear, currentMonth);
  renderIncomeChart(currentYear, currentMonth);

  // 状態リセット
  currentEditItem = null;
  saveBtn.textContent = "保存"; // ボタン表示を戻す
  // カテゴリー更新 & 初期値に戻す
  ["expense", "income"].forEach((type) => {
    loadCategories(type);
    setupCategory(type);

    const select = document.getElementById(`${type}-category`);
    select.selectedIndex = 0; // 最初の項目を選択
  });

  // 金額とメモもリセット
  document.getElementById("amount").value = "";
  document.getElementById("memo").value = "";
  document.getElementById("date")._flatpickr.setDate(new Date());
  // 戻るボタンも非表示
  document.getElementById("backBtn").style.display = "none";
});

// リストを変更
let currentEditItem = null; // 編集中の項目を保持
// 編集画面表示
function openEditScreen(item) {
  currentEditItem = item;

  // 入力欄に値をセット
  document.getElementById("date").value =
    item.date instanceof Date
      ? item.date.toISOString().split("T")[0]
      : item.date || "";
  document.getElementById(
    item.type === "income" ? "income-category" : "expense-category"
  ).value = item.category;
  document.getElementById("amount").value = item.amount;
  document.getElementById("memo").value = item.memo || "";

  // 支出/収入画面切り替え
  if (item.type === "income") {
    document.getElementById("incomeScreen").classList.remove("hidden");
    document.getElementById("expenseScreen").classList.add("hidden");
    document.getElementById("incomeBtn").classList.add("active");
    document.getElementById("expenseBtn").classList.remove("active");
  } else {
    document.getElementById("incomeScreen").classList.add("hidden");
    document.getElementById("expenseScreen").classList.remove("hidden");
    document.getElementById("expenseBtn").classList.add("active");
    document.getElementById("incomeBtn").classList.remove("active");
  }

  // 他の画面は非表示
  document.querySelectorAll(".screen").forEach((el) => {
    if (el.id !== "screen-input") el.style.display = "none";
  });

  const inputScreen = document.getElementById("screen-input");
  inputScreen.style.display = "flex";

  const menu = document.getElementById("menu");
  if (menu) menu.style.display = "none";

  // 戻るボタンだけ表示
  document.getElementById("backBtn").style.display = "inline-block";
  // ボタンテキストを変更
  document.getElementById("saveBtn").textContent = "変更";
}

// 既存の詳細リストの行だけに編集機能を付ける
function addEditFeature(line, item) {
  // lineがすでにリストから作られたものである場合のみ
  line.addEventListener("click", (e) => {
    if (e.target.closest(".detail-delete-btn")) return; // 削除ボタンは無視
    openEditScreen(item);
  });
}

// 編集画面を閉じる関数
function closeEditScreen() {
  // 入力画面を非表示
  document.getElementById("screen-input").style.display = "none";

  // 戻るボタンも非表示
  document.getElementById("backBtn").style.display = "none";

  // 他の画面を再表示
  document.getElementById("screen-list").style.display = "flex";

  // ボトムメニューも再表示
  const menu = document.getElementById("menu");
  if (menu) menu.style.display = "flex";

  // 編集中リセット
  currentEditItem = null;
  // カテゴリー更新 & 初期値に戻す
  ["expense", "income"].forEach((type) => {
    loadCategories(type);
    setupCategory(type);

    const select = document.getElementById(`${type}-category`);
    select.selectedIndex = 0; // 最初の項目を選択
  });

  // 金額とメモもリセット
  document.getElementById("amount").value = "";
  document.getElementById("memo").value = "";
  document.getElementById("date")._flatpickr.setDate(new Date());
  document.getElementById("saveBtn").textContent = "保存";
}

// 戻るボタンにイベントを設定
document.getElementById("backBtn").addEventListener("click", closeEditScreen);

// 下部メニュー切り替え
const buttons = document.querySelectorAll("#menu button");
const screens = document.querySelectorAll(".screen");

screens.forEach((s) => (s.style.display = "none"));
document.getElementById("screen-input").style.display = "flex"; // 初期画面

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    screens.forEach((s) => (s.style.display = "none"));
    document.getElementById(target).style.display = "flex";
  });
});

// 支出・収入切り替え
const expenseBtn = document.getElementById("expenseBtn");
const incomeBtn = document.getElementById("incomeBtn");
const expenseScreen = document.getElementById("expenseScreen");
const incomeScreen = document.getElementById("incomeScreen");

// 最初は支出をアクティブ
expenseBtn.classList.add("active");

expenseBtn.addEventListener("click", () => {
  expenseScreen.classList.remove("hidden");
  incomeScreen.classList.add("hidden");
  expenseBtn.classList.add("active");
  incomeBtn.classList.remove("active");
});

incomeBtn.addEventListener("click", () => {
  incomeScreen.classList.remove("hidden");
  expenseScreen.classList.add("hidden");
  incomeBtn.classList.add("active");
  expenseBtn.classList.remove("active");
});

// カレンダー
// 現在の年月
// 現在年月
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

// カレンダー描画
function renderCalendar(year, month) {
  const calendarEl = document.getElementById("calendar");
  calendarEl.innerHTML = "";

  document.getElementById("monthLabel").textContent = `${year}年${month + 1}月`;

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.tableLayout = "fixed";

  const headerRow = document.createElement("tr");
  ["日", "月", "火", "水", "木", "金", "土"].forEach((d) => {
    const th = document.createElement("th");
    th.textContent = d;
    th.style.padding = "5px";
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  let row = document.createElement("tr");
  const todayDate = new Date();

  // 最初の空セル
  for (let i = 0; i < firstDay; i++) {
    const emptyTd = document.createElement("td");
    emptyTd.style.backgroundColor = "#eee";
    row.appendChild(emptyTd);
  }

  // 日付表示
  for (let date = 1; date <= lastDate; date++) {
    if (row.children.length === 7) {
      table.appendChild(row);
      row = document.createElement("tr");
    }

    const td = document.createElement("td");
    td.style.verticalAlign = "top";

    const dateSpan = document.createElement("span");
    dateSpan.textContent = date;
    dateSpan.classList.add("date");
    if (
      year === todayDate.getFullYear() &&
      month === todayDate.getMonth() &&
      date === todayDate.getDate()
    ) {
      dateSpan.classList.add("calendar-today");
    }
    td.appendChild(dateSpan);

    const dateId = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      date
    ).padStart(2, "0")}`;
    const totalSpan = document.createElement("span");
    totalSpan.classList.add("total");
    totalSpan.id = `total-${dateId}`;
    td.appendChild(totalSpan);

    //  クリックで該当日のリストまでスクロールする
    td.addEventListener("click", () => {
      const target = document.querySelector(
        `.date-title[data-date="${dateId}"]`
      );
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    row.appendChild(td);
  }

  // 最後の空セル
  if (row.children.length > 0) {
    const remaining = 7 - row.children.length;
    for (let i = 0; i < remaining; i++) {
      const emptyTd = document.createElement("td");
      emptyTd.style.backgroundColor = "#eee";
      row.appendChild(emptyTd);
    }
    table.appendChild(row);
  }

  calendarEl.appendChild(table);

  updateDailyTotals();
}

// 合計・リスト更新
function updateDailyTotals() {
  const data = JSON.parse(localStorage.getItem("financeData") || "[]");
  let totalIncome = 0,
    totalExpense = 0;
  const dailyMap = {};
  const totals = {};

  // 日ごとにまとめる（今表示中の月のみ）
  data.forEach((item) => {
    const dateObj = new Date(item.date);
    const itemYear = dateObj.getFullYear();
    const itemMonth = dateObj.getMonth();

    // 今見ている月以外はスキップ
    if (itemYear !== currentYear || itemMonth !== currentMonth) return;

    const category = item.category || "不明",
      amount = parseInt(item.amount || 0, 10),
      type = item.type || "expense",
      memo = item.memo || "";

    if (!dailyMap[item.date]) dailyMap[item.date] = [];
    dailyMap[item.date].push({
      id: item.id,
      date: item.date,
      category,
      amount,
      type,
      memo,
    });

    if (type === "income") totalIncome += amount;
    else totalExpense += amount;

    // カレンダーの合計表示
    if (!totals[item.date]) totals[item.date] = { income: 0, expense: 0 };
    if (type === "income") totals[item.date].income += amount;
    else totals[item.date].expense += amount;
  });

  // 合計表示
  document.getElementById("incomeTotal").textContent =
    totalIncome.toLocaleString();
  document.getElementById("expenseTotal").textContent =
    totalExpense.toLocaleString();
  document.getElementById("netTotal").textContent = (
    totalIncome - totalExpense
  ).toLocaleString();

  // 詳細リスト更新
  const detailList = document.getElementById("detailList");
  detailList.innerHTML = "";

  Object.keys(dailyMap)
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach((date) => {
      const dateDiv = document.createElement("div");

      const title = document.createElement("div");
      title.className = "date-title";
      title.dataset.date = date;
      title.textContent = new Date(date).toLocaleDateString("ja-JP", {
        month: "long",
        day: "numeric",
        weekday: "short",
      });
      dateDiv.appendChild(title);

      const items = dailyMap[date];

      // 収入
      items
        .filter((item) => item.type === "income")
        .forEach((item, index) => {
          const line = document.createElement("div");
          line.className = "detail-line income-line";

          const content = document.createElement("div");
          content.className = "detail-line-content";

          const left = document.createElement("div");
          left.className = "detail-left";
          left.textContent =
            item.category + (item.memo ? `（${item.memo}）` : "");

          const right = document.createElement("div");

          right.textContent = "＋" + item.amount.toLocaleString() + "円";
          content.appendChild(left);
          content.appendChild(right);

          // 削除ボタン
          const deleteBtn = document.createElement("div");
          deleteBtn.className = "detail-delete-btn";
          deleteBtn.textContent = "削除";

          line.appendChild(content);
          line.appendChild(deleteBtn);
          dateDiv.appendChild(line);
          addEditFeature(line, item);

          // スワイプ機能追加
          addSwipeDelete(line, item.id);
        });

      // 支出
      items
        .filter((item) => item.type === "expense")
        .forEach((item, index) => {
          const line = document.createElement("div");
          line.className = "detail-line expense-line";
          const content = document.createElement("div");
          content.className = "detail-line-content";
          const left = document.createElement("div");
          left.className = "detail-left";
          left.textContent =
            item.category + (item.memo ? `（${item.memo}）` : "");
          const right = document.createElement("div");
          right.textContent = "－" + item.amount.toLocaleString() + "円";
          content.appendChild(left);
          content.appendChild(right);

          // 削除ボタン
          const deleteBtn = document.createElement("div");
          deleteBtn.className = "detail-delete-btn";
          deleteBtn.textContent = "削除";

          line.appendChild(content);
          line.appendChild(deleteBtn);
          dateDiv.appendChild(line);
          addEditFeature(line, item);

          // スワイプ機能追加
          addSwipeDelete(line, item.id);
        });

      detailList.appendChild(dateDiv);
    });

  document.querySelectorAll("[id^='total-']").forEach((el) => {
    el.innerHTML = "";
  });

  // カレンダーの合計更新
  Object.keys(totals).forEach((dateStr) => {
    const totalContainer = document.getElementById(`total-${dateStr}`);
    if (totalContainer) {
      totalContainer.innerHTML = ""; // 一度リセット

      // 収入行
      if (totals[dateStr].income > 0) {
        const incomeLine = document.createElement("div");
        incomeLine.textContent = `＋${totals[
          dateStr
        ].income.toLocaleString()}円`;
        incomeLine.style.color = "#28a745";
        incomeLine.style.fontSize = "0.8em";
        totalContainer.appendChild(incomeLine);
      }

      // 支出行
      if (totals[dateStr].expense > 0) {
        const expenseLine = document.createElement("div");
        expenseLine.textContent = `－${totals[
          dateStr
        ].expense.toLocaleString()}円`;
        expenseLine.style.color = "#e44";
        expenseLine.style.fontSize = "0.8em";
        totalContainer.appendChild(expenseLine);
      }
    }
  });
}

// リスト削除
function addSwipeDelete(line, recordId) {
  const deleteBtn = line.querySelector(".detail-delete-btn");
  let startX = 0;
  let movedX = 0;
  let isSwiping = false;

  // タッチ開始
  line.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    isSwiping = true;
  });

  // マウス開始
  line.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    isSwiping = true;
    e.preventDefault(); // ドラッグ選択防止
  });

  // タッチ移動
  line.addEventListener("touchmove", (e) => {
    if (!isSwiping) return;
    movedX = e.touches[0].clientX - startX;
    handleMove(line, movedX);
  });

  // マウス移動
  line.addEventListener("mousemove", (e) => {
    if (!isSwiping) return;
    movedX = e.clientX - startX;
    handleMove(line, movedX);
  });

  // タッチ終了
  line.addEventListener("touchend", () => {
    isSwiping = false;
  });

  // マウス終了
  line.addEventListener("mouseup", () => {
    isSwiping = false;
  });
  // 削除ボタン押下時
  deleteBtn.addEventListener("click", () => {
    line.style.opacity = "0";
    line.style.transform = "translateX(-100%)";
    setTimeout(() => {
      deleteRecord(recordId);
      updateDailyTotals();
      renderExpenseChart(currentYear, currentMonth);
      renderIncomeChart(currentYear, currentMonth);
    }, 300);
  });
}

// 移動判定
function handleMove(line, movedX) {
  if (movedX < -20) {
    line.classList.add("show-delete");
  } else if (movedX > 20) {
    line.classList.remove("show-delete");
  }
}

// ローカルストレージから該当データを削除
function deleteRecord(recordId) {
  let data = JSON.parse(localStorage.getItem("financeData") || "[]");
  data = data.filter((item) => item.id !== recordId);
  localStorage.setItem("financeData", JSON.stringify(data));
}

// 初期表示
renderCalendar(currentYear, currentMonth);
updateDailyTotals();

// 前月・次月
document.getElementById("prevMonth").addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar(currentYear, currentMonth);
  updateDailyTotals();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentYear, currentMonth);
  updateDailyTotals();
});

//初期カテゴリーと色
let categoryColors = JSON.parse(localStorage.getItem("categoryColors")) || {
  expense: {
    食費: "#ff6384",
    交通費: "#36a2eb",
    趣味: "#4bc0c0",
    衣服: "#ffcd56",
    その他: "#9966ff",
  },
  income: { 給料: "#36a2eb", その他: "#ffcd56" },
};

// カラー設定をローカルストレージに保存
function saveCategoryColors() {
  localStorage.setItem("categoryColors", JSON.stringify(categoryColors));
}

// ランダムカラー
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

let expenseChartInstance = null,
  incomeChartInstance = null;
let currentCategory, currentColorCircle;

const picker = document.getElementById("customColorPicker");
const customInput = document.getElementById("customColorInput");

// カラーピッカー以外をクリックしたら非表示
picker.addEventListener("click", (e) => e.stopPropagation());
document.addEventListener("click", () => (picker.style.display = "none"));

// カスタムカラー選択
customInput.oninput = (e) => {
  if (!currentCategory || !currentColorCircle) return;

  // 支出カテゴリーに色を反映
  if (categoryColors.expense[currentCategory] !== undefined) {
    categoryColors.expense[currentCategory] = e.target.value;
    renderExpenseChart(currentYear, currentMonth);
  }
  // 収入カテゴリーに色を反映
  if (categoryColors.income[currentCategory] !== undefined) {
    categoryColors.income[currentCategory] = e.target.value;
    renderIncomeChart(currentYear, currentMonth);
  }
  // リスト上の色丸も更新
  currentColorCircle.style.backgroundColor = e.target.value;
  saveCategoryColors();
};

// 支出グラフ・リスト描画
function renderExpenseChart(year, month) {
  const data = JSON.parse(localStorage.getItem("financeData") || "[]").filter(
    (i) =>
      i.type === "expense" &&
      new Date(i.date).getFullYear() === year &&
      new Date(i.date).getMonth() === month
  );

  // カテゴリーごとの合計金額
  const categoryTotals = {};
  data.forEach(
    (i) =>
      (categoryTotals[i.category] =
        (categoryTotals[i.category] || 0) + parseInt(i.amount, 10))
  );

  // 新しいカテゴリーがあればランダム色を追加
  Object.keys(categoryTotals).forEach((cat) => {
    if (!categoryColors.expense[cat]) {
      categoryColors.expense[cat] = getRandomColor();
      saveCategoryColors();
    }
  });

  const ctx = document.getElementById("expenseChart").getContext("2d");
  if (expenseChartInstance) expenseChartInstance.destroy();
  // Chart.jsで円グラフ描画
  expenseChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [
        {
          data: Object.values(categoryTotals),
          backgroundColor: Object.keys(categoryTotals).map(
            (cat) => categoryColors.expense[cat]
          ),
        },
      ],
    },
    options: {
      animation: false,
      plugins: {
        legend: false,
        datalabels: {
          align: "end",
          anchor: "end",
          offset: -60,
          color: "#fff",
          font: { weight: "bold", size: 14 },
          formatter: (v, c) => {
            const data = c.chart.data.datasets[0].data;
            const total = data.reduce((a, b) => a + b, 0);
            const percentage = (v / total) * 100;

            if (percentage < 4) return "";

            return c.chart.data.labels[c.dataIndex];
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });

  // リスト描画
  const listContainer = document.getElementById("expenseList");
  listContainer.innerHTML = "";
  Object.entries(categoryTotals).forEach(([category, amount]) => {
    const item = document.createElement("div");
    item.className = "list-item";
    // 色丸
    const colorCircle = document.createElement("span");
    colorCircle.className = "color-circle";
    colorCircle.style.backgroundColor = categoryColors.expense[category];
    // カテゴリー名
    const categorySpan = document.createElement("span");
    categorySpan.textContent = category;
    categorySpan.className = "category-name";
    // 金額
    const amountSpan = document.createElement("span");
    amountSpan.textContent = `${amount.toLocaleString()}円`;
    amountSpan.className = "category-amount";
    item.appendChild(colorCircle);
    item.appendChild(categorySpan);
    item.appendChild(amountSpan);

    // カラーピッカー表示
    item.addEventListener("click", (e) => {
      picker.style.display = "grid";
      currentCategory = category;
      currentColorCircle = colorCircle;
      // カスタムカラー入力欄の初期値を設定
      customInput.value = categoryColors.expense[category];

      picker.querySelectorAll(".color-option").forEach((btn) => {
        btn.onclick = () => {
          const hexColor = rgbToHex(btn.style.backgroundColor); // RGB → HEX
          categoryColors.expense[category] = hexColor;
          colorCircle.style.backgroundColor = hexColor;
          customInput.value = hexColor; // カスタムカラー入力欄にも反映
          saveCategoryColors();
          renderExpenseChart(year, month);
          picker.style.display = "none";
        };
      });
      e.stopPropagation();
    });
    listContainer.appendChild(item);
  });

  // 支出合計金額
  let totalExpense = 0;
  data.forEach((item) => {
    const dateObj = new Date(item.date);
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month) return;
    if (item.type !== "expense") return;

    const amount = parseInt(item.amount || 0, 10);
    totalExpense += amount;
  });

  document.getElementById("myExpenseTotal").textContent =
    totalExpense.toLocaleString() + "円";
}

// 収入グラフ・リスト描画
function renderIncomeChart(year, month) {
  const data = JSON.parse(localStorage.getItem("financeData") || "[]").filter(
    (i) =>
      i.type === "income" &&
      new Date(i.date).getFullYear() === year &&
      new Date(i.date).getMonth() === month
  );

  // カテゴリーごとの合計
  const categoryTotals = {};
  data.forEach(
    (i) =>
      (categoryTotals[i.category] =
        (categoryTotals[i.category] || 0) + parseInt(i.amount, 10))
  );

  // 新しいカテゴリーはランダム色追加
  Object.keys(categoryTotals).forEach((cat) => {
    if (!categoryColors.income[cat]) {
      categoryColors.income[cat] = getRandomColor();
      saveCategoryColors();
    }
  });
  const ctx = document.getElementById("incomeChart").getContext("2d");
  if (incomeChartInstance) incomeChartInstance.destroy();

  // 円グラフ描画
  incomeChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [
        {
          data: Object.values(categoryTotals),
          backgroundColor: Object.keys(categoryTotals).map(
            (cat) => categoryColors.income[cat]
          ),
        },
      ],
    },
    options: {
      animation: false,
      plugins: {
        legend: false,
        datalabels: {
          align: "end",
          anchor: "end",
          offset: -60,
          color: "#fff",
          font: { weight: "bold", size: 14 },
          formatter: (v, c) => {
            const data = c.chart.data.datasets[0].data;
            const total = data.reduce((a, b) => a + b, 0);
            const percentage = (v / total) * 100;

            if (percentage < 4) return "";

            return c.chart.data.labels[c.dataIndex];
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });

  // リスト描画
  const listContainer = document.getElementById("incomeList");
  listContainer.innerHTML = "";
  Object.entries(categoryTotals).forEach(([category, amount]) => {
    const item = document.createElement("div");
    item.className = "list-item";

    const colorCircle = document.createElement("span");
    colorCircle.className = "color-circle";
    colorCircle.style.backgroundColor = categoryColors.income[category];

    const categorySpan = document.createElement("span");
    categorySpan.textContent = category;
    categorySpan.className = "category-name";

    const amountSpan = document.createElement("span");
    amountSpan.textContent = `${amount.toLocaleString()}円`;
    amountSpan.className = "category-amount";

    item.appendChild(colorCircle);
    item.appendChild(categorySpan);
    item.appendChild(amountSpan);

    // カラーピッカー表示
    item.addEventListener("click", (e) => {
      picker.style.display = "grid";
      currentCategory = category;
      currentColorCircle = colorCircle;
      // カスタムカラー入力欄の初期値を設定
      customInput.value = categoryColors.income[category];

      picker.querySelectorAll(".color-option").forEach((btn) => {
        btn.onclick = () => {
          const hexColor = rgbToHex(btn.style.backgroundColor); // RGB → HEX
          categoryColors.income[category] = hexColor;
          colorCircle.style.backgroundColor = hexColor;
          customInput.value = hexColor; // カスタムカラー入力欄にも反映
          saveCategoryColors();
          renderIncomeChart(year, month);
          picker.style.display = "none";
        };
      });
      e.stopPropagation();
    });

    listContainer.appendChild(item);
  });

  // 収入の合計金額
  let totalIncome = 0;
  data.forEach((item) => {
    const dateObj = new Date(item.date);
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month) return;
    if (item.type !== "income") return;

    const amount = parseInt(item.amount || 0, 10);
    totalIncome += amount;
  });

  document.getElementById("myIncomeTotal").textContent =
    totalIncome.toLocaleString() + "円";
}

function rgbToHex(rgb) {
  const result = rgb.match(/\d+/g);
  if (!result) return "#000000";
  const r = parseInt(result[0]).toString(16).padStart(2, "0");
  const g = parseInt(result[1]).toString(16).padStart(2, "0");
  const b = parseInt(result[2]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

// 初期設定
let currentDate = new Date();
const expenseContainer = document.getElementById("expenseGraphContainer");
const incomeContainer = document.getElementById("incomeGraphContainer");
const showExpenseBtn = document.getElementById("showExpenseGraph");
const showIncomeBtn = document.getElementById("showIncomeGraph");
const monthLabel = document.getElementById("monthLabelGraph");

// グラフ更新
function updateGraphs() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  monthLabel.textContent = `${year}年${month + 1}月`;

  renderExpenseChart(year, month);
  renderIncomeChart(year, month);
}
document.addEventListener("DOMContentLoaded", () => {
  updateGraphs(); // ← ページ読み込み後すぐに描画
});

// 切替ボタン
showExpenseBtn.addEventListener("click", () => {
  expenseContainer.style.display = "flex";
  incomeContainer.style.display = "none";
  showExpenseBtn.classList.add("active");
  showIncomeBtn.classList.remove("active");
});

showIncomeBtn.addEventListener("click", () => {
  expenseContainer.style.display = "none";
  incomeContainer.style.display = "flex";
  showExpenseBtn.classList.remove("active");
  showIncomeBtn.classList.add("active");
});

// 前月／次月
document.getElementById("prevMonthGraph").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  updateGraphs();
});
document.getElementById("nextMonthGraph").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  updateGraphs();
});

// 初期表示
updateGraphs();
expenseContainer.style.display = "flex";
incomeContainer.style.display = "none";
