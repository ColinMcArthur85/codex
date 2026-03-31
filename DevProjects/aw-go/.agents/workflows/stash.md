---
description: Stash current work-in-progress so you can switch context cleanly
---

Use this when you need to set aside uncommitted changes without losing them — to switch branches,
pull updates, or hand off context temporarily.

## Steps

// turbo-all

1. **Check current status** to understand what will be stashed:
   ```bash
   cd /Users/colinmcarthur/DevProjects/aw-go/oilylife && git status
   ```

2. **Stash all changes** (including untracked files):
   ```bash
   git stash push --include-untracked -m "WIP: $(date '+%Y-%m-%d %H:%M') stash"
   ```
   The message is timestamped automatically so you can identify it later.

3. **Confirm the stash was created:**
   ```bash
   git stash list | head -5
   ```

4. **Report back** — show the stash name/index created and the list of files that were stashed.
   Remind the user they can restore with `git stash pop` or via `/unstash` when ready to resume.

---

> **To restore:** run `git stash pop` to apply the most recent stash, or `git stash apply stash@{N}`
> for a specific one. Check `git stash list` to see all saved stashes.
