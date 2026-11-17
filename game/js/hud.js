export function updateHud(state, isTouchDevice) {
  document.getElementById('hp-bar').style.width = `${Math.max(0, (state.hp / state.maxHp) * 100)}%`;
  document.getElementById('xp-bar').style.width = `${(state.xp / state.nextXp) * 100}%`;
  const hint = isTouchDevice ? 'Touch & Drag to move' : 'WASD to move';
  document.getElementById('stats').textContent =
    `Wave ${state.level} | Slain: ${state.kills} | Score: ${state.score} | ${hint}`;
}
