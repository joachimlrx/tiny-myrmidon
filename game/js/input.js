// État global des touches sans fuite mémoire ni accumulation d'événements
export const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  shift: false
};

export const touchState = { active: false, dx: 0, dz: 0 };
export let isTouchDevice = false;

export function resetTouch() {
  touchState.active = false;
  touchState.dx = 0;
  touchState.dz = 0;
}

export function initInput(state, camera, togglePause, startSession) {
  // Utilisation d'un Set pour suivre uniquement les touches physiquement enfoncées à l'instant T
  const activeKeys = new Set();

  window.addEventListener('keydown', (e) => {
    // Empêche le comportement par défaut et la répétition native du système d'exploitation
    if (e.repeat) return; 

    if (e.key === 'Escape') {
      togglePause();
      return;
    }

    const k = e.key.toLowerCase();
    if (['z', 'q', 's', 'd', 'w', 'a', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
      e.preventDefault();
    }

    activeKeys.add(k);
    if (e.key === 'Shift') activeKeys.add('shift');

    updateKeyStates();

    if (!state.started && (keys.forward || keys.backward || keys.left || keys.right)) {
      startSession();
    }
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    activeKeys.delete(k);
    if (e.key === 'Shift') activeKeys.delete('shift');

    updateKeyStates();
  });

  function updateKeyStates() {
    keys.forward = activeKeys.has('z') || activeKeys.has('w') || activeKeys.has('arrowup');
    keys.backward = activeKeys.has('s') || activeKeys.has('arrowdown');
    keys.left = activeKeys.has('q') || activeKeys.has('a') || activeKeys.has('arrowleft');
    keys.right = activeKeys.has('d') || activeKeys.has('arrowright');
    keys.shift = activeKeys.has('shift');
  }

  window.addEventListener('touchstart', () => {
    isTouchDevice = true;
  }, { passive: true });
}
