// --- State & persistence ---
const STORAGE_KEY = "todo.items.v1";
let items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let currentFilter = "all"; // all | active | done

// --- DOM refs ---
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const clearDoneBtn = document.getElementById("clear-done");
const filterButtons = document.querySelectorAll("[data-filter]");

// --- Helpers ---
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function render() {
  list.innerHTML = "";
  const filtered = items.filter(item => {
    if (currentFilter === "active") return !item.done;
    if (currentFilter === "done") return item.done;
    return true;
  });

  for (const item of filtered) {
    const li = document.createElement("li");
    li.className = "item" + (item.done ? " done" : "");
    li.dataset.id = item.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.done;
    checkbox.addEventListener("change", () => toggle(item.id));

    const label = document.createElement("label");
    label.textContent = item.text;

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.addEventListener("click", () => remove(item.id));

    li.append(checkbox, label, del);
    list.appendChild(li);
  }
}

// --- Actions ---
function add(text) {
  items.unshift({ id: crypto.randomUUID(), text, done: false, createdAt: Date.now() });
  save(); render();
}

function toggle(id) {
  items = items.map(it => it.id === id ? { ...it, done: !it.done } : it);
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

// --- Events ---
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  add(text);
  input.value = "";
  input.focus();
});

clearDoneBtn.addEventListener("click", clearDone);

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    render();
  });
});

// Initial render
render();
