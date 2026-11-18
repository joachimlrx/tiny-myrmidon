function createLeaderboardRow(score, rank) {
  const row = document.createElement('tr');

  const rankCell = document.createElement('td');
  const nameCell = document.createElement('td');
  const scoreCell = document.createElement('td');
  const waveCell = document.createElement('td');

  rankCell.textContent = '#' + rank;
  nameCell.textContent = score.player_name;
  nameCell.className = 'leader-name';
  scoreCell.textContent = Number(score.score).toLocaleString();
  waveCell.textContent = 'W' + score.wave;

  row.append(rankCell, nameCell, scoreCell, waveCell);
  return row;
}

function renderLeaderboardRows(tbody, scores) {
  tbody.replaceChildren();

  scores.slice(0, 5).forEach((score, index) => {
    tbody.appendChild(createLeaderboardRow(score, index + 1));
  });
}

function showLeaderboardUnavailable(tbody) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');

  cell.colSpan = 4;
  cell.className = 'leaderboard-error';
  cell.textContent = 'The hall of legends is temporarily unavailable.';

  row.appendChild(cell);
  tbody.replaceChildren(row);
}

function setSubmissionStatus(status, message, stateName) {
  status.textContent = message;
  status.dataset.state = stateName;
}

export async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;

  try {
    const response = await fetch('/api/scores');

    if (!response.ok) {
      throw new Error('Leaderboard request failed: ' + response.status);
    }

    const scores = await response.json();
    renderLeaderboardRows(tbody, scores);
  } catch {
    showLeaderboardUnavailable(tbody);
  }
}

async function submitScore(state, elements) {
  const { input, submitButton, status, form } = elements;
  const playerName = input.value.trim();

  if (!playerName) {
    setSubmissionStatus(
      status,
      'Enter a hero name before recording your legend.',
      'error',
    );
    return;
  }

  submitButton.disabled = true;
  setSubmissionStatus(
    status,
    'Carving your name into history...',
    'loading',
  );

  try {
    const response = await fetch('/api/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player_name: playerName.slice(0, 30),
        score: Math.max(0, Math.floor(state.score)),
        wave: Math.max(1, Math.floor(state.level)),
      }),
    });

    if (!response.ok) {
      throw new Error('Score submission failed: ' + response.status);
    }

    setSubmissionStatus(
      status,
      'Your legend has been recorded.',
      'success',
    );

    form.hidden = true;
    await loadLeaderboard();
  } catch {
    setSubmissionStatus(
      status,
      'Could not record the score. Please try again.',
      'error',
    );

    submitButton.disabled = false;
  }
}

export function initLeaderboardSubmit(state) {
  const submitButton = document.getElementById('submit-score-btn');
  const input = document.getElementById('player-name');
  const status = document.getElementById('submit-status');
  const form = document.getElementById('score-form');

  if (!submitButton || !input || !status || !form) return;

  submitButton.addEventListener('click', () => {
    submitScore(state, {
      input,
      submitButton,
      status,
      form,
    });
  });
}
