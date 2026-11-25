import { request, validateEmail } from './api.js';
export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
export function showToast(message, type = 'success') {
  const region = qs('[data-toast-region]');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' toast--error' : ''}`;
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => {
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 320);
  }, 4200);
}
export function clearErrors(form) {
  qsa('.field__error', form).forEach((element) => {
    element.textContent = '';
  });
  qsa('.has-error', form).forEach((element) => element.classList.remove('has-error'));
  qsa('[data-booking-error], [data-contact-error]', form).forEach((element) => {
    element.textContent = '';
  });
}
export function showFieldErrors(form, fields = {}) {
  Object.entries(fields).forEach(([name, message]) => {
    const holder = form.querySelector(`[data-error-for="${name}"]`);
    if (holder) holder.textContent = message;
    const input = form.elements.namedItem(name);
    if (input && typeof input.closest === 'function') {
      const wrapper = input.closest('.field') || input.closest('.checkbox');
      if (wrapper) wrapper.classList.add('has-error');
    }
  });
}
export function initHeader() {
  const header = qs('[data-header]');
  const toggle = qs('[data-nav-toggle]');
  const menu = qs('[data-mobile-menu]');
  if (!header || !toggle || !menu) return;
  const isOverHero = header.classList.contains('site-header--over-hero');
  const setMenu = (open) => {
    header.classList.toggle('is-menu-open', open);
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('no-scroll', open);
    menu.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };
  toggle.addEventListener('click', () => {
    setMenu(!menu.classList.contains('is-open'));
  });
  qsa('a', menu).forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
  });
  const desktop = window.matchMedia('(min-width: 1101px)');
  desktop.addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });
  if (isOverHero) {
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 30);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
}
export function initReveal() {
  const items = qsa('[data-reveal]');
  if (!items.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-revealed'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -7% 0px', threshold: 0.08 },
  );
  items.forEach((item) => {
    const rect = item.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      item.classList.add('is-revealed');
      return;
    }
    observer.observe(item);
  });
}
export function initReviewSlider() {
  const track = qs('[data-reviews-track]');
  const prev = qs('[data-reviews-prev]');
  const next = qs('[data-reviews-next]');
  if (!track || !prev || !next) return;
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= max - 4;
  };
  const scrollByCard = (direction) => {
    const card = track.querySelector('.review-card');
    const gap = 24;
    const step = card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  };
  prev.addEventListener('click', () => scrollByCard(-1));
  next.addEventListener('click', () => scrollByCard(1));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
  window.setTimeout(update, 500);
}
export function initNewsletter() {
  const form = qs('[data-newsletter-form]');
  if (!form) return;
  const status = qs('[data-newsletter-status]');
  const input = qs('input[type="email"]', form);
  const button = qs('button[type="submit"]', form);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateEmail(input.value)) {
      status.textContent = 'Введите корректный e-mail.';
      status.classList.add('is-error');
      input.focus();
      return;
    }
    status.textContent = 'Подписываем…';
    status.classList.remove('is-error');
    button.disabled = true;
    try {
      const data = await request('/api/subscribe', {
        method: 'POST',
        body: { email: input.value.trim() },
      });
      status.textContent = data.message;
      form.reset();
      showToast('Вы подписаны на тихие новости.');
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('is-error');
    } finally {
      button.disabled = false;
    }
  });
}
export function setButtonState(button, disabled, label) {
  if (!button) return;
  button.disabled = disabled;
  if (label) {
    const labelElement = button.querySelector('[data-submit-label]');
    if (labelElement) labelElement.textContent = label;
    else button.textContent = label;
  }
}
