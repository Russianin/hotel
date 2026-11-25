import { request, validateEmail, validatePhone } from './api.js';
import { clearErrors, qs, showFieldErrors, showToast } from './ui.js';
const form = qs('[data-contact-form]');
const formWrap = qs('[data-contact-form-wrap]');
const successBox = qs('[data-contact-success]');
const resetButton = qs('[data-contact-reset]');
const submitButton = qs('[data-contact-submit]');
const submitLabel = qs('[data-contact-submit-label]');
const errorMessage = qs('[data-contact-error]');
if (form) {
  const setSubmitting = (busy) => {
    submitButton.disabled = busy;
    if (submitLabel) submitLabel.textContent = busy ? 'Отправляем…' : 'Отправить сообщение';
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    errorMessage.textContent = '';
    const nameInput = form.elements.namedItem('name');
    const emailInput = form.elements.namedItem('email');
    const phoneInput = form.elements.namedItem('phone');
    const topicInput = form.elements.namedItem('topic');
    const messageInput = form.elements.namedItem('message');
    const consentInput = form.elements.namedItem('consent');
    const fields = {};
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const message = messageInput.value.trim();
    if (name.length < 2) fields.name = 'Укажите имя — хотя бы два символа';
    if (email && !validateEmail(email)) fields.email = 'Проверьте e-mail';
    if (phone && !validatePhone(phone)) fields.phone = 'Проверьте телефон';
    if (!email && !phone) {
      fields.email = 'Оставьте e-mail или телефон';
      fields.phone = 'Оставьте e-mail или телефон';
    }
    if (message.length < 10) fields.message = 'Расскажите чуть подробнее — минимум 10 символов';
    if (!consentInput.checked) fields.consent = 'Нужно согласие на обработку данных';
    if (Object.keys(fields).length) {
      showFieldErrors(form, fields);
      const first = form.querySelector('.has-error input, .has-error textarea');
      first?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const data = await request('/api/requests', {
        method: 'POST',
        body: {
          name,
          email,
          phone,
          topic: topicInput.value,
          message,
          consent: consentInput.checked,
        },
      });
      formWrap.hidden = true;
      successBox.hidden = false;
      showToast(data.message || 'Сообщение отправлено.');
      successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      errorMessage.textContent = error.message;
      if (error.fields) showFieldErrors(form, error.fields);
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  });
}
resetButton?.addEventListener('click', () => {
  successBox.hidden = true;
  formWrap.hidden = false;
  form.reset();
  clearErrors(form);
  errorMessage.textContent = '';
  qs('#contact-name')?.focus();
});
