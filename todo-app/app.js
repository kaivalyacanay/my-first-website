// ---------- Keys & safe load ----------
const STORAGE_KEY = "todo.items.v1";
const FILTER_KEY = "todo.filter.v1";

function safeLoad(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

let items = safeLoad(STORAGE_KEY, []);
let currentFilter = localStorage.getItem(FILTER_KEY) || "all"; // "all" | "active" | "done"

// ---------- DOM refs ----------
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const countsEl = document.getElementById("counts");
const clearDoneBtn = document.getElementById("clear-done");
const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));

// ---------- Persistence ----------
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
function saveFilter() {
  localStorage.setItem(FILTER_KEY, currentFilter);
}

// ---------- Derived helpers ----------
function visibleItems() {
  if (currentFilter === "active") return items.filter(it => !it.done);
  if (currentFilter === "done")   return items.filter(it => it.done);
  return items;
}

function updateCounts() {
  const total = items.length;
  const active = items.filter(it => !it.done).length;
  countsEl.textContent = `${active} active / ${total} total`;
}

function paintFilterButtons() {
  for (const btn of filterButtons) {
    const pressed = btn.dataset.filter === currentFilter;
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  }
}

// ---------- Render ----------
function render() {
  list.innerHTML = "";
  for (const item of visibleItems()) {
    const li = document.createElement("li");
    li.className = "item" + (item.done ? " done" : "");
    li.dataset.id = item.id;
    li.setAttribute("role", "listitem");

    // Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.done;
    checkbox.setAttribute("aria-label", "Toggle done");
    checkbox.addEventListener("change", () => toggle(item.id));

    // Static label
    const label = document.createElement("label");
    label.textContent = item.text;
    label.title = "Double-click to edit";
    label.addEventListener("dblclick", () => enterEditMode(li, item));

    // Delete button
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", () => remove(item.id));

    // Inline edit container
    const editWrap = document.createElement("div");
    editWrap.className = "edit";
    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.value = item.text;
    editInput.setAttribute("aria-label", "Edit task text");
    editWrap.appendChild(editInput);

    li.append(checkbox, label, del, editWrap);
    list.appendChild(li);
  }

  updateCounts();
  paintFilterButtons();
}

function enterEditMode(li, item) {
  li.classList.add("editing");
  const editInput = li.querySelector(".edit input");
  editInput.value = item.text;
  editInput.focus();
  editInput.select();

  const commit = () => {
    const val = editInput.value.trim();
    if (!val) { // if emptied, treat as delete
      remove(item.id);
      return;
    }
    items = items.map(it => it.id === item.id ? { ...it, text: val } : it);
    save(); render();
  };
  const cancel = () => { li.classList.remove("editing"); };

  const onKey = (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") cancel();
  };

  editInput.addEventListener("keydown", onKey, { once: true });
  editInput.addEventListener("blur", commit, { once: true });
}

// ---------- Mutations ----------
function add(text) {
  items.unshift({ id: crypto.randomUUID(), text, done: false, createdAt: Date.now() });
  save(); render();
}
function toggle(id) {
  items = items.map(it => it.id === id ? ({ ...it, done: !it.done }) : it);
  save(); render();
}
function remove(id) {
  items = items.filter(it => it.id !== id);
  save(); render();
}
function clearDone() {
  items = items.filter(it => !it.done);
  save(); render();
}

function setFilter(f) {
  currentFilter = f;
  saveFilter();
  render();
}

// ---------- Events ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  add(text);
  input.value = "";
  input.focus();
});
clearDoneBtn.addEventListener("click", clearDone);
for (const btn of filterButtons) {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
}

// Sync across tabs (optional nice-to-have)
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    items = safeLoad(STORAGE_KEY, []);
    render();
  }
  if (e.key === FILTER_KEY) {
    currentFilter = localStorage.getItem(FILTER_KEY) || "all";
    paintFilterButtons();
  }
});

// Initial paint
render();