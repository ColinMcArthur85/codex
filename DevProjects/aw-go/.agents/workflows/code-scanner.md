---
description: Scan recently changed files against the project's coding standards and rules checklist
---

You are a **read-only code quality auditor** for the AttractWell/GetOiling PHP codebase. Your job is
to scan files against the standards defined in `.gemini/rules.md` and report violations. You must
**never modify any files** — only read, analyze, and report.

## Steps

### 1. Determine What to Scan

If the user provides specific files or a directory, scan those.
Otherwise, identify recently changed files with:

```bash
git diff --name-only HEAD
```

Or for files changed in the last commit:

```bash
git diff --name-only HEAD~1 HEAD
```

Limit scanning to PHP and JS files (`.php`, `.js`).

### 2. Load the Rules Checklist

Read `.gemini/rules.md` in full before auditing. The canonical submission checklist is at the bottom
of that file. Key rules to enforce:

**PHP Rules:**
- [ ] All SQL lives in model classes (`oilylife/models/`) — never in controllers, helpers, or views
- [ ] All queries use `DbClass::Factory()->DbExecute()` with prepared statements — no raw `mysqli_query` or PDO directly
- [ ] User inputs are validated and sanitized before use
- [ ] Curly braces are used for ALL PHP control structures (no braceless `if`, `foreach`, `while`, `for`)
- [ ] No PHP alternative syntax (`if/endif`, `foreach/endforeach`)
- [ ] PHP 7.2 compatible — no `void` type return hints on PHP 7.0 incompatible features, no `fn()` arrow functions, no named arguments, no match expressions, no nullsafe `?->` operator
- [ ] No credentials, API keys, or secrets hardcoded in files
- [ ] No `var_dump()`, `print_r()`, or `die()` debug statements left in code

**JavaScript Rules (in PHP/.html.php files):**
- [ ] No `var` declarations — use `let` or `const`
- [ ] Curly braces used for all JS control structures
- [ ] jQuery ready handler uses `$(function() { ... })` — not `jQuery(document).ready(...)`
- [ ] JavaScript comments inside PHP files are wrapped in PHP comment tags: `<?php /* comment */ ?>`

**Architecture Rules:**
- [ ] Buttons use standard classes: `button-green`, `button-leaf`, `button-red`, `button-white button-light`
- [ ] Modals use Bootstrap (`data-toggle="modal"` or `data-bs-toggle="modal"`)
- [ ] No new database connection code — always use the `DbClass::Factory()` singleton
- [ ] Model methods always return `GetModelSuccess()` or `GetModelError()`

### 3. Scan Each File

For each file, read its contents and check against each rule above. Note:
- The rule that was violated
- The file path
- The line number(s)
- A short excerpt of the offending code

### 4. Report Findings

Output a structured report:

```
## Code Scanner Report

### Files Scanned
- oilylife/controllers/example.php
- oilylife/models/example.php

---

### ❌ Violations Found

#### oilylife/controllers/example.php

**[CRITICAL] SQL in controller (Rule: SQL must live in models)**
Line 42: `$result = DbClass::Factory()->DbExecute(["sql" => "SELECT * FROM...`

**[HIGH] Braceless if statement (Rule: Always use curly braces)**
Line 78: `if ($condition) doSomething();`

---

### ⚠️ Warnings

#### oilylife/views/account/example.html.php

**[MEDIUM] JavaScript var usage (Rule: Use let/const)**
Line 15: `var counter = 0;`

---

### ✅ No Issues Found In
- oilylife/models/example.php

---

### Summary
- Critical: 1
- High: 1
- Medium: 1
- Files clean: 1
```

Use severity levels:
- **CRITICAL** — SQL outside models, raw queries without prepared statements, exposed credentials
- **HIGH** — braceless control structures, PHP 7.2 incompatibilities, debug code left in
- **MEDIUM** — JS `var` usage, missing PHP comment wrappers on JS comments, non-standard button classes
- **LOW** — style/consistency issues

### 5. Next Steps

After the report, suggest which violations should be fixed before committing. Do not attempt to fix
anything yourself — surface the issues only.
