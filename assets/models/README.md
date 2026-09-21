# 3D models

The current island model is:

```text
assets/models/island.glb
```

Recommended export conventions:

- Binary glTF (`.glb`) with textures embedded.
- Y axis up.
- Island centered around X/Z origin.
- Playable surface close to Y = 0.
- Applied transforms, with scale set to 1.
- Real-time materials compatible with glTF PBR.
- Short, ASCII-only mesh and material names.
- No cameras or lights unless they are intentionally part of the asset.
- Avoid unnecessarily large textures or hidden geometry.

The app loads this GLB directly through Three.js's GLTF loader.
