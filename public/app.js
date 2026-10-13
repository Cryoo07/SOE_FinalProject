// Banana Game - early auth v1: localStorage/sessionStorage only. NOT secure, plaintext.
// Will be replaced by Node sessions + bcrypt later - intentional for evaluation.
// Ref: MDN localStorage https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

const regForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const welcome = document.getElementById('welcome');
const meta = document.getElementById('meta');
const authMsg = document.getElementById('auth-msg');
const hint = document.getElementById('logged-hint');

function showLoggedIn(name){
  welcome.textContent = 'Welcome, ' + name;
  const last = localStorage.getItem('banana_last_' + name);
  meta.textContent = last ? 'Last login: ' + last : 'First login!';
  localStorage.setItem('banana_last_' + name, new Date().toLocaleString());
  regForm.hidden = true;
  loginForm.hidden = true;
  logoutBtn.hidden = false;
  hint.hidden = false;
}

function showLoggedOut(){
  welcome.textContent = 'Please log in or register.';
  meta.textContent = '';
  regForm.hidden = false;
  loginForm.hidden = false;
  logoutBtn.hidden = true;
  hint.hidden = true;
}

const current = localStorage.getItem('banana_current') || sessionStorage.getItem('banana_current');
if(current) showLoggedIn(current); else showLoggedOut();

regForm.addEventListener('submit', function(e){
  e.preventDefault();
  const u = document.getElementById('reg-user').value.trim();
  const p = document.getElementById('reg-pass').value;
  if(!u || !p){ authMsg.textContent = 'Error: fill both fields'; return; }
  if(p.length < 4){ authMsg.textContent = 'Error: password min 4 chars'; return; }
  if(localStorage.getItem('banana_user_' + u)){ authMsg.textContent = 'Error: user exists'; return; }
  localStorage.setItem('banana_user_' + u, p);
  localStorage.setItem('banana_current', u);
  sessionStorage.removeItem('banana_current');
  authMsg.textContent = 'Registered + logged in as ' + u;
  showLoggedIn(u);
  regForm.reset();
});

loginForm.addEventListener('submit', function(e){
  e.preventDefault();
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  const saved = localStorage.getItem('banana_user_' + u);
  if(saved === null){ authMsg.textContent = 'Error: no such user'; return; }
  if(p.length < 4){ authMsg.textContent = 'Error: password min 4 chars'; return; }
  if(saved !== p){ authMsg.textContent = 'Error: wrong password'; return; }
  if(document.getElementById('remember').checked){
    localStorage.setItem('banana_current', u);
    sessionStorage.removeItem('banana_current');
  } else {
    sessionStorage.setItem('banana_current', u);
    localStorage.removeItem('banana_current');
  }
  authMsg.textContent = 'Logged in as ' + u;
  showLoggedIn(u);
});

logoutBtn.addEventListener('click', function(){
  localStorage.removeItem('banana_current');
  sessionStorage.removeItem('banana_current');
  authMsg.textContent = 'Logged out';
  showLoggedOut();
});