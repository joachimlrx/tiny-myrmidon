function setBarWidth(elementId, percentage) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  element.style.width = clampedPercentage + '%';
}

export function updateHud(state, isTouchDevice) {
  const healthPercentage = (state.hp / state.maxHp) * 100;
  const experiencePercentage = (state.xp / state.nextXp) * 100;
  const cooldownPercentage =
    (1 - state.fireTimer / state.fireRate) * 100;

  setBarWidth('hp-bar', healthPercentage);
  setBarWidth('xp-bar', experiencePercentage);
  setBarWidth('cooldown-fill', cooldownPercentage);

  const healthLabel = document.getElementById('hp-label');
  const experienceLabel = document.getElementById('xp-label');
  const levelLabel = document.getElementById('level-value');
  const statsLabel = document.getElementById('stats');
  const pauseButton = document.getElementById('pause-btn');

  if (healthLabel) {
    healthLabel.textContent = Math.ceil(state.hp) + ' / ' + state.maxHp;
  }

  if (experienceLabel) {
    experienceLabel.textContent =
      state.xp + ' / ' + state.nextXp + ' XP';
  }

  if (levelLabel) {
    levelLabel.textContent = String(state.level);
  }

  if (statsLabel) {
    const movementHint = isTouchDevice
      ? 'Touch joystick'
      : 'ZQSD / WASD / Arrows';

    statsLabel.textContent =
      state.kills + ' defeated · ' +
      state.score.toLocaleString() + ' renown · ' +
      movementHint;
  }

  if (pauseButton) {
    pauseButton.textContent =
      state.paused && !state.over ? 'RESUME' : 'PAUSE';
  }
}

export function announceWave(level) {
  const banner = document.getElementById('wave-announcement');
  if (!banner) return;

  banner.textContent = level % 5 === 0
    ? 'WAVE ' + level + ' · THE CYCLOPS AWAKENS'
    : 'WAVE ' + level;

  banner.classList.remove('wave-visible');

  // Restart the CSS animation for each new wave.
  void banner.offsetWidth;
  banner.classList.add('wave-visible');
}
