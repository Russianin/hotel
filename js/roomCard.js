import { buildRoomHref, createEl, formatPrice, guestsLabel, nightsLabel } from './api.js';
export function createRoomCard(room, options = {}) {
  const href = buildRoomHref(room, options);
  const article = createEl('article', 'room-card');
  const media = createEl('a', 'room-card__media');
  media.href = href;
  const image = document.createElement('img');
  image.src = room.image;
  image.alt = `${room.categoryLabel} «${room.title}» в отеле «Тихий дом»`;
  image.loading = 'lazy';
  image.width = 800;
  image.height = 1000;
  media.append(image);
  if (room.badge) {
    media.append(createEl('span', 'room-card__badge', room.badge));
  }
  if (typeof room.available === 'boolean') {
    const availability = createEl(
      'span',
      `room-card__avail${room.available ? '' : ' room-card__avail--busy'}`,
      room.available ? 'Свободен' : 'Занят',
    );
    media.append(availability);
  }
  const price = createEl('span', 'room-card__price');
  price.append(document.createTextNode(`от ${formatPrice(room.price)} ₽ `));
  price.append(createEl('small', null, '/ ночь'));
  media.append(price);
  article.append(media);
  const body = createEl('div', 'room-card__body');
  body.append(createEl('span', 'room-card__category', `${room.categoryLabel} · ${room.floor}`));
  const title = createEl('h3', 'room-card__title');
  const titleLink = createEl('a', null, room.name);
  titleLink.href = href;
  title.append(titleLink);
  title.append(document.createTextNode(' '));
  title.append(createEl('em', null, `«${room.title}»`));
  body.append(title);
  body.append(createEl('p', 'room-card__tagline', room.tagline));
  const specs = createEl('ul', 'room-card__specs');
  specs.append(createEl('li', null, `${room.area} м²`));
  specs.append(createEl('li', null, `до ${room.capacity} ${room.capacity === 1 ? 'гостя' : 'гостей'}`));
  specs.append(createEl('li', null, room.beds));
  body.append(specs);
  const footer = createEl('div', 'room-card__footer');
  if (options.checkIn && options.checkOut && room.totalPrice) {
    const total = createEl('p', 'room-card__total');
    total.append(document.createTextNode('Итого '));
    total.append(createEl('strong', null, `${formatPrice(room.totalPrice)} ₽`));
    total.append(document.createTextNode(` за ${nightsLabel(room.nights)}`));
    footer.append(total);
  } else if (options.guests) {
    footer.append(createEl('p', 'room-card__total', `Для ${guestsLabel(Number(options.guests))}`));
  }
  const link = createEl('a', 'room-card__link');
  link.href = href;
  link.append(document.createTextNode('Смотреть'));
  link.append(createEl('span', null, '→'));
  footer.append(link);
  body.append(footer);
  article.append(body);
  return article;
}
export function renderRoomCards(container, rooms, options = {}) {
  container.replaceChildren();
  const fragment = document.createDocumentFragment();
  rooms.forEach((room) => {
    fragment.append(createRoomCard(room, options));
  });
  container.append(fragment);
}
