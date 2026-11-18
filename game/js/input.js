import { MAX_JOYSTICK_RADIUS } from './config.js';
import { resizeScene } from './scene.js';

export const keys = Object.create(null);

export const touchState = {
  active: false,
  identifier: null,
  startX: 0,
  startY: 0,
  dx: 0,
  dz: 0,
};

export const isTouchDevice =
  'ontouchstart' in window || navigator.maxTouchPoints > 0;

const MOVEMENT_KEYS = new Set([
  'z', 'q', 's', 'd', // AZERTY
  'w', 'a', // QWERTY alternatives
  'arrowup', 'arrowleft', 'arrowdown', 'arrowright',
]);

const TOUCH_BLOCKING_SELECTOR =
  '#upgrade-modal, #gameover-modal, #pause-modal, button, input';

const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');

/**
 * Clear the active touch direction and hide the on-screen joystick.
 */
export function resetTouch() {
  touchState.active = false;
  touchState.identifier = null;
  touchState.dx = 0;
  touchState.dz = 0;

  if (joystickBase) joystickBase.style.display = 'none';
  if (joystickKnob) {
    joystickKnob.style.transform = 'translate3d(0, 0, 0)';
  }
}

function handleKeyDown(event, togglePause) {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if ((key === 'p' || key === 'escape') && !event.repeat) {
    event.preventDefault();
    togglePause();
  }

  if (MOVEMENT_KEYS.has(key)) {
    event.preventDefault();
  }
}

function handleKeyUp(event) {
  keys[event.key.toLowerCase()] = false;
}

function clearKeyboardAndTouch() {
  Object.keys(keys).forEach((key) => {
    keys[key] = false;
  });
  resetTouch();
}

function isTouchBlockedByUi(target) {
  return target instanceof Element && target.closest(TOUCH_BLOCKING_SELECTOR);
}

function handleTouchStart(event, state) {
  if (state.paused || state.over) return;
  if (isTouchBlockedByUi(event.target)) return;
  if (touchState.active || event.changedTouches.length === 0) return;
  if (!joystickBase || !joystickKnob) return;

  const touch = event.changedTouches[0];

  touchState.active = true;
  touchState.identifier = touch.identifier;
  touchState.startX = touch.clientX;
  touchState.startY = touch.clientY;
  touchState.dx = 0;
  touchState.dz = 0;

  joystickBase.style.left = touch.clientX + 'px';
  joystickBase.style.top = touch.clientY + 'px';
  joystickBase.style.display = 'block';
  joystickKnob.style.transform = 'translate3d(0, 0, 0)';
}

function handleTouchMove(event) {
  if (!touchState.active || !joystickKnob) return;

  for (const touch of event.changedTouches) {
    if (touch.identifier !== touchState.identifier) continue;

    event.preventDefault();

    const offsetX = touch.clientX - touchState.startX;
    const offsetY = touch.clientY - touchState.startY;
    const distance = Math.hypot(offsetX, offsetY);
    const scale = distance > MAX_JOYSTICK_RADIUS
      ? MAX_JOYSTICK_RADIUS / distance
      : 1;

    const x = offsetX * scale;
    const y = offsetY * scale;

    joystickKnob.style.transform =
      'translate3d(' + x + 'px, ' + y + 'px, 0)';
    touchState.dx = x / MAX_JOYSTICK_RADIUS;
    touchState.dz = y / MAX_JOYSTICK_RADIUS;
    break;
  }
}

function handleTouchEnd(event) {
  for (const touch of event.changedTouches) {
    if (touch.identifier !== touchState.identifier) continue;
    resetTouch();
    break;
  }
}

function bindPauseAndRestartButtons(togglePause) {
  document.getElementById('pause-btn')?.addEventListener('click', togglePause);
  document.getElementById('resume-btn')?.addEventListener('click', togglePause);

  const restart = () => window.location.reload();

  document.getElementById('restart-btn')?.addEventListener('click', restart);
  document.getElementById('pause-restart-btn')?.addEventListener('click', restart);
}

/**
 * Register keyboard, touch and window events used by the game.
 */
export function initInput(state, camera, togglePause) {
  window.addEventListener('keydown', (event) => {
    handleKeyDown(event, togglePause);
  });

  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', clearKeyboardAndTouch);

  window.addEventListener('touchstart', (event) => {
    handleTouchStart(event, state);
  }, { passive: false });

  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);
  window.addEventListener('touchcancel', resetTouch);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    resizeScene(window.innerWidth, window.innerHeight);
  });

  bindPauseAndRestartButtons(togglePause);
}
