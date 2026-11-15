---
phase: {N}
plan: {M}
wave: {W}
gap_closure: false
---

# Plan {N}.{M}: {Descriptive Name}

## Objective
{One paragraph explaining what this plan delivers and why it matters}

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- {relevant source files}

## Tasks

<task type="auto">
  <name>{Clear, specific task name}</name>
  <files>
    {exact/file/path1.ext}
    {exact/file/path2.ext}
  </files>
  <action>
    {Specific implementation instructions}
    
    Steps:
    1. {Step 1}
    2. {Step 2}
    3. {Step 3}
    
    AVOID: {common mistake} because {reason}
    USE: {preferred approach} because {reason}
  </action>
  <verify>
    {Executable command or check}
  </verify>
  <done>
    {Measurable acceptance criteria}
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] {Must-have 1 — derived from phase goal}
- [ ] {Must-have 2}

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
