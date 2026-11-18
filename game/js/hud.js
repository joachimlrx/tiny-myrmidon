export function updateHud(state, isTouchDevice) {
  const hp = document.getElementById('hp-bar');
  const xp = document.getElementById('xp-bar');
  const hpLabel = document.getElementById('hp-label');
  const xpLabel = document.getElementById('xp-label');
  const stats = document.getElementById('stats');
  const cooldown = document.getElementById('cooldown-fill');
  const level = document.getElementById('level-value');
  const pauseButton = document.getElementById('pause-btn');

  if (hp) hp.style.width = Math.max(0, (state.hp / state.maxHp) * 100) + '%';
  if (xp) xp.style.width = Math.min(100, (state.xp / state.nextXp) * 100) + '%';
  if (hpLabel) hpLabel.textContent = Math.ceil(state.hp) + ' / ' + state.maxHp;
  if (xpLabel) xpLabel.textContent = state.xp + ' / ' + state.nextXp + ' XP';
  if (level) level.textContent = String(state.level);
  if (stats) stats.textContent = state.kills + ' defeated  ·  ' + state.score.toLocaleString() + ' renown  ·  ' + (isTouchDevice ? 'Touch joystick' : 'ZQSD / WASD / Arrows');
  if (cooldown) cooldown.style.width = Math.max(0, Math.min(100, (1 - state.fireTimer / state.fireRate) * 100)) + '%';
  if (pauseButton) pauseButton.textContent = state.paused && !state.over ? 'RESUME' : 'PAUSE';
}

export function announceWave(level) {
  const banner = document.getElementById('wave-announcement');
  if (!banner) return;
  banner.textContent = level % 5 === 0 ? 'WAVE ' + level + ' · THE CYCLOPS AWAKENS' : 'WAVE ' + level;
  banner.classList.remove('wave-visible');
  void banner.offsetWidth;
  banner.classList.add('wave-visible');
}
