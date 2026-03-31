# Gemini CLI Instructions

This file is the entry point for the Gemini CLI agent. It defines the project-specific mandates, coding standards, and workflows.

## Context Hierarchy

Read these files in order before starting any task:

1. **`.gemini/ARCHITECTURE.md`** — System architecture, request flow, directory structure, database patterns
2. **`.gemini/rules.md`** — Coding standards, conventions, evaluation checklist
3. **`.gemini/references/`** — Domain-specific reference files (load only what's relevant — see routing table in rules.md)

These files are the authoritative AI coding guidelines for this project.

## Quick Rules

- All file paths are relative to the repository root (`aw-go/`). The PHP application lives in `oilylife/`.
- Never commit directly to `master`.
- Never upload to staging without explicit permission.
- Always search for existing implementations before writing new code.
- Always use prepared statements for database queries.
- PHP 7.2 compatibility required.

## Spec-Driven Development

Feature work follows a spec-driven workflow:

1. **Specs live in `docs/features/`** — each feature has a `WISH-*` folder with requirements and design docs.
2. **Read the spec first** — before implementing any feature, read the corresponding spec in `docs/features/`.
3. **Reference existing patterns** — never assume how the code works. Find similar implementations and follow them.
4. **Branching**: Use `feature/` or `fix/` prefixes.
5. **Agent workflows** are defined in `.agents/workflows/` for branching, PR creation, code scanning, and cleanup.

## Workflows

### 1. Sync Everything (Start of Work)
When asked to sync or update everything:
- **Workflow**: `.agents/workflows/sync.md`
- Pulls both repos from master + updates the staging SSH server to match

### 2. Pull Codebase Only (No Staging)
When asked to pull or update the local codebase without touching staging:
- **Workflow**: `.agents/workflows/pull.md`
- Pulls both `oilylife` and `getoiling` from master

### 3. Stash Work in Progress
When asked to stash or set aside current changes:
- **Workflow**: `.agents/workflows/stash.md`
- Stashes all changes (including untracked) with a timestamped message

### 4. Upload Modified Files to Staging
When asked to stage or upload changes to the staging SSH server:
- **Workflow**: `.agents/workflows/stage.md`
- SCP uploads only the branch-modified `oilylife/` files to `vm.web01.attractwell.com`

### 5. Create a New Feature (Full Loop)
When starting a new feature, use the full spec-driven workflow:
- **Workflow**: `.agents/workflows/create-feature.md`
- Reads the spec → researches existing patterns → implements → runs cleanup → runs code scanner → commits

### 6. Create a New Fix (Full Loop)
When starting a bugfix:
- **Workflow**: `.agents/workflows/create-fix.md`
- Understands the bug → researches root cause → fixes → runs cleanup → runs code scanner → commits

### 7. Post-Feature/Fix Cleanup
After implementing, before committing:
- **Workflow**: `.agents/workflows/cleanup.md`
- Removes debug code, fixes `var` usage, resolves TODOs, checks braceless structures

### 8. Code Scanner / Rules Audit
To audit changed files against coding standards:
- **Workflow**: `.agents/workflows/code-scanner.md`
- Read-only. Reports SQL-in-controllers, missing prepared statements, PHP 7.2 issues, and JS violations

### 9. Submission Workflows (End of Task)
When asked to submit a fix or feature outside of the create-fix/create-feature workflows:
1. **Branching**: If on `master`, create a new `fix/` or `feature/` branch first.
2. **Commit & Push**: Stage changes, commit with a professional message, push to remote.
3. **PR Link**: `https://bitbucket.org/gkilwein/<repo-name>/pull-requests/new?source=<branch-name>&t=1`

### 10. Updating an Existing PR
When asked to update a PR:
1. **Safety Check**: Ensure NOT on `master`. If on master, stop and warn.
2. **Commit & Push**: Commit changes, push to `git push origin HEAD`.

## Coding Standards

Rigorously follow the standards in `.gemini/rules.md`, including:
- Mandatory curly braces for PHP and JS.
- No `var` in JavaScript (use `let`/`const`).
- SQL must live in model classes.
- Prepared statements for all queries.
- PHP 7.2 compatibility.
- Bootstrap modals.
- Standard button classes (`button-green`, `button-leaf`, etc.).

## Roadmap

See `docs/WISHLIST_ROADMAP.md` for the feature roadmap and prioritization.
