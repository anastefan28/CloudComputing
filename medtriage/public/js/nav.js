(function () {
  const navHTML = `
    <nav class="main-nav" id="mainNav" style="display:none;">
      <div class="nav-inner">
        <a href="/dashboard" class="nav-brand">MedTriageAI</a>
        <div class="nav-links">
          <a href="/dashboard" class="nav-link">Dashboard</a>
          <a href="/" class="nav-link">New Analysis</a>
        </div>
        <div class="nav-user">
          <span id="navRole" class="role-badge"></span>
          <span id="navEmail" class="nav-email"></span>
          <button onclick="handleLogout()" class="btn-logout">Logout</button>
        </div>
      </div>
    </nav>
  `;

  document.body.insertAdjacentHTML('afterbegin', navHTML);

  auth.onAuthStateChanged(async (user) => {
    const nav = document.getElementById('mainNav');
    if (user) {
      nav.style.display = 'block';
      document.getElementById('navEmail').textContent = user.email;
      const role = await getUserRole();
      const roleEl = document.getElementById('navRole');
      roleEl.textContent = role;
      roleEl.className = `role-badge role-${role}`;
    } else {
      nav.style.display = 'none';
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
  });
})();

async function handleLogout() {
  await auth.signOut();
  window.location.href = '/login';
}
