import * as THREE from 'three';
import { materials } from './materials.js';

const UPPER_ARM_LEN = 0.31;
// Distance du coude au creux exact du poing fermé (0.28 + 0.058 = 0.338)
const FORE_ARM_Y = 0.338;
const FORE_ARM_Z = 0.024;
const FORE_ARM_LEN = Math.hypot(FORE_ARM_Y, FORE_ARM_Z);
const HAND_ANGLE_OFFSET = Math.atan2(FORE_ARM_Z, FORE_ARM_Y);

// Butées biomécaniques humaines du coude
const MIN_ELBOW_FLEXION = 0.24; // ~14°
const MAX_ELBOW_FLEXION = 2.46; // ~141°

const _clampedTarget = new THREE.Vector3();
const _clampedPole = new THREE.Vector3();
const _rearGrip = new THREE.Vector3();
const _frontGrip = new THREE.Vector3();
const _rearRaise = new THREE.Vector3();
const _frontRaise = new THREE.Vector3();
const _rearStrike = new THREE.Vector3();
const _frontStrike = new THREE.Vector3();
const _spearDir = new THREE.Vector3();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _guardDir = new THREE.Vector3();
const _guardRaiseDir = new THREE.Vector3();
const _guardStrikeDir = new THREE.Vector3();
const _poleTorso = new THREE.Vector3();
const _shieldGrip = new THREE.Vector3();
const _shieldElbow = new THREE.Vector3();
const _handTransition = new THREE.Vector3();
const _shieldUpAxis = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _poleVec = new THREE.Vector3();
const _h0 = new THREE.Vector3();
const _e0 = new THREE.Vector3(0, -UPPER_ARM_LEN, 0);
const _xLoc = new THREE.Vector3();
const _yLoc = new THREE.Vector3();
const _zLoc = new THREE.Vector3();
const _xTgt = new THREE.Vector3();
const _yTgt = new THREE.Vector3();
const _zTgt = new THREE.Vector3();
const _mLoc = new THREE.Matrix4();
const _mTgt = new THREE.Matrix4();
const _qLoc = new THREE.Quaternion();
const _qTgt = new THREE.Quaternion();
const _handX = new THREE.Vector3();
const _handY = new THREE.Vector3();
const _handZ = new THREE.Vector3();
const _mHand = new THREE.Matrix4();
const _qElbowWorld = new THREE.Quaternion();
const _qHandWorld = new THREE.Quaternion();
const _forearmDir = new THREE.Vector3();

function applyAnatomicalArmEnvelope(arm, targetInTorso, poleInTorso) {
  const liftDelta = Math.max(0, targetInTorso.y - arm.baseShoulderPos.y);
  const forwardDelta = THREE.MathUtils.clamp(targetInTorso.z, -0.25, 0.55);
  arm.shoulder.position.set(
    arm.baseShoulderPos.x - arm.side * Math.min(0.022, liftDelta * 0.035),
    arm.baseShoulderPos.y + Math.min(0.042, liftDelta * 0.10),
    arm.baseShoulderPos.z + forwardDelta * 0.04
  );

  // Pilotage indépendant de l'épaulière (suit 38% de l'élévation et de l'antépulsion du bras sans jamais vriller)
  if (arm.pauldronPivot) {
    const armOutward = Math.max(0, arm.side * (targetInTorso.x - arm.baseShoulderPos.x));
    const elevationRatio = THREE.MathUtils.clamp((liftDelta + armOutward * 0.4) / 0.55, 0, 1);
    const forwardRatio = THREE.MathUtils.clamp(targetInTorso.z / 0.65, -0.35, 0.85);
    arm.pauldronPivot.position.set(
      arm.side * 0.37,
      0.55 + elevationRatio * 0.035,
      forwardRatio * 0.025
    );
    arm.pauldronPivot.rotation.set(
      -forwardRatio * 0.24,
      0,
      arm.side * (0.04 + elevationRatio * 0.46)
    );
  }

  // Empêche le poing de traverser la cage thoracique
  _clampedTarget.copy(targetInTorso);
  if (
    _clampedTarget.y > 0.05 &&
    _clampedTarget.y < 0.64 &&
    _clampedTarget.z > -0.20 &&
    _clampedTarget.z < 0.24 &&
    Math.abs(_clampedTarget.x) < 0.25
  ) {
    _clampedTarget.x = arm.side * 0.25;
  }

  _clampedPole.copy(poleInTorso);
  if (arm.side * _clampedPole.x < 0.16) {
    _clampedPole.x = arm.side * 0.16;
  }
}

