// Banana Game - auth with localStorage/sessionStorage + Banana API

const regForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const welcome = document.getElementById('welcome');
const meta = document.getElementById('meta');
const authMsg = document.getElementById('auth-msg');
const gameDiv = document.getElementById('game');
const bananaImg = document.getElementById('banana-img');
const answerInput = document.getElementById('answer-input');
const submitBtn = document.getElementById('submit-answer');
const gameMsg = document.getElementById('game-msg');
const scoreSpan = document.getElementById('score');
const nextBtn = document.getElementById('next-btn');

let currentUser = null;
let currentPuzzle = null;
let score = 0;

async function loadPuzzle(){
  try {
    gameMsg.textContent = 'Loading...';
    if (answerInput) answerInput.value = '';
    if (submitBtn) submitBtn.disabled = false;
    let data = null;

    try {
      const res = await fetch('https://marcconrad.com/uob/banana/api.php?_=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        data = await res.json();
      } else {
        throw new Error('direct failed ' + res.status);
      }
    } catch (err) {
      const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://marcconrad.com/uob/banana/api.php') + '&_=' + Date.now();
      const res2 = await fetch(proxy, { cache: 'no-store' });
      if (!res2.ok) throw new Error('proxy failed ' + res2.status);
      data = await res2.json();
    }

    currentPuzzle = data;
    bananaImg.src = data.question || data.image || data.url || '';
    gameMsg.textContent = '';
  } catch (e) {
    gameMsg.textContent = 'Failed to load puzzle: ' + e.message;
    console.error(e);
  }
}

function checkAnswer(){
  if(!currentPuzzle) return;
  const userAnswer = answerInput ? answerInput.value.trim() : '';
  const solution = currentPuzzle.solution;
  if (String(userAnswer) === String(solution)) {
    score++;
    scoreSpan.textContent = score;
    gameMsg.textContent = 'Correct!';
  } else {
    gameMsg.textContent = 'Wrong! Solution: ' + solution;
  }
  if (submitBtn) submitBtn.disabled = true;
}

if (submitBtn) {
  submitBtn.onclick = checkAnswer;
}
if (answerInput) {
  answerInput.addEventListener('keypress', function(e){
    if (e.key === 'Enter') {
      checkAnswer();
    }
  });
}

nextBtn.onclick = loadPuzzle;

function showLoggedIn(name){
  currentUser = name;
  welcome.textContent = 'Welcome, ' + name;
  const last = localStorage.getItem('banana_last_' + name);
  meta.textContent = last ? 'Last login: ' + last : 'First login!';
  localStorage.setItem('banana_last_' + name, new Date().toLocaleString());
  regForm.hidden = true;
  loginForm.hidden = true;
  logoutBtn.hidden = false;
  gameDiv.hidden = false;
  score = 0;
  scoreSpan.textContent = score;
  loadPuzzle();
}

function showLoggedOut(){
  currentUser = null;
  welcome.textContent = 'Please log in or register.';
  meta.textContent = '';
  regForm.hidden = false;
  loginForm.hidden = false;
  logoutBtn.hidden = true;
  gameDiv.hidden = true;
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