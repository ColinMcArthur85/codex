---
description: Create and manage a new feature on a dedicated branch, following the spec-driven development workflow
---

This workflow guides the full implementation loop for a new feature: reading the spec, researching
existing patterns, implementing, auditing, and pushing for review.

## Steps

### 1. Setup on Master

- Checkout to `master`: `git checkout master`
- Pull the latest code: `git pull origin master`

### 2. Branch Creation

- If a branch name isn't provided, suggest one using the feature's WISH number or a short description
  (e.g., `feature/wish-450-meeting-reminders`)
- Create and switch to the branch: `git checkout -b <branch_name>`

### 3. Read the Spec

Before writing any code:

- Identify the relevant spec in `docs/features/`. Ask the user which `WISH-*` folder applies if
  not already known.
- Read the spec file(s) in full (typically `proposal.md` or the main SDD `.md` file).
- Summarize the acceptance criteria — what "done" looks like. Confirm with the user if unclear.

### 4. Research Existing Patterns

**Never write new code without first finding an existing reference.** For the feature area being
implemented:

- **Controller**: Find the most similar existing controller in `oilylife/controllers/`. Read it.
- **Model**: Find the most similar existing model in `oilylife/models/`. Read relevant methods.
- **View**: Find a similar view in `oilylife/views/`. Note patterns for forms, buttons, modals.
- **Helpers**: Search `oilylife/helpers/` for any utilities that might already handle part of this.
- **Reference files**: Check `.gemini/references/` for any domain-specific references that apply
  (e.g., `twilio-reference.md` for SMS features, `ai-gpt-reference.md` for AI features).

Document your reference points before writing code.

### 5. Read the Architecture & Rules

Load both of these if not already read:
- `.gemini/ARCHITECTURE.md` — controller/model/view patterns, DB layer, routing
- `.gemini/rules.md` — coding standards and submission checklist

### 6. Plan the Implementation

Before writing code, outline:
- Which files will be created or modified
- What DB changes (if any) are needed
- What the controller routing will look like
- Any third-party API calls involved

Present this plan to the user and confirm before proceeding.

### 7. Implement

Build the feature following the patterns found in Step 4, adhering to standards from Step 5:
- SQL only in model classes
- Prepared statements only
- Curly braces on all control structures
- `let`/`const` in JS (no `var`)
- JS comments in PHP files wrapped in `<?php /* */ ?>`
- Standard button classes
- Bootstrap modals

Commit logically as you go — don't save one giant commit for the end.

### 8. Run Cleanup

After implementation is complete, run the cleanup workflow (`.agents/workflows/cleanup.md`):
- Remove debug code
- Fix `var` usage in JS
- Resolve or annotate TODOs
- Check for braceless control structures

### 9. Run the Code Scanner

Run the code scanner (`.agents/workflows/code-scanner.md`) against all modified files:

```bash
git diff --name-only
```

Review the report and fix any violations before committing.

### 10. Verify the Submission Checklist

Confirm each item from `.gemini/rules.md`:

- [ ] All SQL is in model classes, not controllers
- [ ] All queries use prepared statements
- [ ] User inputs are validated and sanitized
- [ ] Curly braces used for all code blocks (PHP and JS)
- [ ] No `var` in JavaScript (use `let`/`const`)
- [ ] JS comments in PHP files are PHP-wrapped
- [ ] Buttons use standard classes (`button-green`, `button-leaf`, `button-red`, `button-white button-light`)
- [ ] Modals use Bootstrap
- [ ] Searched `oilylife/helpers/` for existing utilities before creating new ones
- [ ] Searched `oilylife/models/` for existing functionality before creating new code
- [ ] No credentials or secrets in committed code
- [ ] Compatible with PHP 7.2

### 11. Commit & Push

- Stage the modified files: `git add <files>`
- Commit with a descriptive message: `git commit -m "Feature: <description>"`
- Push to remote: `git push -u origin HEAD`
- Provide the Bitbucket Pull Request link:
  `https://bitbucket.org/gkilwein/<repo-name>/pull-requests/new?source=<branch-name>&t=1`

### 12. Cleanup

Switch back to `master` to keep the workspace clean:

```bash
git checkout master
```