function solveHumanArmIK(arm, fistTargetInTorso, poleInTorso, gripAxisInTorso = null) {
  applyAnatomicalArmEnvelope(arm, fistTargetInTorso, poleInTorso);

  const shoulderPos = arm.shoulder.position;
  _dir.subVectors(_clampedTarget, shoulderPos);
  const rawDist = _dir.length();

  const minDist = Math.sqrt(
    UPPER_ARM_LEN * UPPER_ARM_LEN +
      FORE_ARM_LEN * FORE_ARM_LEN -
      2 * UPPER_ARM_LEN * FORE_ARM_LEN * Math.cos(Math.PI - MAX_ELBOW_FLEXION)
  );
  const maxDist = Math.sqrt(
    UPPER_ARM_LEN * UPPER_ARM_LEN +
      FORE_ARM_LEN * FORE_ARM_LEN -
      2 * UPPER_ARM_LEN * FORE_ARM_LEN * Math.cos(Math.PI - MIN_ELBOW_FLEXION)
  );
  const d = THREE.MathUtils.clamp(rawDist, minDist, maxDist);

  if (rawDist > 0.0001) {
    _dir.divideScalar(rawDist);
  } else {
    _dir.set(0, -1, 0);
  }

  const cosInternal = THREE.MathUtils.clamp(
    (UPPER_ARM_LEN * UPPER_ARM_LEN + FORE_ARM_LEN * FORE_ARM_LEN - d * d) /
      (2 * UPPER_ARM_LEN * FORE_ARM_LEN),
    -1,
    1
  );
  const flexion = THREE.MathUtils.clamp(Math.PI - Math.acos(cosInternal), MIN_ELBOW_FLEXION, MAX_ELBOW_FLEXION);
  const elbowPitch = -flexion - HAND_ANGLE_OFFSET;
  arm.elbow.rotation.set(elbowPitch, 0, 0);

  const sinE = Math.sin(elbowPitch);
  const cosE = Math.cos(elbowPitch);
  _h0.set(
    0,
    -UPPER_ARM_LEN - FORE_ARM_Y * cosE - FORE_ARM_Z * sinE,
    -FORE_ARM_Y * sinE + FORE_ARM_Z * cosE
  );

  _zLoc.copy(_h0).normalize();
  _xLoc.crossVectors(_e0, _zLoc);
  if (_xLoc.lengthSq() < 1e-6) {
    _xLoc.set(1, 0, 0);
  } else {
    _xLoc.normalize();
  }
  _yLoc.crossVectors(_zLoc, _xLoc);

  _zTgt.copy(_dir);
  _poleVec.subVectors(_clampedPole, shoulderPos);
  _xTgt.crossVectors(_poleVec, _zTgt);
  if (_xTgt.lengthSq() < 1e-6) {
    _xTgt.set(1, 0, 0);
  } else {
    _xTgt.normalize();
  }
  _yTgt.crossVectors(_zTgt, _xTgt);

  _mLoc.makeBasis(_xLoc, _yLoc, _zLoc);
  _mTgt.makeBasis(_xTgt, _yTgt, _zTgt);
  _qLoc.setFromRotationMatrix(_mLoc);
  _qTgt.setFromRotationMatrix(_mTgt);

  arm.shoulder.quaternion.copy(_qTgt).multiply(_qLoc.invert());

  // Alignement EXACT (100%) de l'axe Z du poing fermé avec la hampe/poignée,
  // tout en conservant le roulis naturel de l'avant-bras (zéro torsion du poignet)
  if (gripAxisInTorso) {
    _qElbowWorld.copy(arm.shoulder.quaternion).multiply(arm.elbow.quaternion);

    // Direction naturelle de l'avant-bras (-Y local du coude) dans le repère du torse
    _forearmDir.set(0, -1, 0).applyQuaternion(_qElbowWorld);

    // L'axe Z du gantelet (cylindre de prise) doit être strictement parallèle à gripAxisInTorso
    _handZ.copy(gripAxisInTorso).normalize();

    // L'axe -Y du gantelet (prolongement de l'avant-bras) est projeté perpendiculairement à _handZ
    _handY.copy(_forearmDir).addScaledVector(_handZ, -_forearmDir.dot(_handZ));
    if (_handY.lengthSq() < 1e-5) {
      _handY.set(0, -1, 0).addScaledVector(_handZ, _handZ.y);
    }
    _handY.normalize().negate(); // +Y local du gantelet pointe vers le coude

    _handX.crossVectors(_handY, _handZ).normalize();
    _mHand.makeBasis(_handX, _handY, _handZ);
    _qHandWorld.setFromRotationMatrix(_mHand);

    arm.hand.quaternion.copy(_qElbowWorld).invert().multiply(_qHandWorld);
  } else {
    arm.hand.quaternion.identity();
  }
}

