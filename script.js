/* ===== Перемикач теми (практична 9, кроки 1-2 практичної 15) ===== */
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
const siteName = "MarketPlace";
const products = ["Смартфон", "Ноутбук", "Планшет", "Навушники", "Смарт-годинник", "Клавіатура"];

console.log("Назва сайту:", siteName);
console.log("Товари:", products);

const title = document.querySelector("h1");
console.log("Заголовок h1:", title.textContent);

const yearElement = document.querySelector("#year");
if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

const cards = document.querySelectorAll(".cards article");
console.log("Кількість карток на сторінці:", cards.length);

const navLinks = document.querySelectorAll("nav a");
navLinks.forEach((link) => {
    link.addEventListener("click", () => {
        navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
    });
});
navLinks[0].classList.add("active");

/* ===== Практична 15: форма та валідація ===== */
const form = document.querySelector("#contact-form");
const nameInput = document.querySelector("#name");
const emailInput = document.querySelector("#email");
const messageInput = document.querySelector("#message");
const formMessage = document.querySelector("#form-message");

// Перевірки: повертають текст помилки або порожній рядок, якщо все гаразд
function validateName() {
    const value = nameInput.value.trim();
    if (value === "") return "Введіть ім'я.";
    if (value.length < 2) return "Ім'я має містити щонайменше 2 символи.";
    return "";
}

function validateEmail() {
    const value = emailInput.value.trim();
    if (value === "") return "Введіть електронну пошту.";
    if (!value.includes("@")) return "Пошта має містити символ «@».";
    // проста перевірка формату: щось@щось.щось
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!pattern.test(value)) return "Введіть коректну адресу, наприклад name@example.com.";
    return "";
}

function validateMessage() {
    const value = messageInput.value.trim();
    if (value === "") return "Введіть повідомлення.";
    if (value.length < 10) return "Повідомлення має містити щонайменше 10 символів.";
    return "";
}

// Показує помилку під полем і підсвічує його
function showFieldState(input, errorId, errorText) {
    const errorElement = document.querySelector("#" + errorId);
    errorElement.textContent = errorText;
    input.classList.toggle("invalid", errorText !== "");
    input.classList.toggle("valid", errorText === "" && input.value.trim() !== "");
}

// Додаткове завдання: inline-перевірка під час вводу
nameInput.addEventListener("input", () => {
    showFieldState(nameInput, "name-error", validateName());
});
emailInput.addEventListener("input", () => {
    showFieldState(emailInput, "email-error", validateEmail());
});
messageInput.addEventListener("input", () => {
    showFieldState(messageInput, "message-error", validateMessage());
});

// Кроки 3-6: обробка відправки форми
form.addEventListener("submit", (event) => {
    event.preventDefault(); // сторінка не перезавантажується

    // Крок 4: значення полів
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();

    // Крок 5: валідація
    const nameError = validateName();
    const emailError = validateEmail();
    const messageError = validateMessage();

    showFieldState(nameInput, "name-error", nameError);
    showFieldState(emailInput, "email-error", emailError);
    showFieldState(messageInput, "message-error", messageError);

    // Крок 6: повідомлення на сторінці
    if (nameError || emailError || messageError) {
        formMessage.textContent = "Виправте помилки у формі та спробуйте ще раз.";
        formMessage.className = "form-message error";
        return;
    }

    console.log("Дані форми:", { name, email, message });

    formMessage.textContent = "Дякуємо, " + name + "! Ваше повідомлення надіслано.";
    formMessage.className = "form-message success";

    form.reset();
    [nameInput, emailInput, messageInput].forEach((input) => {
        input.classList.remove("valid", "invalid");
    });
});