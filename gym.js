/* ==========================================================
   Animal Gym: розклад тижня із записом на заняття
   - розклад по днях тижня (вкладки)
   - замовлення квитка на перше заняття за 450 грн
   - відправка замовлення через fetch (POST), стани завантаження й помилок
   - "Мої записи" зберігаються в localStorage
   ========================================================== */
(() => {
    "use strict";

    /* ----- Налаштування ----- */
    const PRICE = 450;
    const API_URL = "https://jsonplaceholder.typicode.com/posts";
    const TICKETS_KEY = "animalgym-tickets";
    const BOOKING_LEAD_MS = 2 * 60 * 60 * 1000;   // записатися можна за 2 год до початку
    const CANCEL_LEAD_MS = 12 * 60 * 60 * 1000;   // безкоштовне скасування за 12 год
    const KEEP_AFTER_MS = 3 * 60 * 60 * 1000;     // скільки зберігати квиток після заняття
    const USED_KEY = "animalgym-first-used";      // квиток згорів: пізнє скасування або заняття минуло

    const DAYS = [
        { num: 1, short: "Пн", full: "Понеділок" },
        { num: 2, short: "Вт", full: "Вівторок" },
        { num: 3, short: "Ср", full: "Середа" },
        { num: 4, short: "Чт", full: "Четвер" },
        { num: 5, short: "Пт", full: "П'ятниця" },
        { num: 6, short: "Сб", full: "Субота" },
        { num: 7, short: "Нд", full: "Неділя" }
    ];

    /* ----- Дані розкладу ----- */
    const s = (day, time, title, trainer, level, duration, capacity, booked) => ({
        id: `d${day}-${time.replace(":", "")}`,
        day, time, title, trainer, level, duration, capacity, booked
    });

    const SCHEDULE = {
        1: [
            s(1, "07:30", "Eagle Cardio", "Олена Коваль", "Початковий", 60, 12, 7),
            s(1, "12:00", "Tiger Strength", "Максим Дорош", "Середній", 60, 10, 6),
            s(1, "18:30", "Wolf HIIT", "Андрій Мельник", "Просунутий", 45, 14, 11),
            s(1, "20:00", "Panther Yoga", "Ірина Лис", "Початковий", 60, 12, 5)
        ],
        2: [
            s(2, "08:00", "Monkey Mobility", "Ірина Лис", "Початковий", 45, 12, 4),
            s(2, "17:30", "Bear Boxing", "Андрій Мельник", "Середній", 60, 10, 9),
            s(2, "19:00", "Tiger Strength", "Максим Дорош", "Середній", 60, 10, 8)
        ],
        3: [
            s(3, "07:30", "Eagle Cardio", "Олена Коваль", "Початковий", 60, 12, 6),
            s(3, "12:00", "Panther Yoga", "Ірина Лис", "Початковий", 60, 12, 3),
            s(3, "18:30", "Wolf HIIT", "Андрій Мельник", "Просунутий", 45, 14, 12),
            s(3, "20:00", "Monkey Mobility", "Ірина Лис", "Початковий", 45, 12, 5)
        ],
        4: [
            s(4, "08:00", "Tiger Strength", "Максим Дорош", "Середній", 60, 10, 4),
            s(4, "17:30", "Bear Boxing", "Андрій Мельник", "Середній", 60, 10, 7),
            s(4, "19:00", "Eagle Cardio", "Олена Коваль", "Початковий", 60, 12, 10)
        ],
        5: [
            s(5, "07:30", "Wolf HIIT", "Андрій Мельник", "Просунутий", 45, 14, 8),
            s(5, "12:00", "Monkey Mobility", "Ірина Лис", "Початковий", 45, 12, 2),
            s(5, "18:00", "Panther Yoga", "Ірина Лис", "Початковий", 60, 12, 9),
            s(5, "19:30", "Tiger Strength", "Максим Дорош", "Середній", 60, 10, 10)
        ],
        6: [
            s(6, "10:00", "Eagle Cardio", "Олена Коваль", "Початковий", 60, 14, 9),
            s(6, "11:15", "Bear Boxing", "Андрій Мельник", "Середній", 60, 10, 5),
            s(6, "12:30", "Panther Yoga", "Ірина Лис", "Початковий", 60, 12, 6)
        ],
        7: [
            s(7, "11:00", "Panther Yoga", "Ірина Лис", "Початковий", 60, 12, 4),
            s(7, "12:15", "Monkey Mobility", "Ірина Лис", "Початковий", 45, 12, 3)
        ]
    };

    /* ----- Елементи сторінки ----- */
    const root = document.documentElement;
    const themeToggle = document.querySelector("#theme-toggle");
    const yearEl = document.querySelector("#year");
    const dayTabs = document.querySelector("#day-tabs");
    const notice = document.querySelector("#schedule-notice");
    const sessionsTitle = document.querySelector("#sessions-title");
    const sessionsList = document.querySelector("#sessions");
    const ticketsList = document.querySelector("#tickets-list");

    const dialog = document.querySelector("#booking-dialog");
    const closeButton = document.querySelector("#booking-close");
    const form = document.querySelector("#booking-form");
    const summary = document.querySelector("#booking-summary");
    const nameInput = document.querySelector("#booking-name");
    const phoneInput = document.querySelector("#booking-phone");
    const emailInput = document.querySelector("#booking-email");
    const termsInput = document.querySelector("#booking-terms");
    const termsLink = document.querySelector("#booking-terms-link");
    const messageEl = document.querySelector("#booking-message");
    const submitButton = document.querySelector("#booking-submit");
    const ticketBox = document.querySelector("#booking-ticket");

    /* ----- Стан ----- */
    const todayNum = new Date().getDay() === 0 ? 7 : new Date().getDay();
    const state = {
        day: 0,   // 0 = весь тиждень, 1-7 = окремий день
        tickets: loadTickets(),
        current: null
    };

    /* ----- Допоміжні функції ----- */
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function formatDateTime(date) {
        return capitalize(new Intl.DateTimeFormat("uk-UA", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date));
    }

    function formatShortDate(date) {
        return new Intl.DateTimeFormat("uk-UA", {
            weekday: "short",
            day: "numeric",
            month: "long"
        }).format(date);
    }

    // Найближча дата заняття, на яку ще можна записатися
    function nextOccurrence(day, time) {
        const [hours, minutes] = time.split(":").map(Number);
        const now = new Date();
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        date.setDate(date.getDate() + ((day - todayNum + 7) % 7));
        while (date.getTime() - now.getTime() < BOOKING_LEAD_MS) {
            date.setDate(date.getDate() + 7);
        }
        return date;
    }

    function generateCode() {
        const random = Math.random().toString(36).slice(2, 7).toUpperCase();
        return `AG-${random}`;
    }

    /* ----- Тема (та сама логіка, що на головній сторінці) ----- */
    function updateThemeButton() {
        const isLight = root.classList.contains("light-theme");
        themeToggle.textContent = isLight ? "☀️ Змінити тему" : "🌙 Змінити тему";
        themeToggle.setAttribute("aria-pressed", String(isLight));
    }

    themeToggle.addEventListener("click", () => {
        root.classList.toggle("light-theme");
        const isLight = root.classList.contains("light-theme");
        try {
            localStorage.setItem("theme", isLight ? "light" : "dark");
        } catch (error) {
            console.warn("Не вдалося зберегти тему:", error);
        }
        updateThemeButton();
    });

    /* ----- Квитки (localStorage) ----- */
    function loadTickets() {
        try {
            const saved = JSON.parse(localStorage.getItem(TICKETS_KEY));
            const list = Array.isArray(saved) ? saved : [];
            const now = Date.now();
            // Прибираємо квитки, заняття за якими вже минуло
            const active = list.filter((ticket) => new Date(ticket.dateISO).getTime() + KEEP_AFTER_MS > now);

            // Заняття минуло: квиток використано (або згорів), повторно він не діє
            if (active.length < list.length) {
                markFirstTicketUsed();
                localStorage.setItem(TICKETS_KEY, JSON.stringify(active));
            }
            return active;
        } catch (error) {
            return [];
        }
    }

    function markFirstTicketUsed() {
        try {
            localStorage.setItem(USED_KEY, "1");
        } catch (error) {
            console.warn("Не вдалося зберегти стан квитка:", error);
        }
    }

    function isFirstTicketUsed() {
        try {
            return localStorage.getItem(USED_KEY) === "1";
        } catch (error) {
            return false;
        }
    }

    function saveTickets() {
        try {
            localStorage.setItem(TICKETS_KEY, JSON.stringify(state.tickets));
        } catch (error) {
            console.warn("Не вдалося зберегти квитки:", error);
        }
    }

    function hasActiveTicket() {
        return state.tickets.length > 0;
    }

    function ticketForSession(sessionId) {
        return state.tickets.find((ticket) => ticket.sessionId === sessionId);
    }

    function spotsLeft(session) {
        return session.capacity - session.booked - (ticketForSession(session.id) ? 1 : 0);
    }

    /* ----- Розклад ----- */
    function renderTabs() {
        dayTabs.replaceChildren();
        [{ num: 0, short: "Весь тиждень" }, ...DAYS].forEach((day) => {
            const button = el("button", "day-tab", day.short);
            button.type = "button";
            button.dataset.day = day.num;
            button.setAttribute("aria-pressed", String(day.num === state.day));
            if (day.num === todayNum) {
                button.classList.add("day-tab--today");
                button.title = "Сьогодні";
            }
            dayTabs.append(button);
        });
    }

    function renderSessions() {
        const day = DAYS.find((item) => item.num === state.day);
        sessionsTitle.textContent = day
            ? day.full + (day.num === todayNum ? " (сьогодні)" : "")
            : "Весь тиждень";
        sessionsList.replaceChildren();

        // Повідомлення, якщо квиток на перше заняття вже оформлено
        if (hasActiveTicket()) {
            const ticket = state.tickets[0];
            notice.textContent =
                `У вас уже є квиток ${ticket.code} на перше заняття. ` +
                `Скасуйте його в розділі «Мої записи», щоб обрати інше заняття.`;
            notice.hidden = false;
        } else if (isFirstTicketUsed()) {
            notice.textContent =
                "Квиток на перше заняття діє лише один раз на людину, і ви його вже використали.";
            notice.hidden = false;
        } else {
            notice.hidden = true;
        }

        const list = state.day === 0
            ? DAYS.flatMap((item) => SCHEDULE[item.num])
            : SCHEDULE[state.day];

        // Комірка таблиці; data-label потрібен для мобільного вигляду
        const cell = (label, content, className) => {
            const td = el("td", className);
            td.dataset.label = label;
            if (content instanceof Node) {
                td.append(content);
            } else {
                td.textContent = content;
            }
            return td;
        };

        list.forEach((session) => {
            const row = el("tr", "schedule-row");
            const sessionDay = DAYS.find((item) => item.num === session.day);

            const dayCell = el("span", "");
            dayCell.append(
                sessionDay.full,
                el("small", "", `Найближче: ${formatShortDate(nextOccurrence(session.day, session.time))}`)
            );

            const left = spotsLeft(session);
            const spots = el(
                "span",
                left <= 3 ? "session__spots session__spots--low" : "session__spots",
                left > 0 ? String(left) : "Місць немає"
            );

            const button = el("button", "btn btn--primary", "Записатися");
            button.type = "button";
            button.dataset.id = session.id;

            if (ticketForSession(session.id)) {
                button.textContent = "Ви записані";
                button.disabled = true;
            } else if (left <= 0) {
                button.textContent = "Місць немає";
                button.disabled = true;
            } else if (hasActiveTicket()) {
                button.disabled = true;
                button.title = "Спершу скасуйте поточний запис";
            } else if (isFirstTicketUsed()) {
                button.disabled = true;
                button.title = "Квиток на перше заняття уже використано";
            }

            row.append(
                cell("День", dayCell),
                cell("Час", session.time, "data-table__time"),
                cell("Заняття", session.title, "data-table__title"),
                cell("Тренер", session.trainer),
                cell("Рівень", session.level),
                cell("Тривалість", `${session.duration} хв`),
                cell("Вільних місць", spots),
                cell("", button, "data-table__action")
            );
            sessionsList.append(row);
        });
    }

    function findSession(id) {
        return Object.values(SCHEDULE).flat().find((session) => session.id === id);
    }

    /* ----- Мої записи ----- */
    function renderTickets() {
        ticketsList.replaceChildren();

        if (state.tickets.length === 0) {
            ticketsList.append(el("p", "gym-empty", "У вас поки немає записів. Оберіть заняття в розкладі вище."));
            return;
        }

        state.tickets.forEach((ticket) => {
            const card = el("article", "ticket-card");

            const info = el("div", "ticket-card__info");
            info.append(
                el("span", "ticket-card__code", ticket.code),
                el("h3", "ticket-card__title", ticket.title),
                el("p", "ticket-card__meta", formatDateTime(new Date(ticket.dateISO))),
                el("p", "ticket-card__meta", `Тренер: ${ticket.trainer}`),
                el("p", "ticket-card__meta", `${PRICE} грн · оплата на ресепшені`)
            );

            const cancel = el("button", "btn btn--secondary", "Скасувати запис");
            cancel.type = "button";
            cancel.dataset.code = ticket.code;

            card.append(info, cancel);
            ticketsList.append(card);
        });
    }

    function cancelTicket(code) {
        const ticket = state.tickets.find((item) => item.code === code);
        if (!ticket) return;

        const late = new Date(ticket.dateISO).getTime() - Date.now() < CANCEL_LEAD_MS;
        const question = late
            ? "До заняття менше 12 годин: за умовами квиток згорить. Скасувати запис?"
            : "Скасувати запис на заняття?";

        if (!window.confirm(question)) return;

        state.tickets = state.tickets.filter((item) => item.code !== code);
        // Пізнє скасування: квиток згорає і повторно не видається
        if (late) markFirstTicketUsed();
        saveTickets();
        renderSessions();
        renderTickets();
    }

    /* ----- Валідація форми ----- */
    function validateName(value) {
        if (value === "") return "Введіть ім'я та прізвище.";
        if (value.length < 2) return "Ім'я має містити щонайменше 2 символи.";
        return "";
    }

    function validatePhone(value) {
        if (value === "") return "Введіть номер телефону.";
        const digits = value.replace(/\D/g, "");
        if (!/^\+?[\d\s()-]+$/.test(value) || digits.length < 10 || digits.length > 13) {
            return "Введіть коректний номер, наприклад +380 50 123 45 67.";
        }
        return "";
    }

    function validateEmail(value) {
        if (value === "") return "Введіть електронну пошту.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return "Введіть коректну адресу, наприклад name@example.com.";
        }
        return "";
    }

    function showError(id, text) {
        document.querySelector(`#${id}`).textContent = text;
    }

    // Показує помилку під полем і підсвічує саме поле (valid / invalid)
    function showFieldState(input, errorId, text) {
        showError(errorId, text);
        input.classList.toggle("invalid", text !== "");
        input.classList.toggle("valid", text === "" && input.value.trim() !== "");
        input.setAttribute("aria-invalid", String(text !== ""));
    }

    function clearErrors() {
        ["booking-name-error", "booking-phone-error", "booking-email-error", "booking-terms-error"]
            .forEach((id) => showError(id, ""));
        [nameInput, phoneInput, emailInput].forEach((input) => {
            input.classList.remove("valid", "invalid");
            input.removeAttribute("aria-invalid");
        });
        messageEl.textContent = "";
        messageEl.className = "form-message";
    }

    /* ----- Вікно запису ----- */
    function resetBookingView() {
        form.reset();
        form.hidden = false;
        ticketBox.hidden = true;
        ticketBox.replaceChildren();
        clearErrors();
    }

    function openBooking(session) {
        state.current = session;
        resetBookingView();

        const date = nextOccurrence(session.day, session.time);
        summary.replaceChildren(
            el("strong", "", session.title),
            el("span", "", formatDateTime(date)),
            el("span", "", `Тренер: ${session.trainer} · ${session.duration} хв`),
            el("span", "booking__price", `Перше заняття: ${PRICE} грн`)
        );

        dialog.showModal();
        nameInput.focus();
    }

    function showTicket(ticket) {
        const card = el("div", "ticket");
        card.append(
            el("p", "ticket__label", "Квиток оформлено"),
            el("p", "ticket__code", ticket.code),
            el("h3", "ticket__title", ticket.title),
            el("p", "ticket__meta", formatDateTime(new Date(ticket.dateISO))),
            el("p", "ticket__meta", `Тренер: ${ticket.trainer}`),
            el("p", "ticket__meta", `До сплати на ресепшені: ${PRICE} грн`),
            el("p", "ticket__hint", "Покажіть код квитка адміністратору. Приходьте за 10-15 хвилин до початку.")
        );

        const done = el("button", "btn btn--primary", "Готово");
        done.type = "button";
        done.addEventListener("click", () => dialog.close());

        ticketBox.replaceChildren(card, done);
        form.hidden = true;
        ticketBox.hidden = false;
    }

    /* ----- Відправка замовлення (fetch POST) ----- */
    async function sendOrder(order) {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            throw new Error(`Сервер повернув помилку: ${response.status}`);
        }
        return response.json();
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const customer = {
            name: nameInput.value.trim(),
            phone: phoneInput.value.trim(),
            email: emailInput.value.trim()
        };

        const errors = {
            name: validateName(customer.name),
            phone: validatePhone(customer.phone),
            email: validateEmail(customer.email),
            terms: termsInput.checked ? "" : "Підтвердіть, що ви ознайомились з умовами."
        };

        showFieldState(nameInput, "booking-name-error", errors.name);
        showFieldState(phoneInput, "booking-phone-error", errors.phone);
        showFieldState(emailInput, "booking-email-error", errors.email);
        showError("booking-terms-error", errors.terms);

        if (Object.values(errors).some(Boolean)) {
            messageEl.textContent = "Виправте помилки у формі та спробуйте ще раз.";
            messageEl.className = "form-message error";
            return;
        }

        // Захист від повторного замовлення (квиток діє один раз на людину)
        if (hasActiveTicket() || isFirstTicketUsed()) {
            messageEl.textContent = "Квиток на перше заняття вже оформлено або використано.";
            messageEl.className = "form-message error";
            return;
        }

        const session = state.current;
        const date = nextOccurrence(session.day, session.time);
        const order = {
            service: "Animal Gym: перше заняття",
            price: PRICE,
            currency: "UAH",
            session: { id: session.id, title: session.title, dateISO: date.toISOString() },
            customer
        };

        const defaultText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = "Оформлення…";
        messageEl.textContent = "";
        messageEl.className = "form-message";

        try {
            await sendOrder(order);

            const ticket = {
                code: generateCode(),
                sessionId: session.id,
                title: session.title,
                trainer: session.trainer,
                dateISO: date.toISOString(),
                name: customer.name,
                createdAt: new Date().toISOString()
            };

            state.tickets.push(ticket);
            saveTickets();
            renderSessions();
            renderTickets();
            showTicket(ticket);
        } catch (error) {
            console.error("Помилка оформлення квитка:", error);
            messageEl.textContent = error instanceof TypeError
                ? "Немає з'єднання з інтернетом. Перевірте мережу й спробуйте ще раз."
                : "Не вдалося оформити квиток. Спробуйте пізніше.";
            messageEl.className = "form-message error";
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = defaultText;
        }
    }

    /* ----- Обробники подій ----- */
    dayTabs.addEventListener("click", (event) => {
        const button = event.target.closest(".day-tab");
        if (!button) return;
        state.day = Number(button.dataset.day);
        renderTabs();
        renderSessions();
    });

    sessionsList.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-id]");
        if (!button || button.disabled) return;
        const session = findSession(button.dataset.id);
        if (session) openBooking(session);
    });

    ticketsList.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-code]");
        if (button) cancelTicket(button.dataset.code);
    });

    form.addEventListener("submit", handleSubmit);

    // Перевірка полів під час вводу
    nameInput.addEventListener("input", () => {
        showFieldState(nameInput, "booking-name-error", validateName(nameInput.value.trim()));
    });
    phoneInput.addEventListener("input", () => {
        showFieldState(phoneInput, "booking-phone-error", validatePhone(phoneInput.value.trim()));
    });
    emailInput.addEventListener("input", () => {
        showFieldState(emailInput, "booking-email-error", validateEmail(emailInput.value.trim()));
    });
    termsInput.addEventListener("change", () => {
        if (termsInput.checked) showError("booking-terms-error", "");
    });
    closeButton.addEventListener("click", () => dialog.close());

    // Клік по затемненню за вікном закриває його
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
    });

    // Перехід до умов зі вікна: спершу закриваємо вікно
    termsLink.addEventListener("click", () => dialog.close());

    dialog.addEventListener("close", resetBookingView);


    /* ----- Фото залу: images/animalgym2 з будь-яким поширеним розширенням ----- */
    const photo = document.querySelector(".gym-photo");
    if (photo) {
        const base = "images/animalgym2";
        const candidates = [base, ...["jpg", "jpeg", "png", "webp", "avif", "JPG", "PNG"].map((ext) => `${base}.${ext}`)];

        const tryPhoto = (index) => {
            if (index >= candidates.length) return;
            const probe = new Image();
            probe.onload = () => photo.style.setProperty("--img", `url("${candidates[index]}")`);
            probe.onerror = () => tryPhoto(index + 1);
            probe.src = candidates[index];
        };
        tryPhoto(0);
    }

    /* ----- Старт ----- */
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    updateThemeButton();
    renderTabs();
    renderSessions();
    renderTickets();
})();