---
description: Create and manage a bugfix or patch on a dedicated branch, following the spec-driven development workflow
---

This workflow guides the full implementation loop for a bugfix: understanding the problem, researching
existing patterns, implementing, auditing, and pushing for review.

## Steps

### 1. Setup on Master

- Checkout to `master`: `git checkout master`
- Pull the latest code: `git pull origin master`

### 2. Branch Creation

- If a branch name isn't provided, suggest one using a short description of the bug being fixed
  (e.g., `fix/zoom-meeting-null-start-time`)
- Create and switch to the branch: `git checkout -b fix/<branch_name>`

### 3. Understand the Bug

Before writing any code:

- Ask the user to describe the bug clearly if not already explained: what behavior is wrong, where it
  occurs (URL, page, action), and what the expected behavior is.
- Identify the affected files: which controller, model, and/or view is likely involved?
- Reproduce the issue mentally by tracing the request flow in `.gemini/ARCHITECTURE.md` if needed.

### 4. Research Existing Patterns

**Find the root, don't patch the symptom.** For the area being fixed:

- Read the relevant controller in `oilylife/controllers/`
- Read the relevant model method(s) in `oilylife/models/`
- Check `oilylife/helpers/` for any utility involved
- Check the relevant view in `oilylife/views/`

Understand fully what the code is doing before changing anything.

### 5. Read the Architecture & Rules

Load both of these if not already read:
- `.gemini/ARCHITECTURE.md` — request flow, DB layer, routing patterns
- `.gemini/rules.md` — coding standards and submission checklist

### 6. Implement the Fix

Make the minimal change necessary to fix the bug. Follow the standards in Step 5:
- SQL only in model classes
- Prepared statements only
- Curly braces on all control structures
- `let`/`const` in JS (no `var`)
- JS comments in PHP files wrapped in `<?php /* */ ?>`

**Do not refactor adjacent code** while fixing — keep the change focused and reviewable.

### 7. Run Cleanup

After the fix is in place, run the cleanup workflow (`.agents/workflows/cleanup.md`):
- Remove any debug code or test `var_dump` calls used during investigation
- Fix `var` usage in JS if any was introduced
- Resolve or annotate any TODOs left behind

### 8. Run the Code Scanner

Run the code scanner (`.agents/workflows/code-scanner.md`) against all modified files:

```bash
git diff --name-only
```

Review the report and fix any violations before committing.

### 9. Verify the Submission Checklist

Confirm each item from `.gemini/rules.md`:

- [ ] All SQL is in model classes, not controllers
- [ ] All queries use prepared statements
- [ ] User inputs are validated and sanitized
- [ ] Curly braces used for all code blocks (PHP and JS)
- [ ] No `var` in JavaScript (use `let`/`const`)
- [ ] JS comments in PHP files are PHP-wrapped
- [ ] Buttons use standard classes (`button-green`, `button-leaf`, `button-red`, `button-white button-light`)
- [ ] Modals use Bootstrap
- [ ] No credentials or secrets in committed code
- [ ] Compatible with PHP 7.2

### 10. Commit & Push

- Stage the modified files: `git add <files>`
- Commit with a descriptive message: `git commit -m "Fix: <what was wrong and what changed>"`
- Push to remote: `git push -u origin HEAD`
- Provide the Bitbucket Pull Request link:
  `https://bitbucket.org/gkilwein/<repo-name>/pull-requests/new?source=<branch-name>&t=1`

### 11. Cleanup

Switch back to `master` to keep the workspace clean:

```bash
git checkout master
```
