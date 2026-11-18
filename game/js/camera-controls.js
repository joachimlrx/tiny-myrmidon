import * as THREE from 'three';

import { CAMERA_HEIGHT, CAMERA_Z_OFFSET } from './config.js';

const MIN_CAMERA_DISTANCE = 8.5;
const MAX_CAMERA_DISTANCE = 23;
const MIN_CAMERA_PITCH = 0.28;
const MAX_CAMERA_PITCH = 1.28;
const MOUSE_ROTATION_SPEED = 0.005;
const MOUSE_PITCH_SPEED = 0.004;
const CAMERA_SMOOTHING = 5;

const INTERACTIVE_SELECTOR = [
  'button',
  'input',
  'textarea',
  'select',
  'a',
  '[contenteditable="true"]',
  '#hud',
  '#pause-modal',
  '#upgrade-modal',
  '#gameover-modal',
].join(', ');

function isInteractiveTarget(target) {
  return target instanceof Element && target.closest(INTERACTIVE_SELECTOR);
}

/**
 * Add mouse orbit and wheel zoom to the existing game camera.
 *
 * Drag with the left mouse button to rotate around the hero.
 * Use the mouse wheel to move closer to or farther from the arena.
 */
export function createCameraControls(camera) {
  let yaw = 0;
  let pitch = Math.atan2(CAMERA_HEIGHT, CAMERA_Z_OFFSET);
  let distance = Math.hypot(CAMERA_HEIGHT, CAMERA_Z_OFFSET);
  let isDragging = false;
  let previousPointerX = 0;
  let previousPointerY = 0;

  const desiredPosition = new THREE.Vector3();

  function handlePointerDown(event) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    isDragging = true;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    document.body.classList.add('camera-dragging');
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (!isDragging) return;

    const deltaX = event.clientX - previousPointerX;
    const deltaY = event.clientY - previousPointerY;

    previousPointerX = event.clientX;
    previousPointerY = event.clientY;

    yaw -= deltaX * MOUSE_ROTATION_SPEED;
    pitch = THREE.MathUtils.clamp(
      pitch - deltaY * MOUSE_PITCH_SPEED,
      MIN_CAMERA_PITCH,
      MAX_CAMERA_PITCH,
    );
  }

  function stopDragging() {
    isDragging = false;
    document.body.classList.remove('camera-dragging');
  }

  function handleWheel(event) {
    if (isInteractiveTarget(event.target)) return;

    distance = THREE.MathUtils.clamp(
      distance + event.deltaY * 0.01,
      MIN_CAMERA_DISTANCE,
      MAX_CAMERA_DISTANCE,
    );

    event.preventDefault();
  }

  function update(target, deltaTime) {
    const horizontalDistance = Math.cos(pitch) * distance;

    desiredPosition.set(
      target.x + Math.sin(yaw) * horizontalDistance,
      target.y + Math.sin(pitch) * distance,
      target.z + Math.cos(yaw) * horizontalDistance,
    );

    camera.position.lerp(
      desiredPosition,
      1 - Math.exp(-CAMERA_SMOOTHING * deltaTime),
    );

    camera.lookAt(target);
  }

  // Listen on window so dragging also works over the translucent title screen.
  window.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', stopDragging);
  window.addEventListener('pointercancel', stopDragging);
  window.addEventListener('blur', stopDragging);
  window.addEventListener('wheel', handleWheel, { passive: false });

  return { update };
}
