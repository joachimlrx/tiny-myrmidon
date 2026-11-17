function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[m]);
}

export async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  try {
    const res = await fetch('/api/scores');
    if (!res.ok) throw new Error('Failed to fetch');
    const scores = await res.json();
    tbody.innerHTML = '';
    scores.slice(0, 5).forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${idx + 1}</td>
        <td style="font-weight: 600;">${escapeHtml(s.player_name)}</td>
        <td>${s.score}</td>
        <td>Wave ${s.wave}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ef4444;">Could not load leaderboard</td></tr>';
  }
}

export function initLeaderboardSubmit(state) {
  document.getElementById('submit-score-btn').onclick = async () => {
    const nameInput = document.getElementById('player-name');
    const status = document.getElementById('submit-status');
    const name = nameInput.value.trim();

    if (!name) {
      status.textContent = 'Please enter a hero name.';
      status.style.color = '#f59e0b';
      return;
    }

    try {
      status.textContent = 'Recording legend...';
      status.style.color = '#38bdf8';
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: name, score: state.score, wave: state.level }),
      });
      if (!res.ok) throw new Error('API returned ' + res.status);
      status.textContent = 'Score recorded!';
      status.style.color = '#10b981';
      document.getElementById('score-form').style.display = 'none';
      await loadLeaderboard();
    } catch {
      status.textContent = 'Error saving score.';
      status.style.color = '#ef4444';
    }
  };
}
