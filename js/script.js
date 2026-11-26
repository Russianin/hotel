/* День 12: основы JavaScript и работа с DOM */

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- бургер-меню ---------- */

function closeMenu() {
  const menu = qs('[data-mobile-menu]');
  const toggle = qs('[data-nav-toggle]');
  if (!menu || !menu.classList.contains('is-open')) return;
  menu.classList.remove('is-open');
  menu.setAttribute('aria-hidden', 'true');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('modal-open');
}

function initMenu() {
  const toggle = qs('[data-nav-toggle]');
  const menu = qs('[data-mobile-menu]');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('modal-open', open);
  });
  qsa('a', menu).forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

/* ---------- валидация полей ---------- */

function setFieldError(input, message) {
  const field = input.closest('.field');
  if (!field) return;
  field.classList.add('has-error');
  const errorText = qs('[data-error-for="' + input.name + '"]', field);
  if (errorText) errorText.textContent = message;
}

function clearFieldError(input) {
  const field = input.closest('.field');
  if (!field) return;
  field.classList.remove('has-error');
  const errorText = qs('[data-error-for="' + input.name + '"]', field);
  if (errorText) errorText.textContent = '';
}

function validateRequired(input) {
  return input.value.trim().length > 0;
}

function validateEmail(input) {
  return EMAIL_RE.test(input.value.trim());
}

/* ---------- модальное окно ---------- */

function escListener(event) {
  if (event.key === 'Escape') closeModal();
}

function closeModal() {
  const overlay = qs('.modal');
  if (!overlay) return;
  overlay.remove();
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', escListener);
}

function showModal(title, text) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.innerHTML =
    '<div class="modal__window" role="dialog" aria-modal="true">' +
    '<button class="modal__close" type="button" aria-label="Закрыть окно">&#215;</button>' +
    '<h2 class="modal__title"></h2>' +
    '<p class="modal__text"></p>' +
    '<button class="btn modal__ok" type="button">Хорошо</button>' +
    '</div>';
  qs('.modal__title', overlay).textContent = title;
  qs('.modal__text', overlay).textContent = text;
  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal();
  });
  qs('.modal__close', overlay).addEventListener('click', closeModal);
  qs('.modal__ok', overlay).addEventListener('click', closeModal);
  document.addEventListener('keydown', escListener);
}

/* ---------- форма обратной связи ---------- */

function validateContactForm(form) {
  let valid = true;
  const name = qs('#contact-name', form);
  const email = qs('#contact-email', form);
  const message = qs('#contact-message', form);
  const consent = qs('input[name="consent"]', form);
  [name, email, message].forEach(clearFieldError);
  if (!validateRequired(name)) {
    setFieldError(name, 'Укажите, как к вам обращаться');
    valid = false;
  }
  if (email.value.trim() && !validateEmail(email)) {
    setFieldError(email, 'Проверьте адрес почты — не хватает «@» или точки');
    valid = false;
  }
  if (!validateRequired(message)) {
    setFieldError(message, 'Напишите пару слов — мы отвечаем в течение дня');
    valid = false;
  }
  if (consent && !consent.checked) {
    valid = false;
  }
  return valid;
}

function initContactForm() {
  const form = qs('[data-contact-form]');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateContactForm(form)) return;
    form.reset();
    showModal('Сообщение отправлено', 'Спасибо! Мы прочитаем его и ответим на почту в течение дня.');
  });
  qsa('input, textarea', form).forEach((input) => {
    input.addEventListener('input', () => clearFieldError(input));
  });
}

/* ---------- форма бронирования ---------- */

function validateBookingForm(form) {
  let valid = true;
  const checkIn = qs('#booking-checkin', form);
  const checkOut = qs('#booking-checkout', form);
  const name = qs('#booking-name', form);
  const email = qs('#booking-email', form);
  [checkIn, checkOut, name, email].forEach(clearFieldError);
  if (!validateRequired(checkIn.value) || !validateRequired(checkOut.value)) {
    setFieldError(name, 'Выберите даты заезда и выезда');
    valid = false;
  } else if (checkOut.value <= checkIn.value) {
    setFieldError(name, 'Выезд не может быть раньше заезда');
    valid = false;
  }
  if (!validateRequired(name)) {
    setFieldError(name, 'Укажите, как к вам обращаться');
    valid = false;
  }
  if (!validateEmail(email)) {
    setFieldError(email, 'Проверьте адрес почты — не хватает «@» или точки');
    valid = false;
  }
  return valid;
}

function initBookingForm() {
  const form = qs('[data-booking-form]');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateBookingForm(form)) return;
    form.reset();
    showModal('Бронь принята', 'Мы забронировали номер и отправили подтверждение на почту. До встречи в Тихом переулке!');
  });
  qsa('input', form).forEach((input) => {
    input.addEventListener('input', () => clearFieldError(input));
  });
}

/* ---------- подписка на рассылку ---------- */

function initNewsletter() {
  qsa('.newsletter').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = qs('input[type="email"]', form);
      if (!validateEmail(input)) {
        input.focus();
        return;
      }
      form.reset();
      showModal('Вы подписались', 'Будем писать только о свободных номерах и тихих новостях. Никакого спама.');
    });
  });
}

/* ---------- запуск ---------- */

initMenu();
initContactForm();
initBookingForm();
initNewsletter();