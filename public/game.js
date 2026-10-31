// Game logic with the Banana API and PostgreSQL-backed application API.

let currentPuzzle = null;
let score = 0;

const userWelcome = document.getElementById('user-welcome');
const gameCard = document.getElementById('game-card');
const loginPrompt = document.getElementById('login-prompt');
const bananaImg = document.getElementById('banana-img');
const answerInput = document.getElementById('answer-input');
const submitBtn = document.getElementById('submit-answer');
const gameMsg = document.getElementById('game-msg');
const scoreSpan = document.getElementById('score');
const nextBtn = document.getElementById('next-btn');

async function apiRequest(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Request failed');
  }
  return result;
}

async function init() {
  try {
    const user = await apiRequest('/api/me');
    if (!user.loggedIn) {
      userWelcome.textContent = 'Please log in to play';
      gameCard.style.display = 'none';
      loginPrompt.style.display = 'block';
      return;
    }

    userWelcome.textContent = `Welcome, ${user.username}!`;
    gameCard.style.display = 'block';
    loginPrompt.style.display = 'none';
    await loadPuzzle();
  } catch (error) {
    userWelcome.textContent = 'Could not connect to the server. Please try again.';
    gameCard.style.display = 'none';
    loginPrompt.style.display = 'block';
    loginPrompt.querySelector('h2').textContent = 'Server unavailable';
    console.error(error);
  }
}

async function loadPuzzle() {
  try {
    currentPuzzle = null;
    gameMsg.textContent = 'Loading puzzle...';
    gameMsg.className = 'game-msg';
    if (answerInput) answerInput.value = '';
    if (submitBtn) submitBtn.disabled = false;
    let data = null;

    try {
      const res = await fetch('https://marcconrad.com/uob/banana/api.php?_=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        data = await res.json();
      } else {
        throw new Error('direct failed');
      }
    } catch (err) {
      const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://marcconrad.com/uob/banana/api.php') + '&_=' + Date.now();
      const res2 = await fetch(proxy, { cache: 'no-store' });
      if (!res2.ok) throw new Error('proxy failed');
      data = await res2.json();
    }

    if (!data || !data.question || data.solution === undefined) {
      throw new Error('Puzzle API returned an invalid puzzle');
    }
    currentPuzzle = data;
    if (bananaImg) {
      bananaImg.src = data.question || '';
    }
    gameMsg.textContent = '';
  } catch (e) {
    gameMsg.textContent = 'Failed to load puzzle. Try again.';
    gameMsg.className = 'game-msg wrong';
    console.error(e);
  }
}

async function checkAnswer() {
  if (!currentPuzzle) return;
  const userAnswer = answerInput ? answerInput.value.trim() : '';
  const solution = currentPuzzle.solution;
  if (submitBtn) submitBtn.disabled = true;

  const isCorrect = String(userAnswer) === String(solution);
  if (isCorrect) {
    score++;
    if (scoreSpan) scoreSpan.textContent = score;
    gameMsg.textContent = 'Correct! Well done!';
    gameMsg.className = 'game-msg correct';
  } else {
    gameMsg.textContent = `Wrong! The answer is: ${solution}`;
    gameMsg.className = 'game-msg wrong';
  }
  try {
    await apiRequest('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score })
    });
  } catch (error) {
    gameMsg.textContent += ' Score could not be saved: ' + error.message;
    gameMsg.className = 'game-msg wrong';
    console.error(error);
  }
}

if (submitBtn) {
  submitBtn.onclick = () => { checkAnswer(); };
}
if (answerInput) {
  answerInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !submitBtn.disabled) {
      e.preventDefault();
      checkAnswer();
    }
  });
}
if (nextBtn) {
  nextBtn.onclick = loadPuzzle;
}

init();
