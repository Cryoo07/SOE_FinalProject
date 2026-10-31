async function loadLeaderboard() {
  const status = document.getElementById('leaderboard-status');
  const list = document.getElementById('leaderboard-list');

  try {
    const response = await fetch('/api/leaderboard');
    const entries = await response.json();
    if (!response.ok) {
      throw new Error(entries.error || 'Could not load the leaderboard');
    }

    list.replaceChildren();
    if (entries.length === 0) {
      status.textContent = 'No scores yet. Be the first to play!';
      return;
    }

    status.textContent = '';
    entries.forEach((entry, index) => {
      const item = document.createElement('li');
      item.className = 'leaderboard-row';
      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = String(index + 1).padStart(2, '0');
      const username = document.createElement('span');
      username.className = 'leaderboard-username';
      username.textContent = entry.username;
      const score = document.createElement('strong');
      score.className = 'leaderboard-score';
      score.textContent = String(entry.best_score);
      item.append(rank, username, score);
      list.appendChild(item);
    });
  } catch (error) {
    status.textContent = error.message || 'Leaderboard is currently unavailable.';
  }
}

loadLeaderboard();
