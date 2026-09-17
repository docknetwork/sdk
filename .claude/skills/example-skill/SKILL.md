---
name: example-skill
description: "TEMPLATE — copy this directory, rename it, and write a real trigger here before use. Left disabled so it never fires as-is."
disable-model-invocation: true
---

# example-skill

Boilerplate for a repo-specific Claude Code skill. Copy this directory to
`.claude/skills/<your-skill-name>/`, then:

1. Rename `name` above to match the directory.
2. Replace `description` with the real trigger: the situations that should make
   an agent reach for this skill, phrased as explicit branches ("use when the
   user says X" / "use after Y fails"), not a vague "use for X".
3. Remove `disable-model-invocation: true` once the skill should fire on its
   own — keep it only for a skill meant to be invoked by name alone.
4. Replace this body with real steps, gotchas, and the expected output shape.
   Ground it in this repo: concrete file paths, real commands, the non-obvious
   traps specific to this codebase — not generic advice.
