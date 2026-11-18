import * as THREE from 'three';
import {scene,camera,renderer,composer,updateScene} from './scene.js';
import {state} from './state.js';
import {player,orbitalGroup,orbShieldMesh,updatePlayerAnimation} from './player.js';
import {enemies,spawnEnemy,updateEnemies,updateEnemyEffects,applyEnemyDamage} from './enemies.js';
import {fireSpears,tickFireTimer,updateSpears} from './weapons.js';
import {spawnGem,updateGems} from './gems.js';
import {showUpgrades} from './upgrades.js';
import {updateHud,announceWave} from './hud.js';
import {keys,touchState,isTouchDevice,resetTouch,initInput} from './input.js';
import {initLeaderboardSubmit,loadLeaderboard} from './leaderboard.js';
import {ARENA_RADIUS,FRAME_DT_CAP,CAMERA_HEIGHT,CAMERA_Z_OFFSET,SPAWN_INTERVAL_BASE,SPAWN_INTERVAL_MIN,SPAWN_LEVEL_SCALE,MAX_ENEMIES} from './config.js';
const refreshHud=()=>updateHud(state,isTouchDevice);
const openUpgrades=()=>showUpgrades(state,orbitalGroup,resetTouch,refreshHud);
let pauseModal=document.getElementById('pause-modal');
function togglePause(){if(state.over||document.getElementById('upgrade-modal').classList.contains('is-visible'))return;state.paused=!state.paused;pauseModal?.classList.toggle('is-visible',state.paused);resetTouch();refreshHud();}
initInput(state,camera,renderer,togglePause);initLeaderboardSubmit(state);refreshHud();announceWave(1);
let previous=performance.now(),elapsed=0,lastWave=1,orbitalHitClock=0;
const cameraTarget=new THREE.Vector3();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(FRAME_DT_CAP,(now-previous)/1000);previous=now;elapsed+=dt;if(state.paused||state.over){composer.render();return;}
let dx=(keys.d||keys.arrowright?1:0)-(keys.q||keys.a||keys.arrowleft?1:0),dz=(keys.s||keys.arrowdown?1:0)-(keys.z||keys.w||keys.arrowup?1:0);dx+=touchState.active?touchState.dx:0;dz+=touchState.active?touchState.dz:0;const moving=Math.hypot(dx,dz)>.08;if(moving){const l=Math.hypot(dx,dz);player.position.x+=dx/l*state.speed*dt;player.position.z+=dz/l*state.speed*dt;}const radius=Math.hypot(player.position.x,player.position.z);if(radius>ARENA_RADIUS-1){player.position.multiplyScalar((ARENA_RADIUS-1)/radius);}updatePlayerAnimation(dt,moving,state);state.upgradeAuraTimer=Math.max(0,state.upgradeAuraTimer-dt);
cameraTarget.set(player.position.x,0,player.position.z);const desired=new THREE.Vector3(player.position.x,CAMERA_HEIGHT,player.position.z+CAMERA_Z_OFFSET);camera.position.lerp(desired,1-Math.exp(-4*dt));camera.lookAt(cameraTarget);
state.spawnTimer-=dt;if(state.spawnTimer<=0&&enemies.length<MAX_ENEMIES){spawnEnemy(state,scene,player);state.spawnTimer=Math.max(SPAWN_INTERVAL_MIN,SPAWN_INTERVAL_BASE-(state.level-1)*SPAWN_LEVEL_SCALE);}
tickFireTimer(dt,state);fireSpears(state,scene,player);updateSpears(dt,state,scene,spawnGem);
if(state.hasOrbital){orbitalGroup.position.copy(player.position);state.orbitalAngle+=3.6*dt;orbitalGroup.rotation.y=state.orbitalAngle;orbitalHitClock-=dt;if(orbitalHitClock<=0){orbitalHitClock=.22;orbitalGroup.updateMatrixWorld(true);const p=new THREE.Vector3();orbShieldMesh.getWorldPosition(p);for(const e of enemies){if(!e.dead&&p.distanceTo(e.position)<e.userData.colliderRadius+.5){applyEnemyDamage(e,Math.max(1,state.dmg*.7),state,scene,spawnGem,new THREE.Vector3().subVectors(e.position,player.position));e.userData.knockback.add(new THREE.Vector3().subVectors(e.position,player.position).setY(0).normalize().multiplyScalar(1.1));}}}}
updateEnemies(dt,state,scene,player);updateGems(dt,state,scene,player,openUpgrades,refreshHud);updateEnemyEffects(dt,scene);updateScene(dt,elapsed);refreshHud();if(state.level!==lastWave){lastWave=state.level;announceWave(lastWave);}composer.render();}
requestAnimationFrame(frame);
