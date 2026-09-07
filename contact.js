// ---------- Contact popover: fluid reveal ----------
(function () {
  const trigger = document.getElementById('contact-trigger');
  const menu = document.getElementById('contact-menu');
  if (!trigger || !menu) return;

  const COUNTRY_CODE = '91';
  const PHONE_LOCAL = '9085604484';
  const EMAIL = 'royeren00@gmail.com';

  const emailLink = document.getElementById('contact-email');
  const whatsappLink = document.getElementById('contact-whatsapp');

  if (emailLink) {
    const subject = encodeURIComponent('Hello Koushik — from your portfolio');
    const body = encodeURIComponent('Hi Koushik,\n\n');
    emailLink.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=${subject}&body=${body}`;
  }

  if (whatsappLink) {
    const text = encodeURIComponent('Hi Koushik, I found your portfolio and wanted to reach out.');
    whatsappLink.href = `https://wa.me/${COUNTRY_CODE}${PHONE_LOCAL}?text=${text}`;
  }

  let closeTimer;

  function openMenu() {
    clearTimeout(closeTimer);
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onOutsideClick);
    document.addEventListener('keydown', onKeydown);
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutsideClick);
    document.removeEventListener('keydown', onKeydown);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (!menu.classList.contains('is-open')) menu.hidden = true;
    }, 480);
  }

  function onOutsideClick(e) {
    if (!menu.contains(e.target) && !trigger.contains(e.target)) closeMenu();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      closeMenu();
      trigger.focus();
    }
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.contains('is-open') ? closeMenu() : openMenu();
  });
})();
