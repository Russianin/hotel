import {
  addDaysISO,
  createEl,
  plural,
  request,
  todayISO,
  validateStay,
  formatDate,
} from './api.js';
import { qs, showToast } from './ui.js';
import { renderRoomCards } from './roomCard.js';
const quickForm = qs('[data-quick-book]');
if (quickForm) {
  const checkIn = qs('input[name="checkIn"]', quickForm);
  const checkOut = qs('input[name="checkOut"]', quickForm);
  const guests = qs('select[name="guests"]', quickForm);
  const errorElement = qs('[data-quick-error]', quickForm);
  const today = todayISO();
  checkIn.value = addDaysISO(today, 7);
  checkOut.value = addDaysISO(today, 9);
  checkIn.min = today;
  checkOut.min = addDaysISO(today, 1);
  checkIn.addEventListener('change', () => {
    checkOut.min = addDaysISO(checkIn.value, 1);
    if (!checkOut.value || checkOut.value <= checkIn.value) {
      checkOut.value = addDaysISO(checkIn.value, 1);
    }
  });
  quickForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const problem = validateStay(checkIn.value, checkOut.value);
    if (problem) {
      errorElement.textContent = problem;
      return;
    }
    errorElement.textContent = '';
    const params = new URLSearchParams({
      checkIn: checkIn.value,
      checkOut: checkOut.value,
      guests: guests.value,
    });
    window.location.href = `/rooms?${params.toString()}`;
  });
}
const featuredGrid = qs('#featured-rooms');
async function loadFeaturedRooms() {
  if (!featuredGrid) return;
  featuredGrid.setAttribute('aria-busy', 'true');
  try {
    const data = await request('/api/rooms?limit=3');
    renderRoomCards(featuredGrid, data.rooms);
    featuredGrid.setAttribute('aria-busy', 'false');
  } catch (error) {
    featuredGrid.setAttribute('aria-busy', 'false');
    featuredGrid.replaceChildren();
    const wrapper = createEl('div', 'empty-state');
    wrapper.append(createEl('h2', null, 'Не удалось загрузить номера'));
    wrapper.append(createEl('p', null, error.message));
    const retry = createEl('button', 'btn btn--accent', 'Попробовать снова');
    retry.type = 'button';
    retry.addEventListener('click', loadFeaturedRooms);
    wrapper.append(retry);
    featuredGrid.append(wrapper);
    showToast(error.message, 'error');
  }
}
loadFeaturedRooms();
const track = qs('[data-reviews-track]');
const averageElement = qs('[data-reviews-average]');
const countElement = qs('[data-reviews-count]');
function createReviewCard(review) {
  const card = createEl('article', 'review-card');
  const top = createEl('div', 'review-card__top');
  top.append(createEl('span', 'review-card__quote', '“'));
  const stars = createEl('span', 'review-card__stars', '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating));
  stars.setAttribute('aria-label', `Оценка ${review.rating} из 5`);
  top.append(stars);
  card.append(top);
  card.append(createEl('blockquote', 'review-card__text', review.text));
  const author = createEl('div', 'review-card__author');
  author.append(createEl('span', 'review-card__avatar', review.author.slice(0, 1).toUpperCase()));
  const authorText = createEl('div');
  authorText.append(createEl('p', 'review-card__name', review.author));
  const meta = [review.city, review.room].filter(Boolean).join(' · ');
  authorText.append(createEl('p', 'review-card__meta', meta));
  author.append(authorText);
  card.append(author);
  return card;
}
async function loadReviews() {
  if (!track) return;
  try {
    const data = await request('/api/reviews?limit=8');
    track.replaceChildren();
    data.reviews.forEach((review) => {
      track.append(createReviewCard(review));
    });
    if (averageElement) {
      averageElement.textContent = String(data.average).replace('.', ',');
    }
    if (countElement) {
      countElement.textContent = `${data.count} ${plural(data.count, 'отзыв', 'отзыва', 'отзывов')}`;
    }
    track.setAttribute('aria-busy', 'false');
    track.dispatchEvent(new Event('scroll'));
  } catch (error) {
    track.setAttribute('aria-busy', 'false');
    showToast('Не удалось загрузить отзывы.', 'error');
  }
}
loadReviews();
