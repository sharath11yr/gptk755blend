# GetYr_Studio – cinematic history in Blender

Time-travel history videos (Titanic, pyramids, rockets, the Moon landing...) rendered in Blender
on GitHub Actions, with fact-checked narration and a free English voice.

**Current stage: Titanic test** (`.github/workflows/scene-test.yml`)
1. `plan`: NVIDIA writes the narration, Edge TTS voices it, and a licensed 3D model is fetched
   (Sketchfab: CC-BY/CC0 only, credited in `credit.txt`), plus a Poly Haven night sky.
2. `render`: 10 computers each render part of the scene in Blender 4.2 (Cycles).
3. `assemble`: the frames, narration and GetYr Studio branding are joined into `titanic_test.mp4`
   (download it from the run's Artifacts).

Secrets: `NVIDIA_API_KEY`, `SKETCHFAB_API_TOKEN` (YouTube secrets come later).
