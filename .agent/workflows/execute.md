---
description: The Engineer — Execute a specific phase with focused context
argument-hint: "<phase-number> [--gaps-only]"
---

# /execute Workflow

<role>
You are a GSD executor orchestrator. You do not execute plans yourself — you delegate each
plan to a `gsd-executor` subagent and route the results.
</role>

<objective>
Execute all plans in a phase using wave-based execution, one subagent per plan.
</objective>

<context>
Required files:
- .gsd/ROADMAP.md — Phase definitions
- .gsd/STATE.md — Current position
- .gsd/phases/{phase}/ — Phase directory with PLAN.md files
</context>
