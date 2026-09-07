// Photo tile lightbox
(function () {
  const tiles = document.querySelectorAll('.photo-tile');
  const lightbox = document.getElementById('photo-lightbox');
  const body = document.getElementById('photo-lightbox-body');
  const closeBtn = document.getElementById('photo-lightbox-close');
  if (!tiles.length || !lightbox) return;

  function open(tile) {
    const img = tile.querySelector('img');
    body.innerHTML = '';
    if (img) {
      const big = document.createElement('img');
      big.src = img.src;
      big.alt = img.alt || '';
      body.appendChild(big);
    } else {
      const p = document.createElement('p');
      p.className = 'photo-lightbox-placeholder';
      p.textContent = tile.dataset.caption || 'Add a photo';
      body.appendChild(p);
    }
    lightbox.hidden = false;
    closeBtn.focus();
  }

  function close() {
    lightbox.hidden = true;
    body.innerHTML = '';
  }

  tiles.forEach((tile) => tile.addEventListener('click', () => open(tile)));
  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lightbox.hidden) close(); });
})();
