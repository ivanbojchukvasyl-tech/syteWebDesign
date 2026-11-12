/* ===== Перемикач теми (практичні 9, 15, 16) ===== */
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

const cards = document.querySelectorAll("#catalog article");
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

function showFieldState(input, errorId, errorText) {
    const errorElement = document.querySelector("#" + errorId);
    errorElement.textContent = errorText;
    input.classList.toggle("invalid", errorText !== "");
    input.classList.toggle("valid", errorText === "" && input.value.trim() !== "");
}

// Inline-валідація під час вводу
nameInput.addEventListener("input", () => {
    showFieldState(nameInput, "name-error", validateName());
});
emailInput.addEventListener("input", () => {
    showFieldState(emailInput, "email-error", validateEmail());
});
messageInput.addEventListener("input", () => {
    showFieldState(messageInput, "message-error", validateMessage());
});

/* ===== Практична 18: POST через fetch ===== */
const API_URL = "https://jsonplaceholder.typicode.com/posts";
const submitButton = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        message: messageInput.value.trim()
    };

    const nameError = validateName();
    const emailError = validateEmail();
    const messageError = validateMessage();

    showFieldState(nameInput, "name-error", nameError);
    showFieldState(emailInput, "email-error", emailError);
    showFieldState(messageInput, "message-error", messageError);

    if (nameError || emailError || messageError) {
        formMessage.textContent = "Виправте помилки у формі та спробуйте ще раз.";
        formMessage.className = "form-message error";
        return;
    }

    const defaultText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Надсилання…";
    formMessage.textContent = "";
    formMessage.className = "form-message";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error("Сервер повернув помилку: " + response.status);
        }

        const result = await response.json();
        console.log("Відповідь сервера:", result);

        formMessage.textContent = "Дякуємо, " + data.name + "! Повідомлення надіслано (id: " + result.id + ").";
        formMessage.className = "form-message success";

        form.reset();
        [nameInput, emailInput, messageInput].forEach((input) => {
            input.classList.remove("valid", "invalid");
        });
    } catch (error) {
        console.error("Помилка відправки:", error);

        if (error instanceof TypeError) {
            formMessage.textContent = "Немає з'єднання з інтернетом. Перевірте мережу й спробуйте ще раз.";
        } else {
            formMessage.textContent = "Не вдалося надіслати повідомлення. Спробуйте пізніше.";
        }
        formMessage.className = "form-message error";
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = defaultText;
    }
});

/* ===== Практична 18: GET і відгуки на сторінці ===== */
async function loadReviews() {
    const list = document.querySelector("#reviews-list");
    const status = document.querySelector("#reviews-status");

    if (!list || !status) return;

    status.textContent = "Завантаження відгуків…";
    status.className = "form-message";

    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=3");

        if (!response.ok) {
            throw new Error("Помилка сервера: " + response.status);
        }

        const posts = await response.json();
        list.innerHTML = "";

        posts.forEach((post) => {
            const review = document.createElement("article");
            review.className = "review";

            const reviewTitle = document.createElement("h3");
            reviewTitle.textContent = post.title;

            const text = document.createElement("p");
            text.textContent = post.body;

            review.append(reviewTitle, text);
            list.append(review);
        });

        status.textContent = "";
    } catch (error) {
        console.error("Не вдалося завантажити відгуки:", error);
        status.textContent = "Не вдалося завантажити відгуки. Перевірте з'єднання.";
        status.className = "form-message error";
    }
}

loadReviews();