// ---------- Tooltip bubbles for skills ----------
(function () {
  const bubble = document.getElementById('tooltip-bubble');
  const tags = document.querySelectorAll('.skill-tag');
  let activeTag = null;

  function placeBubble(tag) {
    const rect = tag.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - bubbleRect.width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - bubbleRect.width - 12));
    let top = rect.top - bubbleRect.height - 10;
    if (top < 8) top = rect.bottom + 10;
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
  }

  function show(tag) {
    bubble.textContent = tag.dataset.tip;
    bubble.classList.add('is-visible');
    tag.classList.add('is-active');
    activeTag = tag;
    // measure after content set
    requestAnimationFrame(() => placeBubble(tag));
  }

  function hide() {
    bubble.classList.remove('is-visible');
    if (activeTag) activeTag.classList.remove('is-active');
    activeTag = null;
  }

  tags.forEach((tag) => {
    tag.addEventListener('mouseenter', () => show(tag));
    tag.addEventListener('mouseleave', hide);
    tag.addEventListener('focus', () => show(tag));
    tag.addEventListener('blur', hide);
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      if (activeTag === tag) { hide(); } else { show(tag); }
    });
  });

  document.addEventListener('scroll', () => { if (activeTag) placeBubble(activeTag); }, { passive: true });
  window.addEventListener('resize', () => { if (activeTag) placeBubble(activeTag); });
  document.addEventListener('click', (e) => {
    if (activeTag && !e.target.classList.contains('skill-tag')) hide();
  });
})();
