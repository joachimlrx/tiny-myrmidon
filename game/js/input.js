import { MAX_JOYSTICK_RADIUS } from './config.js';

export const keys = {};

export const touchState = {
  active: false,
  identifier: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  dx: 0,
  dz: 0,
};

export const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');

export function resetTouch() {
  touchState.active = false;
  touchState.identifier = null;
  touchState.dx = 0;
  touchState.dz = 0;
  joystickBase.style.display = 'none';
  joystickKnob.style.transform = 'translate3d(0, 0, 0)';
}

export function initInput(state, camera, renderer) {
  window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  window.addEventListener('touchstart', (e) => {
    if (state.paused || state.over) return;
    if (e.target.closest('#upgrade-modal, #gameover-modal, button, input')) return;
    if (touchState.active) return;

    const touch = e.changedTouches[0];
    touchState.active = true;
    touchState.identifier = touch.identifier;
    touchState.startX = touch.clientX;
    touchState.startY = touch.clientY;
    touchState.currentX = touch.clientX;
    touchState.currentY = touch.clientY;
    touchState.dx = 0;
    touchState.dz = 0;

    joystickBase.style.left = `${touch.clientX}px`;
    joystickBase.style.top = `${touch.clientY}px`;
    joystickBase.style.display = 'block';
    joystickKnob.style.transform = 'translate3d(0, 0, 0)';
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (!touchState.active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== touchState.identifier) continue;

      e.preventDefault();
      const rawDx = touch.clientX - touchState.startX;
      const rawDy = touch.clientY - touchState.startY;
      const dist = Math.hypot(rawDx, rawDy);

      let clampedX = rawDx;
      let clampedY = rawDy;
      if (dist > MAX_JOYSTICK_RADIUS) {
        clampedX = (rawDx / dist) * MAX_JOYSTICK_RADIUS;
        clampedY = (rawDy / dist) * MAX_JOYSTICK_RADIUS;
      }

      joystickKnob.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
      touchState.dx = clampedX / MAX_JOYSTICK_RADIUS;
      touchState.dz = clampedY / MAX_JOYSTICK_RADIUS;
      break;
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchState.identifier) {
        resetTouch();
        break;
      }
    }
  });

  window.addEventListener('touchcancel', resetTouch);

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}
