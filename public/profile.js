const profileTrigger = document.getElementById('profile-trigger');
const profileDialog = document.getElementById('profile-dialog');
const profileContent = document.getElementById('profile-content');
const profileAvatar = document.getElementById('profile-avatar');
const adminNavLink = document.getElementById('admin-nav-link');
let currentAccount = null;
let profileRequestError = false;

async function profileApi(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function addProfileLink(parent, href, text, className) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = text;
  if (className) link.className = className;
  parent.appendChild(link);
}

function addProfileDetail(parent, label, value) {
  const row = document.createElement('div');
  row.className = 'profile-detail';
  const name = document.createElement('span');
  name.className = 'muted';
  name.textContent = label;
  const detail = document.createElement('strong');
  detail.textContent = value;
  row.append(name, detail);
  parent.appendChild(row);
}

function renderGuestProfile() {
  profileContent.replaceChildren();
  const message = document.createElement('p');
  message.className = 'muted';
  message.textContent = profileRequestError
    ? 'Could not check your account. Please try again.'
    : 'Sign in or create an account to see your profile and save scores.';
  profileContent.appendChild(message);

  const actions = document.createElement('div');
  actions.className = 'profile-actions';
  addProfileLink(actions, 'index.html', 'Sign in', 'btn');
  addProfileLink(actions, 'register.html', 'Create account', 'btn btn-secondary');
  profileContent.appendChild(actions);
}

async function renderProfile() {
  profileContent.replaceChildren();
  const loading = document.createElement('p');
  loading.className = 'muted';
  loading.textContent = 'Loading profile...';
  profileContent.appendChild(loading);

  try {
    const profile = await profileApi('/api/profile');
    profileContent.replaceChildren();

    const heading = document.createElement('p');
    heading.className = 'profile-username';
    heading.textContent = profile.username;
    profileContent.appendChild(heading);

    const details = document.createElement('div');
    details.className = 'profile-details';
    addProfileDetail(details, 'Account type', profile.role === 'admin' ? 'Administrator' : 'Player');
    addProfileDetail(details, 'Joined', new Date(profile.created_at).toLocaleDateString());
    addProfileDetail(details, 'Best score', String(profile.best_score));
    addProfileDetail(details, 'Puzzles played', String(profile.total_games));
    profileContent.appendChild(details);

    const actions = document.createElement('div');
    actions.className = 'profile-actions';
    if (profile.role === 'admin') {
      addProfileLink(actions, 'admin.html', 'Open admin section', 'btn btn-secondary');
    }

    const signOut = document.createElement('button');
    signOut.type = 'button';
    signOut.className = 'btn btn-danger';
    signOut.textContent = 'Sign out';
    signOut.addEventListener('click', async () => {
      signOut.disabled = true;
      try {
        await profileApi('/api/logout', { method: 'POST' });
        window.location.href = 'index.html';
      } catch (error) {
        signOut.disabled = false;
        const notice = document.createElement('p');
        notice.className = 'msg error';
        notice.textContent = error.message || 'Could not sign out. Please try again.';
        profileContent.appendChild(notice);
      }
    });
    actions.appendChild(signOut);
    profileContent.appendChild(actions);
  } catch (error) {
    profileContent.replaceChildren();
    const notice = document.createElement('p');
    notice.className = 'msg error';
    notice.textContent = error.message || 'Could not load profile.';
    profileContent.appendChild(notice);
  }
}

profileTrigger.addEventListener('click', async () => {
  profileDialog.showModal();
  if (currentAccount) {
    await renderProfile();
  } else {
    renderGuestProfile();
  }
});

document.getElementById('profile-close').addEventListener('click', () => profileDialog.close());
profileDialog.addEventListener('click', event => {
  if (event.target === profileDialog) profileDialog.close();
});

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.site-nav a[href]').forEach(link => {
  if (link.getAttribute('href') === currentPage) {
    link.setAttribute('aria-current', 'page');
  }
});

profileApi('/api/me')
  .then(account => {
    if (!account.loggedIn) return;
    currentAccount = account;
    profileAvatar.textContent = account.username.slice(0, 1).toUpperCase();
    profileTrigger.setAttribute('aria-label', `Profile for ${account.username}`);
    if (account.role === 'admin') adminNavLink.hidden = false;
  })
  .catch(error => {
    profileRequestError = true;
    console.error('Could not check current account:', error);
  });
