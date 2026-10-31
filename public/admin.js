async function loadAdminSection() {
  const status = document.getElementById('admin-status');
  const stats = document.getElementById('admin-stats');
  const note = document.getElementById('admin-note');

  try {
    const accountResponse = await fetch('/api/me');
    const account = await accountResponse.json();
    if (!accountResponse.ok) {
      throw new Error(account.error || 'Could not verify account');
    }
    if (!account.loggedIn) {
      status.textContent = 'Please sign in with an administrator account to continue.';
      return;
    }
    if (account.role !== 'admin') {
      status.textContent = 'Access denied. This section is only available to administrators.';
      return;
    }

    const response = await fetch('/api/admin/overview');
    const overview = await response.json();
    if (!response.ok) {
      throw new Error(overview.error || 'Could not load administrator overview');
    }
    document.getElementById('admin-user-count').textContent = String(overview.total_users);
    document.getElementById('admin-game-count').textContent = String(overview.total_games);
    document.getElementById('admin-admin-count').textContent = String(overview.total_admins);
    status.textContent = 'Administrator access confirmed.';
    stats.hidden = false;
    note.hidden = false;
  } catch (error) {
    status.textContent = error.message || 'Could not load the admin section.';
  }
}

loadAdminSection();
