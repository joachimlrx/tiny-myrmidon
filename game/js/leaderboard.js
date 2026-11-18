function renderLeaderboardRows(tbody, scores) {
  tbody.replaceChildren();
  scores.slice(0, 5).forEach((score, index) => {
    const row = document.createElement('tr');
    const rank = document.createElement('td');
    const name = document.createElement('td');
    const points = document.createElement('td');
    const wave = document.createElement('td');
    rank.textContent = '#' + (index + 1);
    name.textContent = score.player_name;
    name.className = 'leader-name';
    points.textContent = Number(score.score).toLocaleString();
    wave.textContent = 'W' + score.wave;
    row.append(rank, name, points, wave);
    tbody.appendChild(row);
  });
}

export async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;
  try {
    const response = await fetch('/api/scores');
    if (!response.ok) throw new Error('Leaderboard request failed: ' + response.status);
    const scores = await response.json();
    renderLeaderboardRows(tbody, scores);
  } catch {
    tbody.replaceChildren();
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'leaderboard-error';
    cell.textContent = 'The hall of legends is temporarily unavailable.';
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

export function initLeaderboardSubmit(state) {
  const submit = document.getElementById('submit-score-btn');
  if (!submit) return;
  submit.addEventListener('click', async () => {
    const input = document.getElementById('player-name');
    const status = document.getElementById('submit-status');
    const form = document.getElementById('score-form');
    const name = input.value.trim();
    if (!name) {
      status.textContent = 'Enter a hero name before recording your legend.';
      status.dataset.state = 'error';
      return;
    }
    submit.disabled = true;
    status.textContent = 'Carving your name into history...';
    status.dataset.state = 'loading';
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: name.slice(0, 30), score: Math.max(0, Math.floor(state.score)), wave: Math.max(1, Math.floor(state.level)) }),
      });
      if (!response.ok) throw new Error('Score submission failed: ' + response.status);
      status.textContent = 'Your legend has been recorded.';
      status.dataset.state = 'success';
      form.hidden = true;
      await loadLeaderboard();
    } catch {
      status.textContent = 'Could not record the score. Please try again.';
      status.dataset.state = 'error';
      submit.disabled = false;
    }
  });
}
