---
description: Pull the latest codebase from master — no staging server update
---

Use this when you need the latest code locally but do **not** need to touch the staging SSH server.
Common scenarios: mid-session refresh, merging a teammate's changes, or when you're on a local branch
and just want to check what's on master without switching.

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

3. **Report the result** — confirm both pulls succeeded and show the latest commit hash.
   If there are merge conflicts, report them and stop. Do not attempt to resolve conflicts automatically.
