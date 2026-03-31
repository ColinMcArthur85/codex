# Zoom Polls — Update Summary

**Date:** March 2026
**Branch:** `feature/blog-pinned-drag-drop`
**Prepared for:** Greg

---

## Overview

This document summarizes all changes made to the Zoom Polls feature during this update cycle. The goal was to fix a broken poll creation flow, resolve a Rollbar error, and extend meeting type support so that recurring meetings with a fixed schedule can use polls.

---

## Bug Fixes

### 1. Polls Appeared to Save but Never Showed Up

**Root cause:** `sendRequest()` in `models/video-conferencing.php` always returned a success response regardless of the HTTP status code returned by Zoom. Zoom was returning 4xx errors (e.g., polls disabled, wrong meeting type) but the app treated them as success.

**Fix:** Added HTTP status code checking inside `sendRequest()`. Responses with 4xx or 5xx status codes now return `GetModelError()` with the Zoom error message. Server-side errors (5xx) are also logged to Rollbar; client-side errors (4xx) are not, to prevent noise.

**Files changed:** `oilylife/models/video-conferencing.php`

---

### 2. Rollbar Error — `report:read:admin` Scope Missing on Poll Results

**Root cause:** The poll results endpoint was using `GET /report/meetings/{id}/polls`, which requires the `report:read:admin` scope — a scope not granted to our Zoom Server-to-Server OAuth app.

**Fix:** Switched to `GET /past_meetings/{id}/polls`, which only requires `meeting:read:admin` (already granted). The response format is different (per-respondent rather than per-question), so the front-end JS was also rewritten to group answers by question text.

**Files changed:**
- `oilylife/models/video-conferencing.php` — updated `getMeetingPollResults()` method
- `oilylife/views/account/video-conferencing-meetings-view.html.php` — rewrote `loadPollResults()` JS

---

### 3. "Meeting Polls Disabled" Error on Certain Meetings

**Root cause:** Polls only work on Zoom meeting type 2 (scheduled/one-time) and type 8 (recurring with fixed schedule). The Polls section was being shown for all meeting types, including type 3 (recurring with no fixed schedule), which does not support polls at the Zoom API level.

**Fix:** Added a PHP check `$meeting_supports_polls` that evaluates to `true` only for type 2 and type 8 meetings. The Polls and Poll Results sections are hidden entirely for unsupported meeting types.

**Files changed:** `oilylife/views/account/video-conferencing-meetings-view.html.php`

---

### 4. Misleading "Meeting Polls Disabled" UI Message Removed

The meeting detail view was showing a banner that said polls were disabled, with a link to Zoom Settings. This was a leftover check that was no longer accurate — polls are globally enabled on our Zoom account and locked on. The message was removed.

**Files changed:** `oilylife/views/account/video-conferencing-meetings-view.html.php`

---

## New Features

### 5. Recurring Meeting with Fixed Schedule (Type 8)

**Context:** Previously, selecting "Recurring" on the meeting create/edit form set the meeting as Zoom type 3 (recurring, no fixed schedule). This meeting type does not support polls, has no start time, and cannot be included in calendar invites.

Type 8 (recurring with fixed schedule) supports polls, has a defined start time, and includes recurrence pattern configuration. This was not previously exposed in the UI.

**Changes:**

#### Meeting Create/Edit Form (`video-conferencing-meetings-create.html.php`)
- Added "Fixed schedule" sub-option under the "Recurring" radio button (alongside the existing "No fixed schedule" option).
- When "Fixed schedule" is selected, the date/time picker and timezone selector remain visible (same as a one-time meeting).
- A new **Recurrence Pattern** section appears with:
  - **Repeats:** Weekly / Daily / Monthly
  - **Every:** numeric interval (e.g., every 2 weeks)
  - **On these days:** day-of-week checkboxes (shown for Weekly)
  - **Ends:** after N occurrences, or on a specific date (date picker)
- All recurrence fields are pre-populated when editing an existing type 8 meeting.

#### Controller (`oilylife/controllers/conferencing.php`)
- Determines meeting type based on `meeting_type` + `recurring_schedule_type` POST fields:
  - `one-time` → type 2
  - `recurring` + `no-fixed-time` → type 3
  - `recurring` + `fixed` → type 8
- For type 8, assembles a `recurrence` array (type, repeat_interval, weekly_days, end_date_time or end_times) and passes it to the model.

#### Model (`oilylife/models/video-conferencing.php`)
- Updated `normalizeMeetingParameters()` to include the `recurrence` object in the Zoom API payload when meeting type is 8.

---

### 6. Polls Eligibility Tooltip on Meeting Detail Page

A tooltip was added next to the "Polls" section heading on the meeting detail page. It informs users that polls are supported on scheduled (one-time) and recurring meetings with a fixed schedule, but not on recurring meetings with no fixed schedule.

**Files changed:** `oilylife/views/account/video-conferencing-meetings-view.html.php`

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `oilylife/models/video-conferencing.php` | Fixed `sendRequest()` HTTP error handling; fixed `getMeetingPollResults()` endpoint; added recurrence to `normalizeMeetingParameters()` |
| `oilylife/controllers/conferencing.php` | Added type 8 meeting logic and recurrence data assembly |
| `oilylife/views/account/video-conferencing-meetings-create.html.php` | Added fixed-schedule sub-option and recurrence pattern UI |
| `oilylife/views/account/video-conferencing-meetings-view.html.php` | Fixed poll loading error handling; rewrote poll results JS; added meeting type check; added polls tooltip; removed stale "polls disabled" message |

---

## Zoom API Scope Requirements (No Changes Needed)

Our Server-to-Server OAuth app already has the required scopes:
- `meeting:read:admin` — list/read meetings and polls
- `meeting:write:admin` — create/update/delete meetings and polls
- `report:read:admin` — **not required** (removed usage of the reporting endpoint)
