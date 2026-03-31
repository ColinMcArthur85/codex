# AI Agent Workflow Reference

## Agent Compatibility

These workflows live in `.agents/workflows/` and are referenced from both `GEMINI.md` and `CLAUDE.md`.
Here is how each AI tool interacts with them:

| Tool | Reads Context | Slash Commands | `// turbo` Auto-run |
|---|---|---|---|
| **Antigravity** (IDE) | `GEMINI.md` → `.agents/workflows/` | ✅ `/command` works natively | ✅ Supported |
| **Claude Code** (CLI) | `CLAUDE.md` → `.agents/workflows/` | ⚠️ Say "follow the create-feature workflow" | ❌ Not supported |
| **Gemini CLI** | `GEMINI.md` → `.agents/workflows/` | ⚠️ Say "follow the sync workflow" | ❌ Not supported |

**Bottom line:**
- The workflow *content* (the actual steps and commands) works in all three tools.
- Native `/slash-command` triggering and `// turbo-all` auto-running only work in **Antigravity**.
- In Claude Code or Gemini CLI, trigger workflows by name: *"run the cleanup workflow"* or *"follow create-fix"*.

---

## All Commands at a Glance

| Command | File | One-line Summary |
|---|---|---|
| `/sync` | `sync.md` | Pull master + update SSH staging. Use at the start of every session. |
| `/pull` | `pull.md` | Pull master locally only. No staging touch. |
| `/stash` | `stash.md` | Stash WIP with a timestamp. Use when switching context mid-task. |
| `/stage` | `stage.md` | SFTP only branch-modified files to staging. No IDE save-dancing. |
| `/create-feature` | `create-feature.md` | Full feature loop: spec → research → build → audit → commit. |
| `/create-fix` | `create-fix.md` | Full fix loop: understand bug → research → fix → audit → commit. |
| `/cleanup` | `cleanup.md` | Post-implementation sweep: debug code, var, TODOs, braceless PHP. |
| `/code-scanner` | `code-scanner.md` | Read-only audit of changed files against `rules.md`. |

---

## Command Details

---

### `/sync` — Start Clean
**File:** `.agents/workflows/sync.md`

**What it does:**
1. `git pull origin master` on `oilylife`
2. `git pull origin master` on `getoiling`
3. SSH into `vm.web01.attractwell.com` to git stash + pull + pop

**When to use:** At the **start of every new work session** before touching any code.
Run this before `/create-feature` or `/create-fix` to ensure you're building on the latest master.

**Do NOT use when:** You're mid-way through a feature branch. This targets master.

---

### `/pull` — Pull Codebase Only
**File:** `.agents/workflows/pull.md`

**What it does:**
1. `git pull origin master` on `oilylife`
2. `git pull origin master` on `getoiling`

**When to use:**
- You need to check or merge in a teammate's latest changes
- You want a fresh local copy but staging is already up to date
- You're in a clean session and don't need to touch the SSH server

---

### `/stash` — Stash WIP
**File:** `.agents/workflows/stash.md`

**What it does:**
- `git stash push --include-untracked -m "WIP: YYYY-MM-DD HH:MM stash"`
- Reports the stash index and list of stashed files

**When to use:**
- You need to pull in updates from master but have uncommitted changes
- You need to switch branches without losing your work
- You're setting aside a half-finished feature to handle something urgent

**To restore:** Run `git stash pop` or tell the agent *"apply my last stash"*.

---

### `/stage` — Upload Modified Files to Staging
**File:** `.agents/workflows/stage.md`

**What it does:**
1. Safety-checks that you're NOT on master
2. Compares your branch to `origin/master` to find all modified `oilylife/` files
3. Shows you the list of files and asks for confirmation
4. SCPs each file to `vm.web01.attractwell.com:public_html/`

**When to use:**
- You're on a feature/fix branch and want to test changes on staging
- An AI agent has modified several files and you don't want to open each one in the IDE to trigger autosave/upload
- After a `/create-feature` or `/create-fix` is done but before opening a PR

**Do NOT use when:** You're on `master` (the workflow will stop you).

> Files outside `oilylife/` (docs, workflows, gemini config, etc.) are excluded automatically.

---

### `/create-feature` — Full Feature Implementation Loop
**File:** `.agents/workflows/create-feature.md`

**What it does (12 steps):**
1. Checkout master + pull
2. Create `feature/` branch
3. Read the spec from `docs/features/WISH-*`
4. Research existing patterns (controller, model, view, helpers)
5. Load architecture + rules context
6. Plan implementation and confirm with you
7. Implement the feature
8. Run `/cleanup`
9. Run `/code-scanner`
10. Verify the submission checklist
11. Commit + push + provide PR link
12. Return to master

**When to use:** Any time you're starting a **new WISH ticket** or planned feature.
This is the canonical path — don't skip the spec reading or pattern research steps.

---

### `/create-fix` — Full Bugfix Implementation Loop
**File:** `.agents/workflows/create-fix.md`

**What it does (11 steps):**
1. Checkout master + pull
2. Create `fix/` branch
3. Understand the bug (what's wrong, where, expected behavior)
4. Research the affected controller, model, view
5. Load architecture + rules context
6. Implement the minimal fix
7. Run `/cleanup`
8. Run `/code-scanner`
9. Verify the submission checklist
10. Commit + push + provide PR link
11. Return to master

**When to use:** Any time you have a confirmed bug to fix. The key difference from `/create-feature`
is step 3 — you investigate the root cause before touching anything, and you keep the change minimal.

---

### `/cleanup` — Post-Implementation Sweep
**File:** `.agents/workflows/cleanup.md`

**What it does:**
- Removes `var_dump()`, `print_r()`, `die()`, and `console.log` debug calls
- Resolves or annotates `TODO` / `FIXME` comments
- Replaces `var` with `let`/`const` in JavaScript
- Wraps bare JS comments in `<?php /* */ ?>` tags (in PHP files)
- Checks for braceless PHP control structures
- Verifies button classes in view files

**When to use:**
- After implementing a feature or fix, **before committing** (step 8 in `/create-feature`, step 7 in `/create-fix`)
- After a heavy AI-assisted coding session
- Before uploading to staging via `/stage`

---

### `/code-scanner` — Rules Compliance Audit
**File:** `.agents/workflows/code-scanner.md`

**What it does:**
- Reads all modified PHP/JS files
- Checks against every rule in `.gemini/rules.md`
- Reports violations in tiers: CRITICAL → HIGH → MEDIUM → LOW
- Does **not** modify any files

**Severity levels:**
| Level | Examples |
|---|---|
| CRITICAL | SQL in controllers, raw queries without prepared statements, exposed credentials |
| HIGH | Braceless control structures, PHP 7.2 incompatibilities, debug code left in |
| MEDIUM | `var` in JS, missing PHP comment wrappers, non-standard button classes |
| LOW | Style/consistency issues |

**When to use:**
- After `/cleanup`, before committing (step 9 in both create workflows)
- Before opening a PR as a final sanity check
- When reviewing a teammate's PR to get an objective read
- Before touching a legacy file to understand what issues already exist in it

---

## Recommended Workflow by Scenario

### Starting a new feature
```
/sync → /create-feature
```

### Starting a bugfix
```
/sync → /create-fix
```

### Need to set aside work and handle something urgent
```
/stash → [handle the urgent thing] → git stash pop when ready
```

### Refresh local code without touching staging
```
/pull
```

### Test current branch changes on staging
```
/cleanup → /code-scanner → /stage
```

### Quick quality check before a PR
```
/code-scanner
```
