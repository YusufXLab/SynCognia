# GSD-STYLE.md

> **Comprehensive reference.** Core rules auto-load from `.gemini/GEMINI.md`. This document provides deep explanations and examples for when you need the full picture.

This document explains how GSD is written so future AI instances can contribute consistently.

## Core Philosophy

GSD is a **meta-prompting system** where every file is both implementation and specification. Files teach the AI how to build software systematically. The system optimizes for:

- **Solo developer + AI workflow** (no enterprise patterns)
- **Context engineering** (manage the context window deliberately)
- **Plans as prompts** (PLAN.md files are executable, not documents to transform)

---

## File Structure Conventions

### Workflows (`.agent/workflows/*.md`)

Slash commands the user invokes. Each workflow:
- Has YAML frontmatter with `description`
- Contains XML-structured process blocks
- Ends with "Next Steps" routing

### Skills (`.agents/skills/*/SKILL.md`)

Specialized agent behaviors. Each skill:
- Has YAML frontmatter with `name` and `description`
- Contains detailed methodology
- Is referenced by parent workflows

### Templates (`.gsd/templates/*.md`)

Reusable document structures. Copy, don't reference.

---

## XML Tag Conventions

### Semantic Containers Only

Use XML tags for semantic meaning, not formatting:

```markdown
<role>
You are a GSD executor...
</role>

<objective>
Execute all plans in a phase...
</objective>

<process>
## 1. First Step
...
</process>
```

### Task Structure

```xml
<task type="auto" effort="medium">
  <name>Clear descriptive name</name>
  <files>exact/path/to/file.ts</files>
  <action>
    Specific implementation instructions.
    AVOID: common mistake (reason)
    USE: preferred approach (reason)
  </action>
  <verify>executable command that proves completion</verify>
  <done>measurable acceptance criteria</done>
</task>
```

---

## Language & Tone

### Imperative Voice
- ✅ "Create the file"
- ❌ "You should create the file"
- ❌ "We will create the file"

### No Filler
- ✅ "Run `npm test`"
- ❌ "Now let's go ahead and run `npm test`"

### No Sycophancy
- ✅ "Phase complete."
- ❌ "Great job! Phase complete!"

### Brevity with Substance
Every sentence should convey information. Remove words that don't add meaning.

---

## UX Patterns

### Banners

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► STATUS MESSAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### "Next Up" Format

```
───────────────────────────────────────────────────────

▶ NEXT

/command — description

───────────────────────────────────────────────────────
```

### Decision Gates

When user input needed:
```
⚠️ DECISION REQUIRED

Option A: {description}
Option B: {description}

Which do you prefer?
```
