/* ===== Перемикач теми (практична 9) ===== */
const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");

function updateButton() {
    const isDark = root.classList.contains("dark-theme");
    toggle.textContent = isDark ? "☀️ Світла тема" : "🌙 Темна тема";
    toggle.setAttribute("aria-pressed", isDark);
}

const saved = localStorage.getItem("theme");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

if (saved === "dark" || (saved === null && systemDark)) {
    root.classList.add("dark-theme");
}
updateButton();

toggle.addEventListener("click", () => {
    root.classList.toggle("dark-theme");
    const isDark = root.classList.contains("dark-theme");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateButton();
});

/* ===== Практична 14: базові скрипти та DOM ===== */

// Крок 2: змінні з даними проєкту
const siteName = "MarketPlace";
const products = ["Смартфон", "Ноутбук", "Планшет", "Навушники", "Смарт-годинник", "Клавіатура"];

// Крок 3: вивід у консоль
console.log("Назва сайту:", siteName);
console.log("Товари:", products);
console.log("Кількість товарів у масиві:", products.length);

// Крок 4: вибір елемента (querySelector)
const title = document.querySelector("h1");
console.log("Заголовок h1:", title.textContent);

// Крок 5 + додаткове завдання: поточний рік у футері
const yearElement = document.querySelector("#year");
yearElement.textContent = new Date().getFullYear();

// Крок 6: вибір кількох елементів (querySelectorAll)
const cards = document.querySelectorAll(".cards article");
console.log("Кількість карток на сторінці:", cards.length);

// Крок 7: додавання CSS-класу (підсвітка активного пункту меню)
const navLinks = document.querySelectorAll("nav a");

navLinks.forEach((link) => {
    link.addEventListener("click", () => {
        navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
    });
});

// На старті підсвічуємо перший пункт («Головна»)
navLinks[0].classList.add("active");