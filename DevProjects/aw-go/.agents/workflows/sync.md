---
description: Start clean — sync codebase and staging server to latest master before starting a new feature or fix
---

Run this at the **start of any new work session** to ensure you're building on the latest code and
that staging reflects master.

## Steps

// turbo-all

1. **Pull the latest `oilylife` codebase from master:**
   ```bash
   cd /Users/colinmcarthur/DevProjects/aw-go/oilylife && git pull origin master --no-rebase --no-edit
   ```

2. **Pull the latest `getoiling` codebase from master:**
   ```bash
   cd /Users/colinmcarthur/DevProjects/aw-go/getoiling && git pull origin master
   ```

3. **Update the staging SSH server to match master:**
   ```bash
   ssh -A -p 522 colin@vm.web01.attractwell.com "cd public_html && git stash && git pull origin master --no-rebase --no-edit && git stash pop"
   ```

4. **Report the result** — confirm each step succeeded, and note the latest commit hash now on master.
   If any step fails, report the error and stop without proceeding. Do not attempt to start feature
   work if the sync fails.
