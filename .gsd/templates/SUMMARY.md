---
phase: {N}
plan: {M}
completed_at: [ISO timestamp]
duration_minutes: {N}
status: complete | partial | failed
---

# Summary: {Plan Name}

## Results
- Tasks: {N}/{M} completed
- Commits: {N}
- Verification: {passed | failed}

## Tasks Completed
| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | {task name} | {hash} | ✅ Complete |

## Verification
| Check | Status | Evidence |
|-------|--------|----------|
| {verification 1} | ✅ Pass | {command/output} |
