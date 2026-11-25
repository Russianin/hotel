import {
  addDaysISO,
  createEl,
  debounce,
  formatDate,
  formatPrice,
  guestsLabel,
  nightsBetween,
  nightsLabel,
  plural,
  request,
  setupDatePair,
  todayISO,
  validateEmail,
  validatePhone,
  validateStay,
} from './api.js';
import {
  clearErrors,
  qs,
  qsa,
  setButtonState,
  showFieldErrors,
  showToast,
} from './ui.js';
import { renderRoomCards } from './roomCard.js';
const slug = decodeURIComponent((location.pathname.split('/').filter(Boolean).pop() || ''));
const content = qs('[data-room-content]');
const loading = qs('[data-room-loading]');
const errorBox = qs('[data-room-error]');
const errorText = qs('[data-room-error-text]');
const relatedGrid = qs('#related-rooms');
const form = qs('[data-booking-form]');
const bookingCard = qs('[data-booking-card]');
const successBox = qs('[data-booking-success]');
const submitButton = qs('[data-booking-form] button[type="submit"]');
const errorMessage = qs('[data-booking-error]');
const checkIn = qs('#booking-checkin');
const checkOut = qs('#booking-checkout');
const guestSelect = qs('[data-booking-guests]');
const availabilityBox = qs('[data-availability]');
const availabilityText = qs('[data-availability-text]');
const summaryBox = qs('[data-booking-summary]');
const summaryNights = qs('[data-summary-nights]');
const summaryTotal = qs('[data-summary-total]');
const summaryGrand = qs('[data-summary-grand]');
const url = new URLSearchParams(window.location.search);
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
let room = null;
let isAvailable = false;
let availabilitySequence = 0;
const defaultCheckIn = isDate(url.get('checkIn')) ? url.get('checkIn') : addDaysISO(todayISO(), 7);
const defaultCheckOut = isDate(url.get('checkOut')) ? url.get('checkOut') : addDaysISO(todayISO(), 9);
setupDatePair(checkIn, checkOut, { checkIn: defaultCheckIn, checkOut: defaultCheckOut });
if (checkIn.value && checkOut.value && checkOut.value <= checkIn.value) {
  checkOut.value = addDaysISO(checkIn.value, 1);
}
const savedGuests = Number(url.get('guests'));
function setText(selector, value) {
  qsa(selector).forEach((element) => {
    element.textContent = value;
  });
}
function showError(message) {
  loading.hidden = true;
  content.hidden = true;
  errorBox.hidden = false;
  errorText.textContent = message;
}
function populateRoom(data) {
  room = data.room;
  isAvailable = false;
  document.title = `${room.name} «${room.title}» — Тихий дом`;
  setText('[data-room-category]', room.categoryLabel);
  setText('[data-room-floor]', room.floor);
  setText('[data-room-name]', room.name);
  setText('[data-room-title]', `«${room.title}»`);
  setText('[data-room-tagline]', room.tagline);
  setText('[data-room-price]', formatPrice(room.price));
  setText('[data-room-area]', `${room.area} м²`);
  setText('[data-room-capacity]', `${room.capacity} ${plural(room.capacity, 'гость', 'гостя', 'гостей')}`);
  setText('[data-room-beds]', room.beds);
  setText('[data-room-floor-spec]', room.floor);
  const images = qsa('[data-gallery-img]');
  const galleryButtons = qsa('[data-gallery-index]');
  images.forEach((image, index) => {
    const item = room.gallery[index] || room.gallery[0];
    if (!item) return;
    image.src = item.src;
    image.alt = item.alt;
    image.loading = index === 0 ? 'eager' : 'lazy';
    if (galleryButtons[index]) {
      galleryButtons[index].setAttribute('aria-label', `${item.alt} — открыть фото ${index + 1}`);
    }
  });
  guestSelect.replaceChildren();
  for (let count = 1; count <= room.capacity; count += 1) {
    const option = document.createElement('option');
    option.value = String(count);
    option.textContent = guestsLabel(count);
    guestSelect.append(option);
  }
  guestSelect.value = String(
    Number.isInteger(savedGuests) && savedGuests >= 1 && savedGuests <= room.capacity
      ? savedGuests
      : Math.min(2, room.capacity),
  );
  const features = qs('[data-room-features]');
  features.replaceChildren();
  room.features.forEach((feature) => {
    features.append(createEl('li', null, feature));
  });
  const description = qs('[data-room-description]');
  description.replaceChildren();
  room.description.split(/\n{2,}/).forEach((paragraph) => {
    description.append(createEl('p', null, paragraph.trim()));
  });
  loading.hidden = true;
  content.hidden = false;
  mobileBar.hidden = false;
  submitButton.disabled = true;
  loadRelatedRooms();
  checkAvailability();
}
async function loadRoom() {
  if (!slug) {
    showError('Не указан номер.');
    return;
  }
  try {
    const data = await request(`/api/rooms/${encodeURIComponent(slug)}`);
    populateRoom(data);
  } catch (error) {
    showError(error.message);
  }
}
function setAvailability(state, text) {
  availabilityBox.dataset.state = state;
  availabilityText.textContent = text;
}
function hideSummary() {
  summaryBox.hidden = true;
}
function showSummary(nights, total) {
  summaryBox.hidden = false;
  summaryNights.textContent = nightsLabel(nights);
  summaryTotal.textContent = `${formatPrice(total)} ₽`;
  summaryGrand.textContent = `${formatPrice(total)} ₽`;
}
function updateBarPrice() {
  if (room) barPrice.textContent = formatPrice(room.price);
}
async function checkAvailability() {
  if (!room) return;
  const problem = validateStay(checkIn.value, checkOut.value);
  if (problem) {
    isAvailable = false;
    submitButton.disabled = true;
    hideSummary();
    setAvailability('idle', problem);
    return;
  }
  if (Number(guestSelect.value) > room.capacity) {
    isAvailable = false;
    submitButton.disabled = true;
    hideSummary();
    setAvailability('busy', `Этот номер вмещает не более ${room.capacity} гостей`);
    return;
  }
  const sequence = ++availabilitySequence;
  setAvailability('checking', 'Проверяем свободные даты…');
  submitButton.disabled = true;
  try {
    const params = new URLSearchParams({
      roomSlug: slug,
      checkIn: checkIn.value,
      checkOut: checkOut.value,
      guests: guestSelect.value,
    });
    const data = await request(`/api/availability?${params.toString()}`);
    if (sequence !== availabilitySequence) return;
    isAvailable = data.available;
    if (data.available) {
      setAvailability(
        'available',
        `Свободно · ${nightsLabel(data.nights)} · ${formatPrice(data.totalPrice)} ₽`,
      );
      showSummary(data.nights, data.totalPrice);
      submitButton.disabled = false;
    } else {
      setAvailability('busy', data.reason || 'На выбранные даты номер занят');
      hideSummary();
      submitButton.disabled = true;
    }
  } catch (error) {
    if (sequence !== availabilitySequence) return;
    isAvailable = false;
    submitButton.disabled = true;
    hideSummary();
    setAvailability('idle', error.message);
  }
}
const scheduleAvailability = debounce(checkAvailability, 320);
checkIn.addEventListener('change', scheduleAvailability);
checkOut.addEventListener('change', scheduleAvailability);
guestSelect.addEventListener('change', scheduleAvailability);
checkIn.addEventListener('change', () => {
  checkOut.min = addDaysISO(checkIn.value, 1);
});
guestSelect.addEventListener('change', updateBarPrice);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors(form);
  if (!room) return;
  const fields = {};
  const stayProblem = validateStay(checkIn.value, checkOut.value);
  if (stayProblem) fields.checkIn = stayProblem;
  const nameInput = form.elements.namedItem('name');
  const emailInput = form.elements.namedItem('email');
  const phoneInput = form.elements.namedItem('phone');
  const commentInput = form.elements.namedItem('comment');
  const consentInput = form.elements.namedItem('consent');
  const name = nameInput.value.trim();
  if (name.length < 2) fields.name = 'Укажите имя';
  if (!validateEmail(emailInput.value)) fields.email = 'Проверьте e-mail';
  if (!validatePhone(phoneInput.value)) fields.phone = 'Проверьте телефон';
  if (!consentInput.checked) fields.consent = 'Нужно согласие на обработку данных';
  if (Object.keys(fields).length) {
    showFieldErrors(form, fields);
    const first = form.querySelector('.has-error input, .has-error textarea');
    first?.focus();
    return;
  }
  if (!isAvailable) {
    errorMessage.textContent = 'Выберите свободные даты — и мы сразу подтвердим бронь.';
    return;
  }
  errorMessage.textContent = '';
  setButtonState(submitButton, true, 'Бронируем…');
  try {
    const data = await request('/api/bookings', {
      method: 'POST',
      body: {
        roomSlug: slug,
        checkIn: checkIn.value,
        checkOut: checkOut.value,
        guests: Number(guestSelect.value),
        name,
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        comment: commentInput.value.trim(),
        consent: consentInput.checked,
      },
    });
    showSuccess(data.booking);
  } catch (error) {
    errorMessage.textContent = error.message;
    if (error.fields) showFieldErrors(form, error.fields);
    if (error.status === 409) checkAvailability();
    showToast(error.message, 'error');
  } finally {
    setButtonState(submitButton, false, 'Забронировать');
  }
});
function showSuccess(booking) {
  form.hidden = true;
  successBox.hidden = false;
  isAvailable = false;
  submitButton.disabled = true;
  mobileBar.hidden = true;
  qs('[data-success-name]').textContent = booking.guestName;
  qs('[data-success-ref]').textContent = booking.reference;
  qs('[data-success-checkin]').textContent = formatDate(booking.checkIn, { year: true });
  qs('[data-success-checkout]').textContent = formatDate(booking.checkOut, { year: true });
  qs('[data-success-guests]').textContent = guestsLabel(booking.guests);
  qs('[data-success-total]').textContent = `${formatPrice(booking.totalPrice)} ₽`;
  showToast(`Бронь ${booking.reference} подтверждена.`);
  bookingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
qs('[data-booking-reset]')?.addEventListener('click', () => {
  successBox.hidden = true;
  form.hidden = false;
  mobileBar.hidden = false;
  form.reset();
  checkIn.value = addDaysISO(todayISO(), 7);
  checkOut.value = addDaysISO(todayISO(), 9);
  guestSelect.value = String(Math.min(2, room?.capacity || 2));
  clearErrors(form);
  errorMessage.textContent = '';
  isAvailable = false;
  submitButton.disabled = true;
  updateBarPrice();
  checkAvailability();
  bookingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
async function loadRelatedRooms() {
  if (!relatedGrid) return;
  try {
    const data = await request('/api/rooms?limit=6');
    const rooms = data.rooms.filter((item) => item.slug !== slug).slice(0, 3);
    renderRoomCards(relatedGrid, rooms, {
      checkIn: isDate(checkIn.value) ? checkIn.value : undefined,
      checkOut: isDate(checkOut.value) ? checkOut.value : undefined,
      guests: guestSelect.value,
    });
  } catch {
    relatedGrid.closest('section')?.setAttribute('hidden', '');
  }
}
const lightbox = qs('[data-lightbox]');
const lightboxImage = qs('[data-lightbox-img]');
const lightboxCaption = qs('[data-lightbox-caption]');
let lightboxIndex = 0;
function openLightbox(index) {
  if (!room || !lightbox) return;
  lightboxIndex = (index + room.gallery.length) % room.gallery.length;
  const item = room.gallery[lightboxIndex];
  if (!item) return;
  lightboxImage.src = item.src;
  lightboxImage.alt = item.alt;
  lightboxCaption.textContent = `${item.alt} · ${lightboxIndex + 1} / ${room.gallery.length}`;
  document.body.classList.add('no-scroll');
  if (!lightbox.open) lightbox.showModal();
}
function closeLightbox() {
  if (!lightbox?.open) return;
  lightbox.close();
}
function stepLightbox(direction) {
  openLightbox(lightboxIndex + direction);
}
qsa('[data-gallery-index]').forEach((button) => {
  button.addEventListener('click', () => openLightbox(Number(button.dataset.galleryIndex)));
});
qsa('[data-open-lightbox]').forEach((button) => {
  button.addEventListener('click', () => openLightbox(0));
});
qs('[data-lightbox-close]')?.addEventListener('click', closeLightbox);
qs('[data-lightbox-prev]')?.addEventListener('click', () => stepLightbox(-1));
qs('[data-lightbox-next]')?.addEventListener('click', () => stepLightbox(1));
lightbox?.addEventListener('close', () => {
  document.body.classList.remove('no-scroll');
});
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (event) => {
  if (!lightbox?.open) return;
  if (event.key === 'ArrowLeft') stepLightbox(-1);
  if (event.key === 'ArrowRight') stepLightbox(1);
});
loadRoom();
