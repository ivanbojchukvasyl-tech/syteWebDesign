const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");

// Оновлює текст кнопки залежно від теми
function updateButton() {
    const isDark = root.classList.contains("dark-theme");
    toggle.textContent = isDark ? "☀️ Світла тема" : "🌙 Темна тема";
    toggle.setAttribute("aria-pressed", isDark);
}

// При завантаженні: беремо збережений вибір,
// а якщо його немає, то налаштування системи
const saved = localStorage.getItem("theme");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

if (saved === "dark" || (saved === null && systemDark)) {
    root.classList.add("dark-theme");
}
updateButton();

// Клік по кнопці: перемикаємо клас і запам'ятовуємо вибір
toggle.addEventListener("click", () => {
    root.classList.toggle("dark-theme");
    const isDark = root.classList.contains("dark-theme");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateButton();
});