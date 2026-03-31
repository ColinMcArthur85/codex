# Development Rules & Standards

> **Note**: All file paths in this document are relative to the repository root (`aw-go/`). The PHP application lives in the `oilylife/` directory.

---

## 0. Agent Behavior

### No Assumptions — Always Reference Existing Code
**NEVER assume anything about how the code works.** Do not invent CSS variables, class names, function patterns, or conventions that don't already exist in the codebase.

Before writing any new code:
1. **Search the codebase** for similar implementations or patterns
2. **Find a point of reference** — an existing file that does something similar
3. **Copy that pattern** exactly, adapting only what's necessary

If something truly "new" needs to be created and you can't find an existing pattern to reference, **ask clarifying questions** before proceeding. Do not guess or make up conventions.

### Staging Uploads
**NEVER upload to staging without explicit permission from the user.**

Do NOT run `scp` commands to the staging server proactively. Always ask first or wait for the user to say "upload to staging" before executing any upload commands.

The staging server is: `vm.web01.attractwell.com` (port 522, user `colin`, remote path `public_html/`)

Upload command (only when explicitly requested):
```bash
scp -P 522 oilylife/<file-path> colin@vm.web01.attractwell.com:public_html/<remote-path>
```

### Token & Context Efficiency
To conserve daily usage limits and keep the conversation focused:
1. **Batch Tool Calls:** Group related commands (like multiple git commands or file reads) into a single turn to minimize reporting overhead.
2. **Minimize Verbosity:** Avoid narrating every single minor step. Only report significant progress, blockers, or when a task is completed.
3. **Reset for New Tasks:** When an objective is finished and a new, unrelated task begins, proactively recommend starting a new conversation to clear the context window.
4. **Assume High-Level Objectives:** When given a clear goal (e.g., "Merge master into all branches"), execute the necessary intermediate steps (checking status, switching branches, resolves) without asking for permission for each sub-step.

### Work Environment & Shipping Workflows

#### 1. Sync Everything (Start of Work)
When the user uses the flag `--update-all` (or says "/update-all" or "pull origin master"):
1. `cd oilylife && git pull origin master --no-rebase --no-edit`
2. `cd getoiling && git pull origin master`
3. `ssh -A -p 522 colin@vm.web01.attractwell.com "cd public_html && git stash && git pull origin master --no-rebase --no-edit && git stash pop"`

#### 2. Submission Workflows (End of Task)
When the user uses the flags `--submit-fix` or `--submit-feature`:
1. **Branching**:
   - If currently on `master`: Create and switch to a new branch (`fix/` or `feature/` + descriptive name).
   - If ALREADY on a `fix/` or `feature/` branch: Stay on the current branch.
2. **Commit & Push**:
   - Stage all changes and commit with a professional message.
   - Push to remote: `git push -u origin HEAD`.
3. **PR Link**:
   - Provide the Bitbucket 'Create Pull Request' link: `https://bitbucket.org/gkilwein/<repo-name>/pull-requests/new?source=<branch-name>&t=1`.

#### 3. Updating an Existing PR (Incremental Changes)
When the user uses the flag `--update-pr`:
1. **Safety Check**: Ensure NOT on `master`. If on `master`, warn the user and stop. **DO NOT EVER PUSH TO MASTER!!**
2. **Commit & Push**:
   - Commit all changes (e.g., "Update: [brief summary]").
   - Push to origin: `git push origin HEAD`.

---

## 1. Git Workflow

- **Never** commit directly to `master`
- Create feature branches: `feature/short-description` if its a feature, `fix/short-description` if its a fix.
- **Never** use the browser extension to create branches and commits or test at all. I will manually use the browser.
- One logical change per commit
- Write clear commit messages describing *why*, not just *what*

## 2. Code Changes Policy

- Read the existing code before modifying it
- Understand the current patterns before introducing new ones
- Search for existing implementations before writing new code
- Keep changes minimal and focused — don't refactor adjacent code

## 3. Documentation Standards

- Update relevant documentation when changing functionality
- Use inline comments only where the logic isn't self-evident
- Document new features with context about business purpose

---

## 4. Security & Best Practices

- Always use **prepared statements** for database queries (never concatenate user input into SQL)
- Always **validate and sanitize** user inputs using appropriate functions before processing or storing
- Never expose internal file paths, database names, or credentials in client-facing output
- Never bypass subaccount permission checks
- Security headers are set in `oilylife/index.php` — do not remove or weaken them
- Sensitive directories are blocked in `oilylife/.htaccess` — do not create new publicly accessible directories

---

## 5. Deployment & Testing

