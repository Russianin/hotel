const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  }
  if (!response.ok) {
    const error = new Error(data?.error || 'Не удалось выполнить запрос. Попробуйте ещё раз.');
    error.status = response.status;
    error.fields = data?.fields || {};
    throw error;
  }
  return data;
}
export function formatPrice(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('ru-RU').format(Number(value));
}
export function localISO(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function todayISO() {
  return localISO();
}
export function addDaysISO(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localISO(date);
}
export function nightsBetween(checkIn, checkOut) {
  if (!ISO_DATE.test(checkIn || '') || !ISO_DATE.test(checkOut || '')) return 0;
  return Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000);
}
export function formatDate(iso, { year = false, short = false } = {}) {
  if (!ISO_DATE.test(iso || '')) return '—';
  const date = new Date(`${iso}T12:00:00`);
  const options = {
    day: 'numeric',
    month: short ? 'short' : 'long',
  };
  if (year) options.year = 'numeric';
  return date.toLocaleDateString('ru-RU', options).replace(' г.', '');
}
export function formatDateRange(checkIn, checkOut) {
  if (!ISO_DATE.test(checkIn || '') || !ISO_DATE.test(checkOut || '')) return '—';
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${formatDate(checkOut)}`;
  }
  return `${formatDate(checkIn)} — ${formatDate(checkOut)}`;
}
export function plural(number, one, few, many) {
  const value = Math.abs(number) % 100;
  const last = value % 10;
  if (value > 10 && value < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}
export function guestsLabel(number) {
  return `${number} ${plural(number, 'гость', 'гостя', 'гостей')}`;
}
export function nightsLabel(number) {
  return `${number} ${plural(number, 'ночь', 'ночи', 'ночей')}`;
}
export function readSearchParams() {
  return new URLSearchParams(window.location.search);
}
export function buildRoomHref(room, { checkIn, checkOut, guests } = {}) {
  const params = new URLSearchParams();
  if (ISO_DATE.test(checkIn || '')) params.set('checkIn', checkIn);
  if (ISO_DATE.test(checkOut || '')) params.set('checkOut', checkOut);
  if (guests) params.set('guests', String(guests));
  const query = params.toString();
  return `/rooms/${room.slug}${query ? `?${query}` : ''}`;
}
export function setupDatePair(checkIn, checkOut, defaults = {}) {
  const today = todayISO();
  checkIn.min = today;
  checkOut.min = addDaysISO(today, 1);
  if (defaults.checkIn) checkIn.value = defaults.checkIn;
  if (defaults.checkOut) checkOut.value = defaults.checkOut;
  const sync = () => {
    if (!checkIn.value) return;
    const minimumCheckout = addDaysISO(checkIn.value, 1);
    checkOut.min = minimumCheckout;
    if (!checkOut.value || checkOut.value <= checkIn.value) {
      checkOut.value = minimumCheckout;
    }
  };
  checkIn.addEventListener('change', sync);
  sync();
  return sync;
}
export function validateStay(checkIn, checkOut) {
  if (!ISO_DATE.test(checkIn || '') || !ISO_DATE.test(checkOut || '')) {
    return 'Выберите даты заезда и выезда';
  }
  if (checkIn < todayISO()) return 'Дата заезда уже прошла';
  if (nightsBetween(checkIn, checkOut) < 1) return 'Дата выезда должна быть позже заезда';
  return null;
}
export function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || '').trim());
}
export function validatePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}
export function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}
export function createEl(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
