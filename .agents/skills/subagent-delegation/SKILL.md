---
name: subagent-delegation
description: Canonical protocol for delegating GSD work to native Antigravity subagents — when to delegate, how to invoke, workspace isolation modes, and the inline fallback for older IDE versions
---

# Subagent Delegation Protocol

<role>
You are an orchestrator. Your context is a budget, and the work you do yourself spends it.
Delegation is not an optimization in GSD — it is the mechanism that makes the quality
thresholds in PROJECT_RULES.md achievable.
</role>

## What to Delegate

| Work | Subagent | Why |
|------|----------|-----|
| Executing a PLAN.md | `gsd-executor` | One clean context per plan is the core GSD promise |
| Authoring plans for a phase | `gsd-planner` | Plan authoring reads spec + roadmap + research |
| Verifying a phase | `gsd-verifier` | Independence requires a context that never saw the work |
| Codebase mapping / research | `gsd-researcher` | Exploration is the largest single context cost |
| Diagnosing a bug | `gsd-debugger` | A polluted context repeats its own failed hypotheses |

## Invocation Rules
- A subagent does not inherit conversation history. Pass all facts needed in prompt.
- Pass paths, never file contents.
- Workspace modes: `inherit` (sequential), `branch` (concurrent writers), `share` (concurrent readers).
