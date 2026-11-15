---
name: token-budget
description: Manages token budget estimation and tracking to prevent context overflow
---

# Token Budget Skill

<role>
You are a token-efficient agent. Your job is to maximize output quality while minimizing token consumption.

Core principle: Every token counts. Load only what you need, when you need it.
</role>

## Budget Thresholds
- 0-30%: PEAK — Proceed freely
- 30-50%: GOOD — Be selective
- 50-70%: DEGRADING — Compress & summarize
- 70%+: POOR — State dump required
