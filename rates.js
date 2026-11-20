/* ==========================================================
   Сторінка «Курси валют»: робота із зовнішніми API
   Джерела:
   - НБУ (USD, EUR → UAH): https://bank.gov.ua/NBUStatService/v1/statdirect/exchange
   - CoinGecko (BTC → USD, UAH): https://api.coingecko.com/api/v3/simple/price
   ========================================================== */

/* ===== Перемикач теми (той самий, що на головній) ===== */
const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");

function updateThemeButton() {
    const isLight = root.classList.contains("light-theme");
    toggle.textContent = isLight ? "☀️ Змінити тему" : "🌙 Змінити тему";
    toggle.setAttribute("aria-pressed", isLight);
}

try {
    if (localStorage.getItem("theme") === "light") {
        root.classList.add("light-theme");
    }
} catch (e) {
    /* localStorage недоступний — лишається темна тема */
}
updateThemeButton();

toggle.addEventListener("click", () => {
    root.classList.toggle("light-theme");
    const isLight = root.classList.contains("light-theme");
    try {
        localStorage.setItem("theme", isLight ? "light" : "dark");
    } catch (e) { /* ігноруємо */ }
    updateThemeButton();
});

document.querySelector("#year").textContent = new Date().getFullYear();

/* ===== Налаштування ===== */
const NBU_URL = (code) =>
    "https://bank.gov.ua/NBUStatService/v1/statdirect/exchange?valcode=" + code + "&json";
const BTC_URL =
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,uah&include_24hr_change=true";

// Резервне джерело (ринкові курси), якщо API НБУ недоступне з браузера
const FALLBACK_URL = "https://open.er-api.com/v6/latest/USD";

const REFRESH_INTERVAL_MS = 60000;
const REQUEST_TIMEOUT_MS = 8000;

/* ===== Стан ===== */
const rates = { USD: null, EUR: null, BTC_USD: null, BTC_UAH: null };
const previous = { USD: null, EUR: null };
let isLoading = false;
let timerId = null;

/* ===== Елементи ===== */
const refreshButton = document.querySelector("#rates-refresh");
const statusElement = document.querySelector("#rates-status");
const updatedElement = document.querySelector("#rates-updated");

/* ===== Форматування ===== */
function formatNumber(value, min, max) {
    return new Intl.NumberFormat("uk-UA", {
        minimumFractionDigits: min,
        maximumFractionDigits: max
    }).format(value);
}

const formatUah = (v) => formatNumber(v, 2, 4) + " грн";
const formatUsd = (v) => "$" + formatNumber(v, 0, 0);

/* ===== Мережа ===== */
async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function getNbuRate(code) {
    const data = await fetchJson(NBU_URL(code));
    const item = Array.isArray(data) ? data[0] : null;
    if (!item || typeof item.rate !== "number") {
        throw new Error("Некоректна відповідь НБУ");
    }
    return { rate: item.rate, date: item.exchangedate, source: "nbu" };
}

// Резервне джерело: один запит дає і USD, і EUR відносно гривні
let fallbackPromise = null;

async function getFallbackRates() {
    const data = await fetchJson(FALLBACK_URL);
    const r = data && data.rates;
    if (!r || typeof r.UAH !== "number" || typeof r.EUR !== "number") {
        throw new Error("Некоректна відповідь резервного джерела");
    }
    const date = new Date(data.time_last_update_utc).toLocaleDateString("uk-UA");
    return {
        USD: { rate: r.UAH, date, source: "fallback" },
        EUR: { rate: r.UAH / r.EUR, date, source: "fallback" }
    };
}

// Спочатку НБУ, у разі помилки — резервне джерело
async function getFiatRate(code) {
    try {
        return await getNbuRate(code);
    } catch (nbuError) {
        console.warn("НБУ недоступний для " + code + ", використовуємо резервне джерело:", nbuError);
        if (!fallbackPromise) fallbackPromise = getFallbackRates();
        const all = await fallbackPromise;
        return all[code];
    }
}

async function getBitcoin() {
    const data = await fetchJson(BTC_URL);
    const btc = data && data.bitcoin;
    if (!btc || typeof btc.usd !== "number" || typeof btc.uah !== "number") {
        throw new Error("Некоректна відповідь CoinGecko");
    }
    return { usd: btc.usd, uah: btc.uah, change24h: btc.usd_24h_change };
}

/* ===== Відображення ===== */
function setChange(element, text, direction) {
    element.textContent = text;
    element.classList.remove("up", "down");
    if (direction) element.classList.add(direction);
}

function flash(element) {
    element.classList.remove("updated");
    void element.offsetWidth; // перезапуск анімації
    element.classList.add("updated");
}

function showCardError(id, message) {
    const card = document.querySelector("#card-" + id);
    const value = document.querySelector("#" + id + "-value");
    card.classList.add("is-error");
    card.setAttribute("aria-busy", "false");
    value.textContent = message;
}

function clearCardError(id) {
    const card = document.querySelector("#card-" + id);
    card.classList.remove("is-error");
    card.setAttribute("aria-busy", "false");
}

