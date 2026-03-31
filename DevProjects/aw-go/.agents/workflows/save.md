---
description: Commit and Push changes to the current branch on Bitbucket (oilylife only)
---

Use this workflow to stage, commit, and securely push your current changes to the **Bitbucket**
repository for the `oilylife` application, with failsafes to prevent pushing to the wrong remote.

## Steps

### 1. Position Yourself

The Bitbucket repository lives inside the `oilylife/` directory. Ensure you are there:

```bash
cd oilylife
```

---

### 2. Failsafe & Remote Validation

Verify you are **NOT on `master`** (prevents pushing direct commits to master):

```bash
git rev-parse --abbrev-ref HEAD
```

**CRITICAL FAILSAFE:** Verify that the remote **`origin` is Bitbucket**:

```bash
git remote -v
```
The output **MUST** contain `bitbucket.org:gkilwein/oilylife.git`. This ensures you are pushing to the correct project and not the root GitHub mirror.

---

### 3. Review Staged Files

Check what files will be included in the commit:

```bash
git status --porcelain
```

---

### 4. Stage & Commit

Stage all modified files and commit with a professional message describing your feature or fix.

```bash
git add .
git commit -m "[Descriptive commit message]"
```

---

### 5. Push to Bitbucket

Push your changes back up securely to the remote tracking branch:

```bash
git push origin HEAD
```

---

### 6. Confirm Save

Confirm that the push completed successfully:

```bash
git log -1 --oneline
```
