// ---------- Contact popover: Email (Gmail compose), WhatsApp, LinkedIn ----------
(function () {
  const trigger = document.getElementById('contact-trigger');
  const menu = document.getElementById('contact-menu');
  if (!trigger || !menu) return;

  // NOTE: phone number assumed to be an Indian mobile number (+91), based on
  // the resume's India-based education/employer context. If this number is
  // actually a US line, change COUNTRY_CODE below (e.g. '1' for the US).
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
    const text = encodeURIComponent("Hi Koushik, I found your portfolio and wanted to reach out.");
    whatsappLink.href = `https://wa.me/${COUNTRY_CODE}${PHONE_LOCAL}?text=${text}`;
  }

  function openMenu() {
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onOutsideClick);
    document.addEventListener('keydown', onKeydown);
  }

  function closeMenu() {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutsideClick);
    document.removeEventListener('keydown', onKeydown);
  }

  function onOutsideClick(e) {
    if (!menu.contains(e.target) && e.target !== trigger) closeMenu();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { closeMenu(); trigger.focus(); }
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.hidden) openMenu(); else closeMenu();
  });
})();
