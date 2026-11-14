# Network Theory / Analog course - owner's rules
- Students know NOTHING: start from the absolute base, explain every idea clearly.
- Concept -> animation -> formulas (explained) -> practical working -> real-world examples & applications -> recap.
- NO numericals (they come in a separate video later).
- NO photos/images: real-world examples are only MENTIONED in the narration (e.g. "an AA cell gives 1.5 V");
  the screen always shows an animation.
- NO background music (small scene-change sounds only). NO captions.
- The narration explains through the animation ("watch", "see", "notice").
- Released as a playlist: one video per part/topic, in order.
- Branding: corner badge "GETYR ECE"; the channel's own intro (brand/intro.mp4) and outro (brand/outro.mp4) on every course video.
- Flow: every new topic opens with a bridge from the previous one ("We have seen X. But ... That is Y.").
- Publishing: ECE channel, playlist "Network Theory", one chapter a day (course.yml in aptk752zx renders the next file in order.json).
- Visual quality (checked on still frames before a part is queued): arrows start/end exactly at box edges,
  arrow labels never sit on a line, every box and label fully on screen, formulas never wrap mid-formula,
  narration names/values match exactly what the animation shows, answers never appear before they are said.
- Reviewer AI fixes its own findings; if it cannot, the chapter is paused and the owner gets an email (GitHub issue).
- Complex topics (theorems, AC, phasors, transients, resonance, two-port, Laplace) - every part must have:
  1. WHY first: the problem the method solves, in plain words, before any formula.
  2. One idea per scene; every new word/symbol explained the moment it appears (j, phasor, s, e^-t/τ ...).
  3. A worked example shown step by step on the animation, every step with its number, no skipped algebra.
  4. "Common mistakes" scene: the silly errors students make (signs, deactivating sources wrongly,
     degrees vs radians, peak vs RMS, forgetting units) and how to avoid them.
  5. When to use it / when it does NOT work (limits, linear only, dependent sources stay ...).
  6. A check: verify the answer another way (another method, KCL/KVL, units).
  7. Real-world uses, then recap. Every number re-calculated before queuing.