function computeLegLowestYInPelvis(leg) {
  const hx = leg.hip.rotation.x;
  const hz = leg.hip.rotation.z;
  const kx = leg.knee.rotation.x;
  const fx = leg.foot.rotation.x;

  const totalAngle = hx + kx + fx;
  const cosTotal = Math.cos(totalAngle);
  const sinTotal = Math.sin(totalAngle);

  const heelY = -0.200 * cosTotal + 0.058 * sinTotal;
  const toeY = -0.200 * cosTotal - 0.268 * sinTotal;
  const lowestFootOffset = Math.min(heelY, toeY);

  const legYInHip = -0.34 * Math.cos(hx) - 0.36 * Math.cos(hx + kx) + lowestFootOffset;
  return -0.04 + legYInHip * Math.cos(hz);
}

export function createAnimator(player, rig) {
  const stateData = {
    hitTimer: 0,
    attackTimer: 0,
    attackDuration: 0.72,
    attackMode: 'thrust',
    walkPhase: 0,
    animationTime: 0,
    moveBlend: 0,
    shieldGuardBlend: 0,
  };

  function triggerAttack(mode = 'thrust', slow = false) {
    if (stateData.attackTimer > 0) return;
    stateData.attackMode = mode;
    stateData.attackDuration = mode === 'thrust' ? (slow ? 1.24 : 0.72) : 1.24;
    stateData.attackTimer = stateData.attackDuration;
  }

  function triggerHit() {
    stateData.hitTimer = 0.26;
  }

  function update(dt, moving, gameState, shieldActive = false) {
    stateData.animationTime += dt;
    stateData.moveBlend = THREE.MathUtils.damp(stateData.moveBlend, moving ? 1 : 0, 10, dt);
    stateData.shieldGuardBlend = THREE.MathUtils.damp(stateData.shieldGuardBlend, shieldActive ? 1 : 0, 12, dt);

    const guard = stateData.shieldGuardBlend;
    const gaitSpeed = (2.8 + stateData.moveBlend * 5.2) * (1 - guard * 0.22);
    stateData.walkPhase += dt * gaitSpeed;

    const phase = stateData.walkPhase;
    const stride = Math.sin(phase);
    const doubleStride = Math.cos(phase * 2);
    const idleWeight = 1 - stateData.moveBlend;
    const breath = Math.sin(stateData.animationTime * 2.1);

    // 1. Marche humaine vers l'avant (+Z)
    for (const leg of rig.legs) {
      leg.foot.position.y = leg.baseFootY;
      const legPhase = phase + (leg.side > 0 ? Math.PI : 0);
      const swing = Math.sin(legPhase);
      const swingVel = Math.cos(legPhase);
      const airborne = Math.max(0, swingVel);
      const stanceCushion = Math.max(0, -swingVel) * Math.max(0, swing);

      const stanceKneeBend = 0.05 + guard * 0.14;
      const stanceHipSpread = 0.035 + guard * 0.04;

      leg.hip.rotation.x = -swing * (0.58 * stateData.moveBlend * (1 - guard * 0.22) + 0.008 * idleWeight) - guard * 0.09;
      leg.hip.rotation.z = -leg.side * stanceHipSpread;
      leg.knee.rotation.x = (airborne * 1.08 + stanceCushion * 0.22) * stateData.moveBlend + stanceKneeBend;
      leg.foot.rotation.x = -leg.hip.rotation.x * 0.45 - leg.knee.rotation.x * 0.62 - airborne * 0.16 * stateData.moveBlend;
    }

    for (const tasset of rig.tassets) {
      const legPhase = phase + (tasset.side > 0 ? Math.PI : 0);
      const forwardThigh = Math.max(0, Math.sin(legPhase));
      tasset.pivot.rotation.x = -forwardThigh * 0.42 * stateData.moveBlend - guard * 0.14;
    }

    // 2. Contre-rotation naturelle du bassin, du buste et de la tête
    rig.pelvis.position.z = 0;
    rig.pelvis.rotation.y = stride * 0.09 * stateData.moveBlend - guard * 0.26;
    rig.pelvis.rotation.z = -stride * 0.035 * stateData.moveBlend;

    rig.torso.rotation.x = 0.08 * stateData.moveBlend + guard * 0.06 + breath * 0.014 * idleWeight;
    rig.torso.rotation.y = -stride * 0.13 * stateData.moveBlend - guard * 0.16;
    rig.torso.rotation.z = stride * 0.035 * stateData.moveBlend;

    rig.head.rotation.x = -0.07 * stateData.moveBlend - guard * 0.05 - breath * 0.012;
    rig.head.rotation.y = stride * 0.07 * stateData.moveBlend + guard * 0.40;
    rig.head.rotation.z = -stride * 0.02 * stateData.moveBlend;

    // 3. Drapé d'épaules et cimier
    rig.backDrape.rotation.x = 0.05 + stateData.moveBlend * 0.09 + Math.sin(stateData.animationTime * 4.2) * 0.015;
    rig.backDrape.rotation.z = 0.06 + stride * 0.03 * stateData.moveBlend;
    rig.crest.rotation.z = Math.sin(stateData.animationTime * 3.1) * 0.03 + stride * 0.05 * stateData.moveBlend;
    rig.crest.rotation.x = -0.06 * stateData.moveBlend + doubleStride * 0.02 * stateData.moveBlend;

    // 4. Cinématique d'estocade verticale
    stateData.attackTimer = Math.max(0, stateData.attackTimer - dt);
    const attacking = stateData.attackTimer > 0;
    const progress = attacking ? 1 - stateData.attackTimer / stateData.attackDuration : 0;

    let raise = 0;
    let strike = 0;

    if (attacking && stateData.attackMode === 'thrust') {
      raise = THREE.MathUtils.smoothstep(progress, 0.00, 0.24) * (1 - THREE.MathUtils.smoothstep(progress, 0.24, 0.34));
      strike = THREE.MathUtils.smoothstep(progress, 0.22, 0.38) * (1 - THREE.MathUtils.smoothstep(progress, 0.62, 0.98));

      rig.pelvis.position.z = -0.07 * raise + 0.24 * strike;
      const pelvisTwist = 0.22 * raise - 0.24 * strike;
      const torsoTwist = 0.26 * raise - 0.34 * strike;

      rig.pelvis.rotation.y += pelvisTwist;
      rig.torso.rotation.x += -0.14 * raise + 0.26 * strike;
      rig.torso.rotation.y += torsoTwist;

      rig.head.rotation.y -= (pelvisTwist + torsoTwist) * 0.85;
      rig.head.rotation.x += 0.12 * raise - 0.16 * strike;

      rig.legs[1].hip.rotation.x += 0.16 * raise - 0.54 * strike;
      rig.legs[1].knee.rotation.x += 0.66 * strike;
      rig.legs[1].foot.rotation.x = -(rig.legs[1].hip.rotation.x + rig.legs[1].knee.rotation.x);

      rig.legs[0].hip.rotation.x += 0.38 * strike;
      rig.legs[0].foot.rotation.x += 0.22 * strike;
    }

    // 5. Ancrage exact au sol
    const lowestLeft = computeLegLowestYInPelvis(rig.legs[0]);
    const lowestRight = computeLegLowestYInPelvis(rig.legs[1]);
    const stanceFootBottom = Math.min(lowestLeft, lowestRight);
    rig.pelvis.position.y = -stanceFootBottom;

    // 6. Trajectoire orbitale du bouclier autour du flanc gauche (+X)
    const arcAngle = guard * Math.PI;
    const flankClearance = 0.42 * Math.sin(arcAngle);
    rig.shieldRig.position.set(
      THREE.MathUtils.lerp(0.04, 0.26, guard) + flankClearance,
      THREE.MathUtils.lerp(0.34, 0.28, guard) + Math.sin(arcAngle) * 0.05,
      THREE.MathUtils.lerp(-0.30, 0.36, guard)
    );
    rig.shieldRig.rotation.set(
      THREE.MathUtils.lerp(0.14, -0.05, guard),
      THREE.MathUtils.lerp(Math.PI, 0.38, guard),
      THREE.MathUtils.lerp(0.18, -0.04, guard)
    );

    // 7. Réaction d'impact subie
    stateData.hitTimer = Math.max(0, stateData.hitTimer - dt);
    const hitWeight = THREE.MathUtils.clamp(stateData.hitTimer / 0.26, 0, 1);
    rig.pelvis.position.x = Math.sin(stateData.animationTime * 37) * 0.06 * hitWeight;
    rig.torso.rotation.z += hitWeight * 0.16;
    rig.torso.rotation.x -= hitWeight * 0.11;
    rig.head.rotation.z += hitWeight * 0.10;
    if (guard > 0.5 && hitWeight > 0) {
      rig.shieldRig.position.z -= hitWeight * 0.10;
      rig.shieldRig.rotation.x -= hitWeight * 0.16;
    }

    // 8. Résolution exacte des poings sur la lance (creux du poing = position exacte de la hampe)
    const rightArm = rig.arms[0]; // -X
    const leftArm = rig.arms[1];  // +X
    const walkBob = Math.sin(phase) * 0.014 * stateData.moveBlend;
    const armSway = stride * 0.022 * stateData.moveBlend;
    const idleBreathOffset = breath * 0.007 * idleWeight;

    if (guard < 0.5) {
      // Garde de base à deux mains
      _rearGrip.set(-0.30, 0.14 + walkBob + idleBreathOffset, 0.02 - armSway);
      _frontGrip.set(-0.02, 0.36 + walkBob * 0.8 + idleBreathOffset, 0.56 + armSway * 0.8);

      // Armement haut au-dessus de l'épaule droite
      _rearRaise.set(-0.32, 0.86, -0.14);
      _frontRaise.set(-0.04, 0.58, 0.34);

      // Plongée verticale vers l'avant
      _rearStrike.set(-0.20, 0.44, 0.04);
      _frontStrike.set(0.04, 0.22, 0.48);

      if (raise > 0) {
        _rearGrip.lerp(_rearRaise, raise);
        _frontGrip.lerp(_frontRaise, raise);
      }
      if (strike > 0) {
        _rearGrip.lerp(_rearStrike, strike);
        _frontGrip.lerp(_frontStrike, strike);
      }

      _spearDir.subVectors(_frontGrip, _rearGrip).normalize();
      rig.spearRig.position.copy(_rearGrip);
      rig.spearRig.quaternion.setFromUnitVectors(_zAxis, _spearDir);

      _poleTorso.set(
        -0.56,
        THREE.MathUtils.lerp(0.22, 1.05, raise) - 0.10 * strike,
        THREE.MathUtils.lerp(-0.26, -0.40, raise)
      );
      solveHumanArmIK(rightArm, _rearGrip, _poleTorso, _spearDir);

      if (guard > 0.02) {
        const t = guard * 2;
        _handTransition.set(0.56, 0.26, 0.18);
        _frontGrip.lerp(_handTransition, t);
      }
      _poleTorso.set(0.52, THREE.MathUtils.lerp(0.10, 0.34, raise) - 0.14 * strike, -0.06);
      solveHumanArmIK(leftArm, _frontGrip, _poleTorso, _spearDir);
    } else {
      // GARDE AU BOUCLIER (Shift) :
      // Poing droit à hauteur des côtes/poitrine (-0.36, 0.34, 0.14), coude dégagé en arrière (-0.54, 0.22, -0.24)
      // Lance pointée légèrement vers le haut (+7°) par-dessus le bord droit du bouclier, puis levée et plongée
      _rearGrip.set(-0.36, 0.34 + walkBob, 0.14 - armSway * 0.5);
      _rearRaise.set(-0.36, 0.72, 0.04);
      _rearStrike.set(-0.24, 0.40, 0.48);

      if (raise > 0) _rearGrip.lerp(_rearRaise, raise);
      if (strike > 0) _rearGrip.lerp(_rearStrike, strike);

      _guardDir.set(0.05, 0.12, 0.991).normalize();
      _guardRaiseDir.set(0.08, -0.18, 0.980).normalize();
      _guardStrikeDir.set(0.12, -0.26, 0.958).normalize();

      if (raise > 0) _guardDir.lerp(_guardRaiseDir, raise).normalize();
      if (strike > 0) _guardDir.lerp(_guardStrikeDir, strike).normalize();

      rig.spearRig.position.copy(_rearGrip);
      rig.spearRig.quaternion.setFromUnitVectors(_zAxis, _guardDir);

      if (strike > 0) {
        rig.shieldRig.position.x -= 0.06 * strike;
        rig.shieldRig.position.z += 0.05 * strike;
        rig.shieldRig.rotation.y -= 0.10 * strike;
      }

      _poleTorso.set(-0.56, THREE.MathUtils.lerp(0.22, 0.62, raise) - 0.08 * strike, -0.26);
      solveHumanArmIK(rightArm, _rearGrip, _poleTorso, _guardDir);

      // Prise hoplite gauche (+X) : poing gauche sur la poignée antilabe (-0.16) et coude dans le brassard porpax (+0.14)
      _shieldGrip.set(-0.16, -0.02, -0.036).applyQuaternion(rig.shieldRig.quaternion).add(rig.shieldRig.position);
      _shieldElbow.set(0.18, -0.02, -0.14).applyQuaternion(rig.shieldRig.quaternion).add(rig.shieldRig.position);

      if (guard < 0.98) {
        const t = (1 - guard) * 2;
        _handTransition.set(0.56, 0.26, 0.18);
        _shieldGrip.lerp(_handTransition, t);
      }

      _shieldUpAxis.set(0, 1, 0).applyQuaternion(rig.shieldRig.quaternion);
      solveHumanArmIK(leftArm, _shieldGrip, _shieldElbow, _shieldUpAxis);
    }

    rig.spearRig.visible = true;
    rig.spearRig.scale.setScalar(1);

    rig.shadow.material.opacity = 0.86 - Math.abs(stride) * stateData.moveBlend * 0.10;

    if (gameState) {
      materials.darkSteel.emissive.setHex(gameState.upgradeAuraTimer > 0 ? 0x30000a : 0x000000);
      materials.agedBronze.emissiveIntensity = gameState.upgradeAuraTimer > 0 ? 0.42 : 0.14;
      materials.crimsonCloth.emissive.setHex(gameState.upgradeAuraTimer > 0 ? 0x3a0008 : 0x000000);
    }
  }

  return { stateData, triggerAttack, triggerHit, update };
}