function renderFiat(code, result) {
    const id = code.toLowerCase();
    const valueElement = document.querySelector("#" + id + "-value");
    const changeElement = document.querySelector("#" + id + "-change");
    const noteElement = document.querySelector("#" + id + "-note");

    clearCardError(id);

    const oldValue = previous[code];
    rates[code] = result.rate;

    valueElement.textContent = formatUah(result.rate);
    noteElement.textContent = result.source === "nbu"
        ? "Офіційний курс НБУ на " + result.date
        : "Ринковий курс (резервне джерело) на " + result.date;

    if (oldValue !== null && oldValue !== result.rate) {
        const diff = result.rate - oldValue;
        const arrow = diff > 0 ? "▲ +" : "▼ ";
        setChange(
            changeElement,
            arrow + formatNumber(diff, 2, 4) + " грн з попереднього оновлення",
            diff > 0 ? "up" : "down"
        );
        flash(valueElement);
    } else if (oldValue === null) {
        setChange(changeElement, "", null);
    }

    previous[code] = result.rate;
}

function renderBitcoin(result) {
    const valueElement = document.querySelector("#btc-value");
    const changeElement = document.querySelector("#btc-change");
    const uahElement = document.querySelector("#btc-uah");

    clearCardError("btc");

    const changed = rates.BTC_USD !== null && rates.BTC_USD !== result.usd;
    rates.BTC_USD = result.usd;
    rates.BTC_UAH = result.uah;

    valueElement.textContent = formatUsd(result.usd);
    uahElement.textContent = formatNumber(result.uah, 0, 0);

    if (typeof result.change24h === "number") {
        const pct = result.change24h;
        const arrow = pct >= 0 ? "▲ +" : "▼ ";
        setChange(
            changeElement,
            arrow + formatNumber(pct, 2, 2) + " % за 24 год",
            pct >= 0 ? "up" : "down"
        );
    } else {
        setChange(changeElement, "", null);
    }

    if (changed) flash(valueElement);
}

/* ===== Завантаження всіх курсів ===== */
async function loadRates() {
    if (isLoading) return;
    isLoading = true;
    refreshButton.disabled = true;
    refreshButton.textContent = "Оновлення…";
    statusElement.textContent = "";
    statusElement.className = "form-message";
    fallbackPromise = null;

    const [usd, eur, btc] = await Promise.allSettled([
        getFiatRate("USD"),
        getFiatRate("EUR"),
        getBitcoin()
    ]);

    let failed = 0;

    if (usd.status === "fulfilled") renderFiat("USD", usd.value);
    else { failed++; console.error("USD:", usd.reason); if (rates.USD === null) showCardError("usd", "Немає даних"); }

    if (eur.status === "fulfilled") renderFiat("EUR", eur.value);
    else { failed++; console.error("EUR:", eur.reason); if (rates.EUR === null) showCardError("eur", "Немає даних"); }

    if (btc.status === "fulfilled") renderBitcoin(btc.value);
    else { failed++; console.error("BTC:", btc.reason); if (rates.BTC_USD === null) showCardError("btc", "Немає даних"); }

    if (failed === 0) {
        updatedElement.textContent = "Оновлено о " + new Date().toLocaleTimeString("uk-UA");
    } else if (failed === 3) {
        statusElement.textContent = "Не вдалося отримати курси. Перевірте з'єднання — спробуємо ще раз за хвилину.";
        statusElement.className = "form-message error";
    } else {
        statusElement.textContent = "Частину курсів не вдалося оновити. Показано останні відомі значення.";
        statusElement.className = "form-message error";
        updatedElement.textContent = "Оновлено частково о " + new Date().toLocaleTimeString("uk-UA");
    }

    updateConverter();

    isLoading = false;
    refreshButton.disabled = false;
    refreshButton.textContent = "Оновити зараз";
}

/* ===== Автооновлення ===== */
function startAutoRefresh() {
    stopAutoRefresh();
    timerId = setInterval(loadRates, REFRESH_INTERVAL_MS);
}

function stopAutoRefresh() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
}

// Не навантажуємо API, поки вкладка неактивна
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        loadRates();
        startAutoRefresh();
    }
});

refreshButton.addEventListener("click", () => {
    loadRates();
    startAutoRefresh(); // скидаємо таймер після ручного оновлення
});

/* ===== Калькулятор обміну ===== */
const amountInput = document.querySelector("#conv-amount");
const fromSelect = document.querySelector("#conv-from");
const toSelect = document.querySelector("#conv-to");
const resultElement = document.querySelector("#conv-result");

// Вартість однієї одиниці валюти в гривнях
function getUahPrice(code) {
    if (code === "UAH") return 1;
    if (code === "USD") return rates.USD;
    if (code === "EUR") return rates.EUR;
    if (code === "BTC") return rates.BTC_UAH;
    return null;
}

function updateConverter() {
    const raw = amountInput.value.trim().replace(",", ".");
    resultElement.className = "converter__result";

    if (raw === "" || !/^\d+(\.\d+)?$/.test(raw)) {
        resultElement.textContent = "Введіть суму числом, наприклад 100 або 0.5";
        resultElement.classList.add("error");
        return;
    }

    const from = fromSelect.value;
    const to = toSelect.value;
    const fromPrice = getUahPrice(from);
    const toPrice = getUahPrice(to);

    if (fromPrice === null || toPrice === null) {
        resultElement.textContent = "Чекаємо на дані курсів…";
        resultElement.classList.add("error");
        return;
    }

    const result = (Number(raw) * fromPrice) / toPrice;
    const digits = to === "BTC" ? 8 : 2;

    resultElement.textContent =
        formatNumber(Number(raw), 0, 8) + " " + from + " = " + formatNumber(result, 2, digits) + " " + to;
}

amountInput.addEventListener("input", updateConverter);
fromSelect.addEventListener("change", updateConverter);
toSelect.addEventListener("change", updateConverter);
document.querySelector("#converter-form").addEventListener("submit", (e) => e.preventDefault());

/* ===== Старт ===== */
updateConverter();
loadRates();
startAutoRefresh();
