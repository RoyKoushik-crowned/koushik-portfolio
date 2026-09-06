// ---------- LinkedIn preview: tab toggle ----------
(function () {
  const tabs = document.querySelectorAll('.li-tab');
  if (!tabs.length) return;
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('.li-panel').forEach((panel) => {
        panel.hidden = panel.dataset.panel !== target;
      });
    });
  });
})();

// ---------- GitHub preview: live fetch ----------
(function () {
  const body = document.querySelector('.gh-body');
  if (!body) return;

  const USERNAME = 'RoyKoushik-crowned';
  const skeleton = body.querySelector('.gh-skeleton');
  const loaded = body.querySelector('.gh-loaded');
  const fallback = body.querySelector('.gh-fallback');

  function showState(state) {
    body.dataset.state = state;
    skeleton.hidden = state !== 'loading';
    loaded.hidden = state !== 'loaded';
    fallback.hidden = state !== 'error';
  }

  function timeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diffMs / 86400000);
    if (days < 1) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mo ago`;
    return `${Math.floor(months / 12)} yr ago`;
  }

  async function load() {
    try {
      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${USERNAME}`),
        fetch(`https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=5`),
      ]);
      if (!userRes.ok || !reposRes.ok) throw new Error('GitHub API error');
      const user = await userRes.json();
      const repos = await reposRes.json();

      loaded.querySelector('.gh-avatar').src = user.avatar_url;
      loaded.querySelector('.gh-avatar').alt = `${user.login} avatar`;
      loaded.querySelector('.gh-name').textContent = user.name || user.login;
      loaded.querySelector('.gh-login').textContent = `@${user.login}`;
      loaded.querySelector('.gh-bio').textContent = user.bio || 'Backend engineer building async and LLM-powered systems.';
      loaded.querySelector('[data-stat="repos"]').textContent = user.public_repos ?? '—';
      loaded.querySelector('[data-stat="followers"]').textContent = user.followers ?? '—';
      loaded.querySelector('[data-stat="following"]').textContent = user.following ?? '—';

      const list = loaded.querySelector('.gh-repo-list');
      list.innerHTML = '';
      if (Array.isArray(repos) && repos.length) {
        repos
          .filter((r) => !r.fork)
          .slice(0, 5)
          .forEach((repo) => {
            const li = document.createElement('li');
            li.innerHTML = `
              <a class="gh-repo-name" href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
              <p class="gh-repo-desc">${repo.description ? repo.description : 'No description yet.'}</p>
              <div class="gh-repo-meta">
                ${repo.language ? `<span><span class="gh-lang-dot"></span>${repo.language}</span>` : ''}
                <span>★ ${repo.stargazers_count}</span>
                <span>updated ${timeAgo(repo.pushed_at)}</span>
              </div>
            `;
            list.appendChild(li);
          });
      } else {
        list.innerHTML = '<li><p class="gh-repo-desc">No public repositories to show yet.</p></li>';
      }

      showState('loaded');
    } catch (err) {
      showState('error');
    }
  }

  load();
})();