- Deployment uses SFTP-based scripts (`oilylife/deploy.php`, `oilylife/attractwell-deploy.php`, shell scripts)
- Test on staging before production: `staging.getoiling.com`, `staging.attractwell.com`
- Rollbar is used for error reporting (`oilylife/thirdparty/rollbar/`)
- Deployment configs are in YAML files in the `oilylife/` directory

---

## 6. PHP Code Patterns

### Curly Braces — ALWAYS Required
```php
// CORRECT — always use curly braces, even for single-line blocks
if ($condition) {
    doSomething();
}

foreach ($items as $item) {
    process($item);
}

while ($row = $result->fetch()) {
    handleRow($row);
}
```

```php
// WRONG — never use braceless blocks
if ($condition)
    doSomething();

// WRONG — never use PHP alternative syntax
if ($condition):
    doSomething();
endif;

foreach ($items as $item):
    process($item);
endforeach;
```

### SQL Must Live in Models
```php
// CORRECT — SQL in the model class
class WidgetClass
{
    public function GetWidget($id)
    {
        $retval = DbClass::Factory()->DbExecute([
            "sql" => "SELECT * FROM widgets WHERE id = ?",
            "params" => DbClass::Factory()->DbParams($id)
        ]);
        if ($retval->success) {
            return GetModelSuccess($retval->results);
        }
        return GetModelError($retval->code, $retval->message);
    }
}

// WRONG — SQL in a controller
$retval = DbClass::Factory()->DbExecute([
    "sql" => "SELECT * FROM widgets WHERE id = ?",
    "params" => DbClass::Factory()->DbParams($id)
]);
```

### Database Access
- Always use `DbClass::Factory()->DbExecute()` with prepared statements
- Use `DbClass::Factory()->DbParams()` to create parameter arrays (pass by reference)
- Pagination via `$Oil->PaginateSet()` (defined in `oilylife/models/oil.php` on `OilClass`)
- Return `GetModelSuccess($results)` / `GetModelError($code, $message)` from model methods
- Use `SuccessOnOnlyOneRow($result)` when expecting exactly one row
- **Multi-database**: Specify `"db" => "analytics"` (or `cron_tracking`, `service_request`, `zoom_license`, `universal_login`, `domain_tracker`) in `DbExecute()` for non-default databases
- **Never create new database connections** — the singleton handles connection pooling and HA failover

### Buttons
```html
<!-- Primary action -->
<button class="button button-green">Save</button>

<!-- Secondary action -->
<button class="button button-leaf">Preview</button>

<!-- Danger action -->
<button class="button button-red">Delete</button>

<!-- Neutral/other action -->
<button class="button button-white button-light">Cancel</button>

<!-- Size modifiers (add to any button) -->
<button class="button button-green button-mini">Tiny</button>
<button class="button button-green button-small">Small</button>
<button class="button button-green button-large">Large</button>
<button class="button button-green button-xlarge">Extra Large</button>
```

### Modals
- Always use **Bootstrap modals** for modal interactions
- See `oilylife/helpers/contact-email-helper.php` (`SendMailModal`) for the canonical example

---

## 7. JavaScript Standards

### Curly Braces — ALWAYS Required
```javascript
// CORRECT
if (condition) {
    doSomething();
}

// WRONG
if (condition)
    doSomething();
```

### Variable Declarations
```javascript
// CORRECT — use let and const
let counter = 0;
const MAX_ITEMS = 100;

// WRONG — never use var
var counter = 0;
```

### jQuery Ready Handler
```javascript
// CORRECT
$(function() {
    // initialization code
});

// WRONG
jQuery(document).ready(function($) {
    // initialization code
});
```

### JavaScript Comments in PHP Files
JavaScript comments in PHP files **must be wrapped in PHP comments** so end users can't see them in the browser console:

```php
<?php /* JS comment explaining this code */ ?>
<script>
    $(function() {
        <?php /* Initialize the widget with account settings */ ?>
        let widget = new Widget(<?= json_encode($settings) ?>);
    });
</script>
```

---

## 8. Admin Tools

- Admin-only features are gated by `oilylife/lib/require-admin.php`
- Admin configuration is in `oilylife/config/` directory files
- Admin views follow the same MVC pattern as customer-facing features

---

## 9. Studio Development Log

When making significant changes, document:
- What was changed and why
- Any new dependencies added
- Impact on existing features
- Rollback plan if needed

---

## 10. Reuse Mandate

**Before writing new code, always search for existing implementations.** This codebase has extensive existing functionality.

See **`.claude/references/core-libraries.md`** for the full inventory of core libraries, third-party dependencies, and helpers — consult it before writing any new code.

---

## Before Submitting Any Change
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
