import { MAX_JOYSTICK_RADIUS } from './config.js';
import { resizeScene } from './scene.js';

export const keys = Object.create(null);
export const touchState = { active: false, identifier: null, startX: 0, startY: 0, dx: 0, dz: 0 };
export const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');

export function resetTouch() {
  touchState.active = false;
  touchState.identifier = null;
  touchState.dx = 0;
  touchState.dz = 0;
  if (joystickBase) joystickBase.style.display = 'none';
  if (joystickKnob) joystickKnob.style.transform = 'translate3d(0, 0, 0)';
}

export function initInput(state, camera, renderer, togglePause) {
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    keys[key] = true;
    if (key === 'p' || key === 'escape') {
      event.preventDefault();
      togglePause();
    }
    if (key.startsWith('arrow') || 'zqsdwasd'.includes(key)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => { keys[event.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => {
    Object.keys(keys).forEach((key) => { keys[key] = false; });
    resetTouch();
  });

  document.getElementById('pause-btn')?.addEventListener('click', togglePause);
  document.getElementById('resume-btn')?.addEventListener('click', togglePause);
  document.getElementById('restart-btn')?.addEventListener('click', () => window.location.reload());
  document.getElementById('pause-restart-btn')?.addEventListener('click', () => window.location.reload());

  window.addEventListener('touchstart', (event) => {
    if (state.paused || state.over) return;
    if (event.target.closest('#upgrade-modal, #gameover-modal, #pause-modal, button, input')) return;
    if (touchState.active || event.changedTouches.length === 0) return;
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
  }, { passive: false });

  window.addEventListener('touchmove', (event) => {
    if (!touchState.active) return;
    for (const touch of event.changedTouches) {
      if (touch.identifier !== touchState.identifier) continue;
      event.preventDefault();
      const rawX = touch.clientX - touchState.startX;
      const rawY = touch.clientY - touchState.startY;
      const distance = Math.hypot(rawX, rawY);
      const scale = distance > MAX_JOYSTICK_RADIUS ? MAX_JOYSTICK_RADIUS / distance : 1;
      const x = rawX * scale;
      const y = rawY * scale;
      joystickKnob.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
      touchState.dx = x / MAX_JOYSTICK_RADIUS;
      touchState.dz = y / MAX_JOYSTICK_RADIUS;
      break;
    }
  }, { passive: false });

  window.addEventListener('touchend', (event) => {
    for (const touch of event.changedTouches) {
      if (touch.identifier === touchState.identifier) {
        resetTouch();
        break;
      }
    }
  });
  window.addEventListener('touchcancel', resetTouch);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    resizeScene(window.innerWidth, window.innerHeight);
  });
}
