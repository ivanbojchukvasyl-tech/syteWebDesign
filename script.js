/* ===== Перемикач теми ===== */
const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");

function updateButton() {
    const isLight = root.classList.contains("light-theme");
    toggle.textContent = isLight ? "☀️ Змінити тему" : "🌙 Змінити тему";
    toggle.setAttribute("aria-pressed", isLight);
}

// Темна тема за замовчуванням, світла лише якщо користувач її вибрав
if (localStorage.getItem("theme") === "light") {
    root.classList.add("light-theme");
}
updateButton();

toggle.addEventListener("click", () => {
    root.classList.toggle("light-theme");
    const isLight = root.classList.contains("light-theme");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    updateButton();
});