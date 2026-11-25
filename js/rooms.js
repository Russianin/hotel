import {
  addDaysISO,
  createEl,
  debounce,
  formatDateRange,
  formatPrice,
  plural,
  request,
  todayISO,
} from './api.js';
import { qs, qsa, showToast } from './ui.js';
import { renderRoomCards } from './roomCard.js';
const form = qs('[data-room-filters]');
const grid = qs('#rooms-grid');
const emptyState = qs('[data-rooms-empty]');
const countElement = qs('[data-rooms-count]');
const resetButtons = qsa('[data-reset-filters]');
if (form && grid) {
  const checkIn = qs('[data-filter-checkin]', form);
  const checkOut = qs('[data-filter-checkout]', form);
  const guests = qs('[data-filter-guests]', form);
  const price = qs('[data-filter-price]', form);
  const priceOutput = qs('[data-price-output]', form);
  const availableOnly = qs('[data-filter-available]', form);
  const sort = qs('[data-filter-sort]', form);
  const chips = qsa('[data-category]', form);
  const params = new URLSearchParams(window.location.search);
  const categories = chips.map((chip) => chip.dataset.category).filter(Boolean);
  const today = todayISO();
  checkIn.min = today;
  checkOut.min = addDaysISO(today, 1);
  if (params.get('checkIn')) checkIn.value = params.get('checkIn');
  if (params.get('checkOut')) checkOut.value = params.get('checkOut');
  if (checkIn.value && checkOut.value && checkOut.value <= checkIn.value) {
    checkOut.value = addDaysISO(checkIn.value, 1);
  }
  if (checkIn.value) checkOut.min = addDaysISO(checkIn.value, 1);
  if (params.get('guests') && ['1', '2', '3', '4'].includes(params.get('guests'))) {
    guests.value = params.get('guests');
  }
  const initialCategory = params.get('category');
  if (initialCategory && categories.includes(initialCategory)) {
    setCategory(initialCategory);
  }
  const initialPrice = Number(params.get('maxPrice'));
  if (Number.isFinite(initialPrice) && initialPrice >= 9000 && initialPrice <= 25000) {
    price.value = String(initialPrice);
  }
  const initialSort = params.get('sort');
  if (['price-asc', 'price-desc', 'area-desc', 'recommended'].includes(initialSort)) {
    sort.value = initialSort;
  }
  let hadDates = Boolean(checkIn.value && checkOut.value);
  availableOnly.disabled = !hadDates;
  if (hadDates) {
    availableOnly.checked = params.get('availableOnly') !== '0';
  } else {
    availableOnly.checked = false;
  }
  updatePriceOutput();
  let controller = null;
  function setCategory(value) {
    chips.forEach((chip) => {
      const active = chip.dataset.category === value;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', String(active));
    });
  }
  function updatePriceOutput() {
    if (!priceOutput) return;
    const value = Number(price.value);
    priceOutput.textContent = value >= 25000 ? 'любая' : `до ${formatPrice(value)} ₽`;
  }
  function syncDateBounds() {
    if (!checkIn.value) return;
    checkOut.min = addDaysISO(checkIn.value, 1);
    if (!checkOut.value || checkOut.value <= checkIn.value) {
      checkOut.value = addDaysISO(checkIn.value, 1);
    }
  }
  function syncAvailabilityToggle() {
    const hasDates = Boolean(checkIn.value && checkOut.value);
    if (hasDates && !hadDates) {
      availableOnly.disabled = false;
      availableOnly.checked = true;
    }
    if (!hasDates) {
      availableOnly.disabled = true;
      availableOnly.checked = false;
    }
    hadDates = hasDates;
  }
  function currentQuery({ forHero = false } = {}) {
    const search = new URLSearchParams();
    const hasDates = Boolean(checkIn.value && checkOut.value);
    if (hasDates) {
      search.set('checkIn', checkIn.value);
      search.set('checkOut', checkOut.value);
    }
    if (guests.value) search.set('guests', guests.value);
    if (currentCategory()) search.set('category', currentCategory());
    if (Number(price.value) < 25000) search.set('maxPrice', price.value);
    if (sort.value !== 'recommended') search.set('sort', sort.value);
    if (hasDates) search.set('availableOnly', availableOnly.checked ? '1' : '0');
    return search;
  }
  function currentCategory() {
    const active = chips.find((chip) => chip.classList.contains('is-active'));
    return active?.dataset.category || '';
  }
  function showSkeletons() {
    grid.hidden = false;
    emptyState.hidden = true;
    grid.setAttribute('aria-busy', 'true');
    grid.replaceChildren();
    for (let index = 0; index < 6; index += 1) {
      const card = createEl('article', 'room-card room-card--skeleton');
      card.setAttribute('aria-hidden', 'true');
      card.append(createEl('div', 'room-card__media skeleton'));
      const body = createEl('div', 'room-card__body');
      body.append(createEl('span', 'skeleton skeleton--line skeleton--short'));
      body.append(createEl('span', 'skeleton skeleton--line skeleton--title'));
      body.append(createEl('span', 'skeleton skeleton--line'));
      card.append(body);
      grid.append(card);
    }
  }
  function setCount(rooms, meta, showAvailableOnly) {
    const hasDates = Boolean(meta.dates);
    const count = rooms.length;
    const noun = plural(count, 'номер', 'номера', 'номеров');
    let text = `${count} ${noun}`;
    if (hasDates) {
      if (showAvailableOnly) {
        text = `Свободно: ${count} ${noun} · ${formatDateRange(meta.dates.checkIn, meta.dates.checkOut)}`;
      } else {
        const available = rooms.filter((room) => room.available).length;
        text = `${count} ${noun} · ${available} свободно · ${formatDateRange(meta.dates.checkIn, meta.dates.checkOut)}`;
      }
    }
    countElement.textContent = text;
  }
  async function fetchRooms() {
    if (checkIn.value && checkOut.value && checkOut.value <= checkIn.value) {
      countElement.textContent = 'Дата выезда должна быть позже заезда';
      showToast('Проверьте даты проживания.', 'error');
      return;
    }
    syncAvailabilityToggle();
    const query = currentQuery();
    const url = `/rooms${query.toString() ? `?${query.toString()}` : ''}`;
    window.history.replaceState({}, '', url);
    if (controller) controller.abort();
    controller = new AbortController();
    showSkeletons();
    try {
      const data = await request(`/api/rooms${query.toString() ? `?${query.toString()}` : ''}`, {
        signal: controller.signal,
      });
      const rooms = data.rooms;
      const options = {
        checkIn: data.meta.dates?.checkIn,
        checkOut: data.meta.dates?.checkOut,
        guests: data.meta.guests || undefined,
      };
      if (!rooms.length) {
        grid.hidden = true;
        emptyState.hidden = false;
        countElement.textContent = 'Ничего не нашлось';
        grid.setAttribute('aria-busy', 'false');
        return;
      }
      emptyState.hidden = true;
      grid.hidden = false;
      renderRoomCards(grid, rooms, options);
      setCount(rooms, data.meta, availableOnly.checked);
      grid.setAttribute('aria-busy', 'false');
    } catch (error) {
      if (error.name === 'AbortError') return;
      grid.hidden = false;
      emptyState.hidden = true;
      grid.setAttribute('aria-busy', 'false');
      grid.replaceChildren();
      const wrapper = createEl('div', 'empty-state');
      wrapper.append(createEl('h2', null, 'Не удалось загрузить номера'));
      wrapper.append(createEl('p', null, error.message));
      const retry = createEl('button', 'btn btn--accent', 'Попробовать снова');
      retry.type = 'button';
      retry.addEventListener('click', fetchRooms);
      wrapper.append(retry);
      grid.append(wrapper);
      countElement.textContent = 'Ошибка загрузки';
      showToast(error.message, 'error');
    }
  }
  const scheduleFetch = debounce(fetchRooms, 280);
  checkIn.addEventListener('change', () => {
    if (!checkIn.value) {
      checkOut.value = '';
    } else {
      syncDateBounds();
    }
    syncAvailabilityToggle();
    scheduleFetch();
  });
  checkOut.addEventListener('change', () => {
    syncAvailabilityToggle();
    scheduleFetch();
  });
  guests.addEventListener('change', scheduleFetch);
  sort.addEventListener('change', scheduleFetch);
  availableOnly.addEventListener('change', scheduleFetch);
  price.addEventListener('input', updatePriceOutput);
  price.addEventListener('change', scheduleFetch);
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      setCategory(chip.dataset.category || '');
      scheduleFetch();
    });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    fetchRooms();
  });
  resetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      form.reset();
      checkIn.value = '';
      checkOut.value = '';
      guests.value = '';
      price.value = '25000';
      sort.value = 'recommended';
      setCategory('');
      availableOnly.checked = false;
      availableOnly.disabled = true;
      hadDates = false;
      updatePriceOutput();
      window.history.replaceState({}, '', '/rooms');
      fetchRooms();
    });
  });
  fetchRooms();
}
