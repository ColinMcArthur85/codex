---
description: Post-feature cleanup — remove debug code, fix common style violations, and prepare files for commit
---

Run this workflow **after implementing a feature or fix, before committing**, to clean up common
issues that can accumulate during development.

## Steps

### 1. Identify Files to Clean

Get the list of modified files:

```bash
git diff --name-only
```

Limit attention to `.php` and `.js` files.

### 2. Check for Debug Code

Search for debug statements that must not be committed:

```bash
grep -rn "var_dump\|print_r\|die(\|echo '<!-- DEBUG\|console\.log" --include="*.php" --include="*.js" $(git diff --name-only)
```

Remove any `var_dump()`, `print_r()`, bare `die()` calls, and debug `console.log()` statements found.

### 3. Check for TODO / FIXME Comments

```bash
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.php" --include="*.js" $(git diff --name-only)
```

For each one found, determine if it should be:
- **Resolved now** (if the task is complete)
- **Kept with context** (if it's intentional future work — add a ticket number)
- **Removed** (if it's stale)

### 4. Check for `var` in JavaScript

```bash
grep -n "\bvar " --include="*.php" --include="*.js" $(git diff --name-only)
```

Replace any `var` declarations with `let` or `const` as appropriate:
- `const` if the binding is never reassigned
- `let` if it is reassigned

### 5. Check for Unprotected JS Comments in PHP Files

In `.php` files, JavaScript comments must be wrapped in PHP comment tags. Find violations:

```bash
grep -n "^\s*//" $(git diff --name-only | grep "\.php$")
```

Wrap any bare `//` or `/* */` JS comments inside `<?php /* ... */ ?>` blocks.

### 6. Check for Braceless Control Structures (PHP)

Search for common one-liner patterns:

```bash
grep -En "^\s*(if|foreach|for|while)\s*\(.*\)\s*$" $(git diff --name-only | grep "\.php$")
```

Add curly braces to any braceless control structures found.

### 7. Verify Button Classes

In modified view files (`.html.php`), check that buttons use standard classes:

```bash
grep -n "<button" $(git diff --name-only | grep "\.html\.php$")
```

Ensure buttons use: `button-green`, `button-leaf`, `button-red`, or `button-white button-light`.
Non-standard button classes should be replaced.

### 8. Final Confirmation

After addressing all findings, report back with:

```
## Cleanup Report

### ✅ Issues Resolved
- Removed 2 `var_dump()` calls in oilylife/controllers/example.php
- Replaced 1 `var` with `const` in oilylife/views/account/example.html.php

### ✅ No Issues Found
- oilylife/models/example.php — clean

### ℹ️ TODOs Kept (intentional)
- oilylife/helpers/example.php line 42: // TODO: Add support for WISH-450

Files are ready to commit.
```

Do not commit — leave that to the create-feature or create-fix workflow.
