---
description: Upload only the files modified in the current branch to the staging SSH server via SCP
---

Use this when you're on a **feature or fix branch** and want to push your current changes to staging
for testing — without waiting for a full PR merge. It uploads only the files you've changed, not the
entire codebase.

This solves the "open each file in the IDE and save" problem by automatically discovering and
uploading all branch-modified files in one command.

## Steps

1. **Safety check** — confirm you are NOT on `master`. If on master, warn and stop.
   ```bash
   git branch --show-current
   ```

2. **Identify all files modified in this branch** relative to master:
   ```bash
   git diff --name-only origin/master...HEAD
   ```
   Also include any currently staged or unstaged changes not yet committed:
   ```bash
   git diff --name-only
   git diff --name-only --cached
   ```
   Combine and deduplicate the full list of modified files.

3. **Filter to only `oilylife/` files** — only PHP application files need to be uploaded to staging.
   Exclude non-application files (e.g., `.agents/`, `.gemini/`, `.claude/`, `docs/`, `getoiling/`,
   `framework/`).

4. **Show the upload list** — present the list of files that will be uploaded and confirm with the
   user before proceeding. Example:
   ```
   Files to upload to staging:
   - oilylife/controllers/conferencing.php
   - oilylife/models/video-conferencing.php
   - oilylife/views/account/video-conferencing-settings.html.php

   Upload these 3 files to staging? (yes/no)
   ```

5. **Upload each file via SCP** — for each file in the list:
   ```bash
   scp -P 522 <local-file-path> colin@vm.web01.attractwell.com:public_html/<relative-path>
   ```
   The remote path mirrors the `oilylife/` path exactly under `public_html/`.

   **Example:** `oilylife/controllers/conferencing.php` uploads to
   `colin@vm.web01.attractwell.com:public_html/controllers/conferencing.php`

6. **Report the result** — confirm which files were successfully uploaded and flag any failures.
