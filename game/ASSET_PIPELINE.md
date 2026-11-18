# Character Art Pipeline

## Why the current characters look stylized

The current Myrmidon and enemy models are assembled from primitive Three.js geometry (capsules, spheres, cylinders and boxes). These shapes are useful for prototypes, but they cannot reproduce the anatomy, facial detail, cloth folds, hair and armour construction expected from a realistic action game.

Lighting and material changes can improve the presentation, but they cannot replace the missing character geometry and authored textures.

## Recommended asset format

Keep Three.js for the browser build and use self-contained glTF binary files (`.glb`) for finished characters.

A character asset should include:

- A human-shaped, game-ready mesh with clean topology and real-world scale.
- A humanoid skeleton with skin weights, suitable for retargeting.
- PBR base-colour, normal, roughness and ambient-occlusion textures.
- Separate material slots for skin, cloth, leather, bronze and steel.
- Hair, facial features, hands, feet and layered clothing modelled as part of the asset.
- Named animation clips for idle, walk, run, throw, thrust, hit and death.

Three.js supports glTF meshes, skins, skeletons, morph targets, animations and PBR materials through GLTFLoader.

## Suggested performance budgets

| Asset | Target |
| --- | ---: |
| Playable hero | 40k–100k triangles |
| Standard enemy | 15k–35k triangles |
| Large boss | 35k–75k triangles |
| Hero textures | 2K |
| Enemy textures | 1K–2K |
| Active animated characters | Profile on target devices |

These are starting budgets, not hard limits. Use LODs and shared materials when the arena contains many enemies.

## Licensing and delivery

Only add assets that are owned by the project or have a licence that explicitly allows the intended commercial use. Keep the licence and original source next to each model.

Suggested layout:

```text
game/assets/characters/
├── myrmidon/
│   ├── myrmidon.glb
│   └── LICENSE.txt
├── trojan/
│   ├── trojan.glb
│   └── LICENSE.txt
├── harpy/
│   ├── harpy.glb
│   └── LICENSE.txt
└── cyclops/
    ├── cyclops.glb
    └── LICENSE.txt
```

Do not commit a model until its scale, skeleton, animation clips, texture maps, file size and browser performance have been checked.

## When to reconsider the engine

An engine migration should be a separate decision based on the shipping platform:

- For a browser-first game, Three.js plus authored GLB assets is the lowest-risk route.
- For a downloadable PC/console game with a large cinematic budget, prototype Unreal Engine 5 and compare character quality, animation, lighting, build size and production cost.
- Unreal Pixel Streaming is a cloud-rendered browser experience, not a lightweight static web deployment. It needs GPU infrastructure and a streaming service.

Changing the renderer before obtaining high-quality character assets would move the project without fixing its main art-quality constraint.
