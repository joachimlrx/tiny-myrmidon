# Myrmidon — Black Knight Character Brief

## Visual target

Create a premium, stylized 3D action-game character in the visual language of a high-quality mobile arena battler: bold readable shapes, clean material separation, strong silhouette and polished lighting. The character must feel intimidating and formidable rather than cute or heroic.

### Non-negotiable identity

- Full-body humanoid warrior.
- Black / near-black plate armour as the dominant material.
- The face must be completely concealed: no visible skin, eyes, mouth or facial features.
- Helmet must read clearly at gameplay camera distance.
- Heavy, powerful silhouette with believable anatomy and clean proportions.
- The final model must be based on the approved reference image when it becomes available. Do not invent small signature details that contradict that reference.

### Material and finish direction

- Armour: dark gunmetal / black steel, with controlled metallic highlights and readable bevels.
- Secondary materials: restrained dark leather and cloth.
- Accent colour: use sparingly; keep the overall impression dark and threatening.
- Avoid bright bronze as the dominant armour colour.
- Avoid exposed skin and an open-faced helmet.

## Technical delivery

Deliver a self-contained `.glb` file for the existing browser game.

Required:
- One humanoid rig with stable, named bones.
- Clean mesh and sensible deformation around shoulders, elbows, hips and knees.
- PBR materials; packed textures where appropriate.
- Origin at the ground plane; character faces the game's forward direction.
- Consistent scale with the existing player collider.
- Named clips: `Idle`, `Walk`, `Run`, `SpearAttack`, `Hit`, `Death`.
- Keep the spear and shield as separate attachable objects or clearly named rig nodes.
- No external texture paths; the GLB must be portable.

## Integration constraints

- Keep Three.js and the current player/gameplay systems.
- Replace the current placeholder asset at `game/models/myrmidon.gltf` only after the new GLB passes validation.
- Preserve the procedural player as a fallback until the final asset is tested.
- Keep gameplay collider dimensions and weapon hit logic independent from cosmetic mesh changes.
- Check model orientation, ground contact, camera framing, animation playback and browser loading.

## Acceptance checklist

- [ ] Silhouette and armour design match the approved reference.
- [ ] Face is fully hidden from front, side and rear views.
- [ ] No obvious gaps, intersections or floating armour plates.
- [ ] Idle, locomotion, attack, hit and death animations play without visible deformation errors.
- [ ] Spear and shield remain aligned with the hands during animation.
- [ ] Model loads in the browser without console errors.
- [ ] Character scale and collider still feel correct in gameplay.
- [ ] File size and texture resolution are appropriate for the target devices.
- [ ] Asset source and licence are documented.

## Current repository status

The existing `game/models/myrmidon.gltf` is a lightweight placeholder assembled from reused primitive geometry. It proves that the GLTF loading path exists, but it is not the final black-armoured character and should not be treated as a production-quality asset.

The player code already loads a GLTF model through Three.js and retains a procedural fallback. The next asset step is to create and validate the reference-matched rigged model, then integrate it without changing combat logic.
