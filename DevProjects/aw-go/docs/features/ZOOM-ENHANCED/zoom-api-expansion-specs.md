# Zoom API Expansion — Feature Specs

## Document Purpose

This document specs every feature area identified in the `zoom-api-deep-dive.docx` that does NOT already have an existing SDD. Each section is a self-contained feature spec with scope, user value, API details, implementation approach, and open questions.

**Existing SDDs (already spec'd or built — not repeated here):**
- Polls CRUD + results → `polls-sdd.md` (built)
- Attendance reports → `attendance-sdd.md` (spec'd)
- AI Companion summaries → `ai-companion-sdd.md` (built)
- Meeting transcripts → `ai-companion-sdd.md` (spec'd, not built)
- Smart recording → `ai-companion-sdd.md` (spec'd, not built)

---

## Table of Contents

1. [Webhook Receiver (Foundation)](#1-webhook-receiver) ✅ **COMPLETE**
2. [Post-Meeting Auto-Pipeline](#2-post-meeting-auto-pipeline) ⏸ **DEFERRED**
3. [Advanced Meeting Settings](#3-advanced-meeting-settings) ✅ **COMPLETE**
4. [Meeting Registration / Auto-Registration](#4-meeting-registration) ⏸ **DEFERRED**
5. [Cloud Recording Management](#5-cloud-recording-management) ⏸ **DEFERRED**
6. [Q&A Reports](#6-qa-reports) ⏸ **DEFERRED**
7. [User Settings Management](#7-user-settings-management) ⏸ **DEFERRED**
8. [Account-Level Settings & Lock Management](#8-account-level-settings) ⏸ **DEFERRED**
9. [Webinar Support](#9-webinar-support) ⏸ **DEFERRED**
10. [Live Streaming Configuration](#10-live-streaming) ⏸ **DEFERRED**
11. [Breakout Room Pre-Assignment](#11-breakout-room-pre-assignment)
12. [RTMS (Real-Time Media Streams)](#12-rtms) ⏸ **DEFERRED**
13. [Per-Account Zoom Settings Review](#13-per-account-settings-review)

---

## 1. Webhook Receiver ✅ COMPLETE

### Priority: P1 (Critical — foundation for items 2, 4, 5, 6)

### What It Does

A single endpoint on the AttractWell platform that receives real-time event notifications from Zoom. Instead of polling Zoom's API to find out when meetings end, recordings finish processing, or registrations happen, Zoom pushes these events to us as they occur.

### Why It Matters

Without webhooks, every automated feature requires either:
- Manual user action ("click to fetch attendance"), or
- A cron job polling Zoom on a schedule (slow, rate-limit-heavy, unreliable)

Webhooks make the platform feel instant — meeting ends, and within seconds the attendance report, summary, and recordings appear automatically.

### Zoom Webhook Events Worth Subscribing To

| Event | What Fires It | What We'd Do With It |
|-------|--------------|---------------------|
| `meeting.ended` | Meeting concluded | Pull attendance report, store locally |
| `meeting.summary_completed` | AI summary is ready | Fetch summary, attach to meeting record |
| `recording.completed` | Cloud recording processed | Download/link recording files |
| `recording.transcript_completed` | Transcript ready | Fetch VTT transcript, store searchable text |
| `meeting.registration_created` | Someone registered | Sync registration to platform (if registration feature built) |
| `meeting.registration_approved` | Registration approved | Update status in platform |
| `meeting.started` | Meeting began | Could update meeting status in UI (live indicator) |
| `meeting.created` | Meeting scheduled | Sync external meeting creation back to platform |
| `meeting.updated` | Meeting details changed | Sync changes back to platform |
| `meeting.deleted` | Meeting deleted | Clean up platform records |

### How Zoom Webhooks Work

1. You register a webhook endpoint URL in the Zoom Marketplace app settings
2. Zoom sends a one-time **URL validation challenge** (CRC) — you must respond with `HMAC-SHA256(challenge_token, secret_token)` to prove you control the endpoint
3. After validation, Zoom sends POST requests to your endpoint for subscribed events
4. Each request includes a `x-zm-signature` header for verification
5. You must respond with HTTP 200 within 3 seconds — do processing asynchronously

### Implementation Approach

#### Endpoint

New controller: `oilylife/controllers/zoom-webhook.php`
Route: `/api/zoom/webhook` (or similar — needs to be publicly accessible, no session auth)

#### Request Flow

```
Zoom POST → zoom-webhook.php
  1. Verify signature (HMAC-SHA256 of request body using secret token)
  2. If CRC challenge → respond with hash and exit
  3. Parse event type from payload
  4. Log to zoom_webhook_log table (for debugging)
  5. Respond 200 immediately
  6. Route to handler based on event type
```

#### Signature Verification (Critical for Security)

```php
// Zoom sends:
// Header: x-zm-signature = v0=<hash>
// Header: x-zm-request-timestamp = <unix_timestamp>

$message = 'v0:' . $timestamp . ':' . $raw_body;
$expected = 'v0=' . hash_hmac('sha256', $message, $secret_token);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    die;
}
```

#### CRC Challenge Response

```php
if ($event === 'endpoint.url_validation') {
    $plain_token = $payload['payload']['plainToken'];
    $hash = hash_hmac('sha256', $plain_token, $secret_token);
    echo json_encode([
        'plainToken' => $plain_token,
        'encryptedToken' => $hash
    ]);
    die;
}
```

#### Event Handler Routing

```php
switch ($event) {
    case 'meeting.ended':
        handleMeetingEnded($payload);
        break;
    case 'meeting.summary_completed':
        handleSummaryCompleted($payload);
        break;
    case 'recording.completed':
        handleRecordingCompleted($payload);
        break;
    case 'recording.transcript_completed':
        handleTranscriptCompleted($payload);
        break;
    // ... etc
}
```

### Database

```sql
-- Webhook event log (debugging + idempotency)
CREATE TABLE zoom_webhook_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(100) NOT NULL,  -- Zoom's event ID for deduplication
    meeting_id VARCHAR(50),
    payload_json MEDIUMTEXT,
    processed TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_id (event_id),
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Gotchas (from deep dive)

- **Deduplication**: Zoom sometimes sends the same event multiple times within milliseconds. Check `event_id` before processing.
- **3-second timeout**: Zoom expects a 200 response within 3 seconds. Do NOT do heavy processing before responding. Log the event and process asynchronously (or use a cron job to process unprocessed webhook entries).
- **Secret token**: Stored in Zoom Marketplace app settings. Must be in AttractWell config, NOT in code.

### Prerequisites

- [ ] Register webhook endpoint URL in Zoom Marketplace app
- [ ] Store webhook secret token in platform config
- [ ] Subscribe to desired events in Zoom Marketplace
- [ ] Ensure endpoint is publicly accessible (no session auth, no IP restriction)

### Open Questions for Greg

1. **Async processing strategy**: Should webhook handlers do work inline (simpler but risky if slow), or should we log events and process them via a cron job (more robust but adds latency)?
2. **Which events to subscribe to initially?** Recommend starting with `meeting.ended` + `recording.completed` + `meeting.summary_completed`.
3. **Where does the webhook secret token live?** Suggest `oilylife/config/oil.config.php` or a separate zoom config file.

---

## 2. Post-Meeting Auto-Pipeline ⏸ DEFERRED

> **Greg's decision (2026-03-30):** Keep post-meeting data (attendance, polls, summary, transcript) in Zoom's API and fetch on-demand. Local caching adds complexity without enough benefit unless bulk processing or cross-meeting reporting becomes a requirement. Revisit if that need arises.
>
> **Note:** The `recording.completed` webhook already sends a "your assets are ready" email to the host — that's the extent of the automated pipeline for now.

### Priority: P1 (Depends on Webhook Receiver)

### What It Does

When a meeting ends, automatically collect and store all post-meeting data: attendance, AI summary, recordings, and transcript. Users see a complete post-meeting dashboard without clicking anything.

### Why It Matters

Currently, every piece of post-meeting data requires the admin to manually navigate to the meeting detail page and wait for AJAX calls to Zoom's API. With the auto-pipeline:
- Data is fetched once and cached locally (faster page loads, no Zoom API dependency at view time)
- Data persists beyond Zoom's 6-month retention limit
- Platform can send post-meeting emails with summary + recording link automatically

### Event Chain

```
meeting.ended (webhook)
  → Fetch attendance report → store in zoom_meeting_attendance
  → Fetch poll results → store in zoom_meeting_poll_results

meeting.summary_completed (webhook, fires ~1-5 min after meeting ends)
  → Fetch AI summary → store in zoom_meeting_summaries

recording.completed (webhook, fires minutes to hours after meeting ends)
  → Store recording metadata (URLs, file types, sizes) in zoom_meeting_recordings
  → Optionally download and store files locally or on CDN

recording.transcript_completed (webhook, fires after recording.completed)
  → Fetch VTT transcript content → store in zoom_meeting_transcripts
```

### Database Tables

```sql
-- Meeting summaries (AI Companion)
CREATE TABLE zoom_meeting_summaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(50) NOT NULL,
    meeting_id VARCHAR(50) NOT NULL,
    meeting_uuid VARCHAR(100),
    summary_overview TEXT,
    next_steps TEXT,
    raw_json MEDIUMTEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_meeting (product, meeting_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Recording metadata
CREATE TABLE zoom_meeting_recordings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(50) NOT NULL,
    meeting_id VARCHAR(50) NOT NULL,
    meeting_uuid VARCHAR(100),
    recording_id VARCHAR(100),
    file_type VARCHAR(20),       -- MP4, M4A, CHAT, TRANSCRIPT, TIMELINE, CC
    file_size BIGINT,
    download_url VARCHAR(2048),
    local_path VARCHAR(512),     -- if downloaded to CDN
    recording_start DATETIME,
    recording_end DATETIME,
    status VARCHAR(20) DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_meeting (product, meeting_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transcripts (full text for search)
CREATE TABLE zoom_meeting_transcripts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(50) NOT NULL,
    meeting_id VARCHAR(50) NOT NULL,
    meeting_uuid VARCHAR(100),
    transcript_text MEDIUMTEXT,
    format VARCHAR(10) DEFAULT 'vtt',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_meeting (product, meeting_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Attendance records (local cache)
CREATE TABLE zoom_meeting_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(50) NOT NULL,
    meeting_id VARCHAR(50) NOT NULL,
    meeting_uuid VARCHAR(100),
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    join_time DATETIME,
    leave_time DATETIME,
    duration_seconds INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_meeting (product, meeting_id),
    INDEX idx_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Poll results (local cache)
CREATE TABLE zoom_meeting_poll_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(50) NOT NULL,
    meeting_id VARCHAR(50) NOT NULL,
    meeting_uuid VARCHAR(100),
    question_text TEXT,
    answer_text VARCHAR(500),
    respondent_email VARCHAR(255),
    respondent_name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_meeting (product, meeting_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Impact on Existing Features

Once the auto-pipeline is in place, the existing meeting detail page features (attendance, polls, AI summary, transcript) should check local DB first and only fall back to live Zoom API if no local data exists. This makes page loads faster and removes the 6-month retention limit.

### Post-Meeting Email (Future)

With all data collected automatically, the platform could send a post-meeting email to the host containing:
- Attendance count and list
- AI summary with action items
- Link to recording

### Open Questions for Greg

1. **Local file storage for recordings?** Zoom recording download URLs expire. Should we download MP4/M4A files to Bunny CDN, or just store the metadata and let admins click through to Zoom? Storage costs vs. convenience tradeoff.
2. **Transcript searchability**: Should transcripts be searchable across meetings (full-text search), or is per-meeting display sufficient?
3. **Post-meeting email**: Should this be automatic for all meetings, or configurable per-meeting?
4. **Data retention**: If we cache data locally, do we keep it forever or apply our own retention policy?

---

## 3. Advanced Meeting Settings ✅ COMPLETE

### Priority: P2

### What It Does

Expose additional Zoom meeting settings in the meeting create/edit form. Currently, only basic fields are exposed (topic, time, duration, recurring). The Zoom API supports many more toggleable settings.

### Settings Worth Exposing

#### High Value (Commonly Needed)

| Setting | API Field | Type | Why Users Want It |
|---------|-----------|------|-------------------|
| Waiting room | `settings.waiting_room` | bool | Security — control who enters |
| Mute on entry | `settings.mute_upon_entry` | bool | Large meetings — prevent noise |
| Host video on/off | `settings.host_video` | bool | Control presentation style |
| Participant video on/off | `settings.participant_video` | bool | Webinar-style presentations |
| Join before host | `settings.join_before_host` | bool | Let attendees in early |
| JBH time | `settings.jbh_time` | int (0,5,10,15) | How many minutes early |
| Auto-recording | `settings.auto_recording` | string (none/local/cloud) | Ensure meetings are recorded |
| Alternative hosts | `settings.alternative_hosts` | string (emails) | Delegate hosting |

#### Medium Value (Power Users)

| Setting | API Field | Type | Why Users Want It |
|---------|-----------|------|-------------------|
| Meeting authentication | `settings.meeting_authentication` | bool | Restrict to authenticated users |
| Authentication domains | `settings.authentication_domains` | string | Restrict to specific email domains |
| Allow multiple devices | `settings.allow_multiple_devices` | bool | Edge case — one person, two screens |
| Focus mode | `settings.focus_mode` | bool | Participants only see host |
| Encryption type | `settings.encryption_type` | string | E2EE for sensitive meetings |

#### Low Value / Niche

| Setting | API Field | Type | Notes |
|---------|-----------|------|-------|
| Geo-restriction | `settings.approved_or_denied_countries_or_regions` | object | Rare use case |
| Breakout pre-assignment | `settings.breakout_room` | object | See Section 11 |
| Live streaming | `settings.live_streaming` | object | See Section 10 |

### Implementation Approach

Add an "Advanced Settings" collapsible section to the meeting create/edit form (`video-conferencing-meetings-create.html.php`). Use toggle switches for boolean settings and dropdowns for enum settings.

The controller (`conferencing.php`) already builds a `$meeting_info` array that gets passed to the model. Add the new settings to this array.

The model (`video-conferencing.php`) already sends the `settings` object to Zoom. Add the new fields to `normalizeMeetingParameters()`.

When editing an existing meeting, pre-populate the advanced settings from the GET response.

### Files

| File | Change |
|------|--------|
| `oilylife/views/account/video-conferencing-meetings-create.html.php` | Add "Advanced Settings" collapsible section |
| `oilylife/controllers/conferencing.php` | Collect new POST fields, add to `$meeting_info` |
| `oilylife/models/video-conferencing.php` | Add fields to `normalizeMeetingParameters()` |

### Open Questions for Greg

1. **Which settings to expose first?** Recommend starting with: waiting room, mute on entry, auto-recording, and alternative hosts. These cover the most common requests.
2. **Should these be per-meeting or account-wide defaults?** The Zoom API supports both. Per-meeting is simpler to implement.
3. **Locked settings**: Some settings may be locked at the account level (same issue as polls). Should we show locked settings as disabled with an explanation, or hide them entirely?

---

## 4. Meeting Registration ⏸ DEFERRED

> **Decision (2026-03-30):** Users don't appear to have a strong need for per-person join links vs. a shared link. Part B (auto-registration) only becomes valuable if post-meeting attendance data is being captured locally (see Item #2, also deferred). Revisit if that changes or if admins specifically request gated meeting entry.



### Priority: P2

### What It Does

Two capabilities:

**A. Zoom Registration for AttractWell Meetings** — Enable Zoom's built-in registration for meetings created through AttractWell. Registrants must register (providing name, email, and optionally custom questions) before they can join.

**B. Auto-Registration** — When a user RSVPs to an event on AttractWell, automatically register them for the associated Zoom meeting via the API. They receive a unique join link without needing to register separately on Zoom.

### Why It Matters

- Eliminates double registration (RSVP on AttractWell + register on Zoom)
- Gives the host a unified attendee list
- Enables custom registration questions (collect data your platform needs)
- Registration status can be synced back to AttractWell's contact manager

### Zoom API Endpoints

| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| Add registrant | POST | `meetings/{id}/registrants` | Returns unique `join_url` for that registrant |
| List registrants | GET | `meetings/{id}/registrants` | Filter by status: pending/approved/denied |
| Approve/deny registrants | PUT | `meetings/{id}/registrants/status` | Bulk approve/deny |
| Get registrant details | GET | `meetings/{id}/registrants/{registrantId}` | Individual detail |
| Remove registrant | DELETE | `meetings/{id}/registrants/{registrantId}` | — |
| Get custom questions | GET | `meetings/{id}/registrants/questions` | — |
| Update custom questions | PATCH | `meetings/{id}/registrants/questions` | — |

### Meeting Settings for Registration

When creating/updating a meeting, set:
```json
{
  "settings": {
    "approval_type": 0,          // 0 = auto approve, 1 = manual, 2 = no registration
    "registration_type": 1,      // 1 = register once, 2 = each time, 3 = once + choose occurrences
    "close_registration": false,
    "registrants_email_notification": true,
    "registrants_confirmation_email": true
  }
}
```

### User Flow: Auto-Registration

```
User RSVPs to event on AttractWell
  → AttractWell checks if event has a linked Zoom meeting with registration enabled
  → POST /meetings/{id}/registrants with user's name and email
  → Zoom returns a unique join_url for that user
  → AttractWell stores the join_url and shows it to the user
  → User clicks unique join_url to enter meeting (no Zoom registration needed)
```

### User Flow: Registration Management (Admin)

1. Admin creates a meeting with "Require registration" enabled
2. Optionally sets approval type (auto-approve vs manual)
3. Optionally adds custom registration questions
4. After users RSVP/register, admin sees registrant list with status
5. Admin can approve/deny pending registrants
6. Admin can see who has a unique join link

### Implementation Approach

#### Meeting Create/Edit

Add a "Registration" section to the meeting create/edit form:
- Toggle: "Require registration" (bool)
- Dropdown: "Approval type" (auto/manual/none)
- Dropdown: "Registration type" (once/each time/choose occurrences) — only for recurring meetings

#### Auto-Registration Hook

In the event RSVP controller (wherever RSVPs are processed), add a check:
- Is this event linked to a Zoom meeting?
- Does the meeting have registration enabled?
- If yes, POST the registrant to Zoom and store the unique join URL

#### Registration Management View

On the meeting detail page, a new "Registrants" tab (or section) showing:
- List of registrants with status (pending/approved/denied)
- Approve/deny buttons for manual-approval meetings
- Each registrant's unique join URL

### Database

```sql
-- Local cache of registrations for quick lookup
CREATE TABLE zoom_meeting_registrants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(50) NOT NULL,
    meeting_id VARCHAR(50) NOT NULL,
    registrant_id VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'approved',  -- pending, approved, denied
    join_url VARCHAR(2048),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_meeting_email (product, meeting_id, email),
    INDEX idx_meeting (product, meeting_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Webhook Events (if webhook receiver is built)

- `meeting.registration_created` → sync to local table
- `meeting.registration_approved` → update status
- `meeting.registration_cancelled` → update status
- `meeting.registration_denied` → update status

### Open Questions for Greg

1. **Does AttractWell have event RSVP functionality?** If so, where does that code live? The auto-registration hook needs to plug into it.
2. **Custom registration questions**: Should we expose Zoom's custom question builder, or is name + email sufficient?
3. **Approval workflow**: Is manual approval useful for AttractWell customers, or should we always auto-approve?
4. **Unique join URLs**: Should these be emailed to registrants automatically, or just displayed in the platform?

---

## 5. Cloud Recording Management ⏸ DEFERRED

> **Decision (2026-03-30):** The primary workflow is Zoom → Video Manager (manual button click by user) → embedded on page. Sharing controls and trash management add little value since recordings are temporary (30 days in Zoom) and the real permanent home is Video Manager. Revisit if there's demand for automated transfer to Video Manager or bulk recording management.



### Priority: P2

### What It Does

Expand the existing cloud recordings display with full lifecycle management: viewing, sharing settings, downloading, trash management, and recording settings configuration.

### What Exists Today

The meeting detail page currently shows cloud recording files as download links. That's it — no sharing controls, no trash management, no settings.

### New Capabilities

| Capability | API Endpoint | User Value |
|------------|-------------|------------|
| View recording sharing settings | `GET /meetings/{id}/recordings/settings` | See who can access recordings |
| Update sharing settings | `PATCH /meetings/{id}/recordings/settings` | Control password, download access, share link |
| Trash recordings | `PUT /meetings/{id}/recordings/status` (action=trash) | Clean up old recordings |
| Recover from trash | `PUT /meetings/{id}/recordings/status` (action=recover) | Undo accidental deletion |
| Delete recordings permanently | `DELETE /meetings/{id}/recordings` | Free up cloud storage |
| Delete specific recording file | `DELETE /meetings/{id}/recordings/{recordingId}` | Remove just audio or just video |
| List user's recordings | `GET /users/{userId}/recordings` | Browse all recordings (not just per-meeting) |

### Recording Sharing Settings

The sharing settings object includes:
```json
{
  "share_recording": "publicly",      // publicly, internally, none
  "recording_authentication": false,
  "authentication_domains": "",
  "viewer_download": true,             // can viewers download?
  "password": "abc123",               // access password
  "on_demand": false,                 // on-demand recording
  "approval_type": 0,                 // 0 = auto, 1 = manual, 2 = no registration
  "send_email_to_host": true,
  "show_social_share_buttons": true
}
```

### User Flow

1. Admin views a past meeting with cloud recordings
2. Below the existing download links, new controls appear:
   - **Sharing**: Toggle between public/internal/none, set/remove password, enable/disable download
   - **Share link**: Copy shareable link to clipboard
   - **Actions**: "Move to Trash" / "Delete Permanently" buttons
3. A new "All Recordings" page (`/app/conferencing/recordings`) lists all recordings across all meetings with search and date filtering

### Implementation Approach

Add sharing settings controls to the existing recordings section on the meeting detail page. Add an "All Recordings" list page for browsing.

### Files

| File | Change |
|------|--------|
| `oilylife/models/video-conferencing.php` | Add recording settings methods (get/update/trash/recover/delete) |
| `oilylife/controllers/admin-meeting-data.php` | Add recording settings actions |
| `oilylife/views/account/video-conferencing-meetings-view.html.php` | Add sharing controls to recordings section |
| `oilylife/controllers/conferencing.php` | Add "All Recordings" list page |
| `oilylife/views/account/video-conferencing-recordings.html.php` | New — recordings list page |

### Open Questions for Greg

1. **All Recordings page**: Is a standalone page for browsing all recordings useful, or is per-meeting sufficient?
2. **Storage concerns**: Zoom has storage limits per account. Should we show storage usage or warn when approaching limits?
3. **Recording download to CDN**: Should recordings be downloaded to Bunny CDN for persistence beyond Zoom's retention, or is linking to Zoom sufficient?

---

## 6. Q&A Reports ⏸ DEFERRED

> **Decision (2026-03-30):** Q&A is a webinar-only Zoom feature — it doesn't exist in standard meetings. AttractWell creates standard meetings, so this API endpoint will never fire. Revisit only if webinar support (Item #9) is built.


### Priority: P3

### What It Does

Retrieve and display Q&A data from meetings that had the Q&A feature enabled. Shows questions asked, answers given, and who asked/answered.

### API Endpoint

| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| Get Q&A report | GET | `report/meetings/{meetingId}/qa` | Requires `report:read:admin` scope |

### Response Structure

```json
{
  "questions": [
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "question": "What's the timeline for Q2?",
      "answer": "We're targeting end of June.",
      "answer_time": "2024-03-15T14:25:00Z"
    }
  ]
}
```

### Implementation

Add a "Q&A" section to the meeting detail page, similar to poll results. Only shown for past meetings. Fetched via AJAX.

### Scope Note

Q&A is a meeting-level feature that must be enabled in Zoom settings. It's most commonly used in webinar-style meetings. If webinar support (Section 9) is built, Q&A becomes more relevant since webinars have a dedicated Q&A panel.

### Open Questions for Greg

1. **Is Q&A used by current users?** If nobody enables Q&A in their Zoom meetings, this has low value. Worth a quick check.
2. **Scope issue**: The `report/meetings/{id}/qa` endpoint requires `report:read:admin` scope. We had to work around this scope for poll results (switched to `past_meetings` endpoint). Need to verify if Q&A has an alternative endpoint, or if we need to request this scope.

---

## 7. User Settings Management ⏸ DEFERRED

> **Decision (2026-03-30):** The polls issue (the original motivation) is already solved by temporarily flipping the Zoom license to Business when polls are used. No other settings have broken silently. Revisit if a new feature breaks due to a locked account setting.


### Priority: P2

### What It Does

Programmatically manage per-user Zoom settings for sub-account users. Instead of manually toggling settings in the Zoom admin portal, AttractWell can provision users with the correct settings automatically.

### Why It Matters

This was the root cause of the polls issue — polls were disabled at the user level, and the setting couldn't be changed because it was locked at the account level. With proper settings management:
- New users get provisioned with correct defaults
- Features can be enabled/disabled per-user from within AttractWell
- Troubleshooting becomes easier (can see and fix settings without logging into Zoom)

### API Endpoints

| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| Get user settings | GET | `/users/{userId}/settings` | Massive response — all settings |
| Update user settings | PATCH | `/users/{userId}/settings` | Partial update by section |
| Get user profile | GET | `/users/{userId}` | Name, email, type, plan |
| Update user profile | PATCH | `/users/{userId}` | Update profile fields |

### Settings Sections

The settings response is divided into sections. When updating, you specify which section:
`PATCH /users/{userId}/settings?option={section}`

Sections: `schedule_meeting`, `in_meeting`, `email_notification`, `recording`, `telephony`, `feature`

### Key Settings to Manage

| Section | Setting | Why |
|---------|---------|-----|
| `in_meeting` | `polling` | Enable/disable polls |
| `in_meeting` | `breakout_room` | Enable/disable breakout rooms |
| `in_meeting` | `closed_caption` | Enable/disable closed captions |
| `in_meeting` | `co_host` | Allow co-hosts |
| `in_meeting` | `waiting_room` | Default waiting room |
| `in_meeting` | `auto_saving_chat` | Auto-save meeting chat |
| `in_meeting` | `question_and_answer` | Enable Q&A |
| `recording` | `auto_recording` | Default recording behavior |
| `recording` | `cloud_recording` | Enable cloud recording |
| `feature` | `meeting_summary_with_ai_companion` | Enable AI summaries |

### User Flow (Admin)

1. Admin navigates to a user management page (or Zoom settings section within account settings)
2. Sees a list of Zoom-connected users with their current plan type and key settings
3. Can toggle individual settings on/off for each user
4. Settings that are locked at the account level show as disabled with an explanation

### Implementation Approach

This could be:
- **Option A**: A dedicated "Zoom User Settings" admin page showing all connected users and their settings
- **Option B**: A settings panel on the existing meeting settings or account settings page
- **Option C**: Automated provisioning only — no UI, just ensure correct defaults when connecting a Zoom account

Option C is the minimum viable approach and solves the immediate pain (polls bug). Options A/B add admin visibility.

### Account-Level Lock Check

Before updating any user setting, check if it's locked at the account level:
```
GET /accounts/{accountId}/lock_settings
```
If locked, the user-level PATCH will silently succeed without changing anything. The UI should show locked settings as read-only.

### Open Questions for Greg

1. **Provisioning approach**: Should this be automatic (apply defaults on Zoom connection), manual (admin UI), or both?
2. **Which settings matter most?** Polls was the immediate pain. What else do users run into?
3. **User list**: Where does AttractWell store the list of connected Zoom sub-users? Is there a user management page for Zoom already?

---

## 8. Account-Level Settings & Lock Management ⏸ DEFERRED

> **Decision (2026-03-30):** Paired with #7 — same reasoning applies. Deferred until there's a concrete setting that needs managing.


### Priority: P2 (Paired with Section 7)

### What It Does

View and manage Zoom settings at the account level (affects all sub-users). Also manage which settings are "locked" — locked settings cannot be overridden at the user level.

### API Endpoints

| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| Get account settings | GET | `/accounts/{accountId}/settings` | All account-level settings |
| Update account settings | PATCH | `/accounts/{accountId}/settings` | Partial update |
| Get lock settings | GET | `/accounts/{accountId}/lock_settings` | Which settings are locked |
| Update lock settings | PATCH | `/accounts/{accountId}/lock_settings` | Lock/unlock settings |

### Why It Matters

The polls bug was caused by an account-level lock. Understanding and managing locks prevents this class of bug entirely. The API interaction is:

```
Account Level: polling = true, locked = true
  → User Level: polling = false
  → PATCH /users/{id}/settings { in_meeting: { polling: true } }
  → Response: 204 (success!)
  → Reality: Setting did NOT change because it's locked at account level
```

### Implementation Approach

This is an admin-only feature. Could be:
- A section on the Zoom settings page showing account-level locks
- A diagnostic tool that checks for lock conflicts when a feature isn't working
- An automated check: before updating user settings, always verify locks first

### Open Questions for Greg

1. **Does AttractWell own the Zoom account?** If yes, we can manage account-level settings. If users bring their own Zoom accounts, we may not have account-level API access.
2. **Lock management UI**: Is this needed as a user-facing feature, or is it sufficient as a diagnostic tool for troubleshooting?

---

## 9. Webinar Support ⏸ DEFERRED

> **Decision (2026-03-30):** AttractWell does not offer webinars. Not applicable unless webinar licenses are added to the platform in the future.


### Priority: P3

### What It Does

Full webinar lifecycle management — create, manage, and report on Zoom Webinars from within AttractWell. Webinars are similar to meetings but designed for large audiences with presenter/attendee roles.

### How Webinars Differ from Meetings

| Feature | Meeting | Webinar |
|---------|---------|---------|
| Max participants | 100-1000 | 500-50,000 |
| Participant roles | All equal (can unmute, share) | Hosts, panelists, attendees (view-only) |
| Registration | Optional | Common / expected |
| Q&A | Optional | Built-in, prominent |
| Practice session | No | Yes — hosts rehearse before going live |
| Branding | Limited | Custom branding, virtual backgrounds |
| Absentee tracking | No | Yes — track registered no-shows |
| License required | Standard Zoom plan | Webinar add-on license |

### API Endpoints (Mirror of Meetings)

| Action | Method | Endpoint |
|--------|--------|----------|
| Create webinar | POST | `/users/{userId}/webinars` |
| Get/Update/Delete webinar | GET/PATCH/DELETE | `/webinars/{webinarId}` |
| Add registrant | POST | `/webinars/{id}/registrants` |
| List registrants | GET | `/webinars/{id}/registrants` |
| Create poll | POST | `/webinars/{id}/polls` |
| List/manage panelists | GET/POST/DELETE | `/webinars/{id}/panelists` |
| Get absentees | GET | `/past_webinars/{id}/absentees` |
| Get Q&A responses | GET | `/past_webinars/{id}/qa` |

### Webinar-Specific Features

1. **Panelist management**: Add/remove panelists (speakers) separately from attendees
2. **Practice sessions**: Hosts and panelists can join a practice session before the webinar starts
3. **Absentee reports**: See who registered but didn't attend — useful for follow-up campaigns
4. **Custom branding**: Webinar registration pages can be branded
5. **On-demand viewing**: Webinar recordings can be made available as on-demand content

### Implementation Approach

The webinar API closely mirrors the meetings API. Most of the existing meeting infrastructure (create/edit form, detail page, recordings, etc.) could be adapted for webinars with:
- A "type" selector (meeting vs webinar) on the create form
- Additional webinar-specific fields (panelists, practice session, branding)
- Webinar-specific sections on the detail page (panelist list, absentee report)

### Prerequisites

- Users must have a Zoom Webinar license (add-on to standard Zoom plan)
- Additional OAuth scopes for webinar endpoints

### Open Questions for Greg

1. **Do any current users have webinar licenses?** If not, this has zero immediate value.
2. **Scope**: Should webinars be a separate section of the platform, or integrated into the existing meetings flow?
3. **Absentee follow-up**: Could absentee data feed into AttractWell's email automation? (e.g., auto-send "Sorry we missed you" email)

---

## 10. Live Streaming Configuration ⏸ DEFERRED

> **Decision (2026-03-30):** Not building. Third-party platforms (YouTube, Facebook) change their streaming APIs frequently and would introduce ongoing maintenance problems outside our control. Not a common enough use case to justify the risk.


### Priority: P3

### What It Does

Allow users to configure custom live streaming for their Zoom meetings. Meetings can be simultaneously streamed to YouTube Live, Facebook Live, or any custom RTMP endpoint.

### API Fields

When creating or updating a meeting, the `settings.live_streaming` object supports:
```json
{
  "settings": {
    "live_streaming": {
      "custom_live_streaming_service": true,
      "live_streaming_service": ["youtube", "facebook"],
      "stream_url": "rtmp://a.rtmp.youtube.com/live2",
      "stream_key": "xxxx-xxxx-xxxx-xxxx",
      "page_url": "https://youtube.com/watch?v=..."
    }
  }
}
```

### User Flow

1. Admin creates/edits a meeting
2. In the "Advanced Settings" section, toggles "Enable Live Streaming"
3. Selects platform (YouTube, Facebook, Custom RTMP)
4. Enters stream URL, stream key, and page URL
5. During the meeting, the host starts the live stream from within Zoom

### Implementation Approach

This is a subsection of the "Advanced Meeting Settings" feature (Section 3). Add live streaming fields to the advanced settings collapsible section.

### Open Questions for Greg

1. **Do users currently live stream their Zoom meetings?** If this isn't a common use case, deprioritize.
2. **Stream key security**: Stream keys are sensitive. Should they be masked in the UI after saving?

---

## 11. Breakout Room Pre-Assignment

### Priority: P3

### What It Does

When creating a meeting via the API, pre-assign participants to breakout rooms. Instead of the host manually assigning rooms during the meeting, rooms are set up in advance.

### API Fields

When creating or updating a meeting:
```json
{
  "settings": {
    "breakout_room": {
      "enable": true,
      "rooms": [
        {
          "name": "Room 1 — Leadership",
          "participants": ["jane@example.com", "bob@example.com"]
        },
        {
          "name": "Room 2 — Operations",
          "participants": ["sue@example.com", "mark@example.com"]
        }
      ]
    }
  }
}
```

### User Flow

1. Admin creates/edits a meeting
2. Toggles "Pre-assign breakout rooms"
3. Adds rooms with names
4. Assigns participants (by email) to each room
5. During the meeting, the host opens breakout rooms and they're already assigned

### Implementation Approach

Add a breakout room builder UI to the meeting create/edit form. This is a moderately complex UI (dynamic room list with participant assignment), but the API integration is straightforward — it's just additional fields in the meeting settings object.

### Open Questions for Greg

1. **Is this used?** Breakout rooms are common in training/education scenarios. Does AttractWell serve that market?
2. **Participant source**: Should the participant picker pull from AttractWell's contact manager, or is manual email entry sufficient?

---

## 12. RTMS (Real-Time Media Streams)

### Priority: P4 (Not Recommended Now)

### What It Does

WebSocket-based API for live access to meeting audio, video frames, and transcription as they happen in real time. Designed for AI agents, live coaching tools, and custom notetaking apps.

### Why It's P4

Per the deep dive's own assessment:
> "RTMS is probably overkill for your use case right now. It is designed for real-time AI agents, live coaching tools, and custom notetaking apps. The post-meeting webhooks plus summary/transcript/recording APIs give you everything you need without the complexity of maintaining WebSocket connections."

### Key Limitations

- Receive-only (cannot send data back into the meeting)
- Requires a General App on Zoom Marketplace (not Server-to-Server OAuth)
- Host must approve RTMS access unless auto-start is configured
- Does NOT work in breakout rooms
- Requires Zoom client 6.5.5+
- WebSocket authenticated via HMAC-SHA256 signature, not OAuth tokens

### When to Revisit

RTMS becomes relevant if:
- AttractWell builds real-time AI features (live coaching, real-time transcription display)
- A customer needs live meeting data for compliance/monitoring
- Zoom improves RTMS to support sending data (chat posting, etc.)

### Recommendation

**Skip for now.** The post-meeting pipeline (Section 2) covers 95% of the value with 10% of the complexity.

---

## Implementation Priority Summary

### Phase 1 — Foundation + Quick Wins
| Feature | Effort | Value | Dependency |
|---------|--------|-------|------------|
| Webhook Receiver | Medium | Critical | None — enables everything else |
| Post-Meeting Auto-Pipeline | Medium | High | Webhook Receiver |
| Attendance Reports | Low | High | Already spec'd — just build it |
| Meeting Transcripts | Low | High | Already spec'd in AI Companion SDD |

### Phase 2 — Settings & Registration
| Feature | Effort | Value | Dependency |
|---------|--------|-------|------------|
| Advanced Meeting Settings | Low | Medium | None |
| User Settings Management | Low-Medium | Medium | None |
| Account-Level Lock Check | Low | Medium | User Settings |
| Meeting Registration | Medium | Medium | None |

### Phase 3 — Expansion
| Feature | Effort | Value | Dependency |
|---------|--------|-------|------------|
| Cloud Recording Management | Medium | Medium | None |
| Q&A Reports | Low | Low-Medium | None |
| Live Streaming | Low | Low-Medium | Advanced Meeting Settings |
| Breakout Pre-Assignment | Medium | Low-Medium | None |
| Webinar Support | High | Medium | Depends on user licenses |

### Phase 4 — Future
| Feature | Effort | Value | Dependency |
|---------|--------|-------|------------|
| RTMS | Very High | Low (currently) | Complete rethink of architecture |

---

## 13. Per-Account Zoom Settings Review

### Priority: P2

### What It Is

A full audit of every setting visible in the Zoom web UI Settings page, reviewed against what AttractWell currently exposes on the meeting create/edit form. Conducted 2026-03-30.

**Greg's request:** "Another idea would be to review the overall per-account Zoom settings and add more there, too."

**Currently exposed in AttractWell:** waiting room, mute on entry, host video, participant video, join before host, auto-recording, focus mode.

**Table columns:**
- **Setting Name** — label as shown in Zoom UI
- **API Field** — field name in Zoom API (under `/accounts/{id}/settings` or `/meetings/{id}` payload); `?` = likely exists but not confirmed
- **Type** — bool / string / int / enum
- **Notes** — relevance to AttractWell; context on what it controls

---

### Tab: AI Companion

#### Sub-tab: Meeting

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Use full display names for meeting assets generated by AI Companion | `ai_companion.use_full_display_names` ? | bool | AI Companion feature — only relevant if we build AI Companion management. Low priority. |
| AI Companion notices — Phone users (audio notification) | `ai_companion.phone_user_notice` ? | bool | Admin policy setting. Irrelevant to AttractWell's use case (no phone-dialed meetings). |
| Require phone-only users to press 1 to consent to AI Companion | `ai_companion.phone_consent_required` ? | bool | Same as above — phone-specific, not applicable. |
| Multiple notifications for phone users | `ai_companion.multiple_phone_notifications` ? | bool | Phone-specific. Not applicable. |

#### Sub-tab: Clips

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Create with avatars | `clips.create_with_avatars` ? | bool | Clips feature (out-of-meeting video creation). Not related to standard meetings. |
| Create custom avatars | `clips.create_custom_avatars` ? | bool | Same — Clips-specific, no meeting relevance. |

#### Sub-tab: Hub

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Allow users to ask AI Companion to create files in Hub | `hub.ai_companion_file_creation` ? | bool | Hub is Zoom's internal file system. Not relevant to AttractWell's meeting workflows. |

---

### Tab: General → Data & Storage

#### Sub-tab: Data & Storage

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Real-time data center location | `account_settings.data_center_region` ? | enum | Controls where Zoom processes audio/video in real-time. Greg would set this once at account level. Not per-meeting. Probably not worth surfacing in AW — account admin level decision. |
| Customize data center region for H.323/SIP call-out | `account_settings.crc_data_center_region` ? | enum | H.323/SIP conference room hardware. AttractWell users don't use this. Not applicable. |
| Detailed crash dumps (Windows) | `account_settings.detailed_crash_dumps` ? | bool | Zoom client debug setting. Not relevant to AW. |

#### Sub-tab: Other

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Feedback to Zoom | `in_meeting.feedback` | bool | Whether participants see a thumbs up/down survey after meetings. Could be relevant — AW hosts might want to disable this to reduce noise. |
| Allow users to send text feedback | `in_meeting.allow_text_feedback` ? | bool | Sub-setting of above. Minor. |
| Show "Join from a room" feature | `in_meeting.show_join_from_room` ? | bool | Zoom Rooms hardware integration. Not applicable to AW's audience. |
| Allow automatic direct sharing via ultrasonic proximity | `in_meeting.allow_proximity_signal` ? | bool | Zoom Rooms proximity feature. Not applicable. |
| Hide potentially sensitive information on mobile task switcher | `account_settings.hide_sensitive_mobile` ? | bool | Privacy/security setting for mobile. Unlikely to matter for AW users. |
| Change status to away when screen saver begins | `account_settings.away_on_screensaver` ? | bool | Presence status. Not meeting-related. |
| Track billable hours | `account_settings.track_billable_hours` ? | bool | Billing/time tracking feature. Not relevant to AW use case. |
| Show educational onboarding assistant for new features | `account_settings.show_onboarding_assistant` ? | bool | Zoom client UX setting. Not relevant to AW. |

---

### Tab: Meeting → General

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Enable auto-calling | `schedule_meeting.auto_calling` ? | bool | Automatically calls all accepted participants at start time. Interesting for AW — reduces friction for participants. Worth noting for future. |

---

### Tab: Meeting → Security

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Require all meetings secured with one security option | `security.meeting_security` | bool | Enforces passcode or waiting room. AW already exposes waiting room; this is the account-level enforcement of that policy. |
| Enable waiting room | `in_meeting.waiting_room` | bool | **Already exposed in AW.** |
| Waiting Room Options (who enters, sort order) | `in_meeting.waiting_room_settings` | object | Waiting room behavior detail. Could be useful to expose (e.g. "everyone" vs "guests only"). |
| Require a passcode when scheduling new meetings | `security.meeting_password` | bool | Default passcode requirement for new scheduled meetings. Worth exposing — hosts may want to disable this to simplify join links. |
| Require a passcode for instant meetings | `security.instant_meeting_password` | bool | Same as above for instant meetings. Less relevant since AW focuses on scheduled meetings. |
| Require a passcode for Personal Meeting ID | `security.pmi_password` | bool | PMI-specific. Locked by admin in the UI — not user-configurable. |
| Require passcode for participants joining by phone | `security.phone_password` | bool | Phone dial-in only. Locked by admin in the UI. Low relevance. |
| Embed passcode in invite link for one-click join | `security.password_in_invite_link` | bool | Makes join links work without separate passcode entry. **Very relevant** — if passcodes are required, this should be enabled by default so AW members aren't blocked. |
| Only authenticated meeting participants can join | `security.meeting_authentication` | bool | Requires Zoom login to join. Too restrictive for most AW use cases (members don't all have Zoom accounts). |
| Allow authentication exception | `security.authentication_exception` ? | bool | Phone-only users bypass auth. Sub-setting of above. |
| Block users in specific domains from joining | `security.block_user_domain` | bool | Domain-blocking policy. Admin-level, not per-meeting. |
| Allow Zoom Rooms to become host if they join first | `security.zoom_rooms_host` ? | bool | Hardware room feature. Not applicable. |
| Only authenticated users can join from Web client | `security.web_client_meeting_authentication` ? | bool | Web client specifically. Too restrictive for AW use case. |
| Approve or block entry from specific countries/regions | `security.approved_or_denied_countries` | bool | Geo-blocking. Admin-level policy. Not a per-meeting setting. |
| Allow use of end-to-end encryption | `security.end_to_end_encrypted_meetings` | bool | E2EE disables cloud recording, dial-in, phone. Niche use case — disables features AW relies on. Probably not worth surfacing. |
| Default encryption type | `security.encryption_type` | enum: `enhanced_encryption` / `e2ee` | Locks encryption type for all meetings. Not a per-meeting setting worth exposing in AW. |

---

### Tab: Meeting → Schedule Meeting

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Host video | `schedule_meeting.host_video` | bool | **Already exposed in AW.** |
| Participants video | `schedule_meeting.participant_video` | bool | **Already exposed in AW.** |
| Audio Type | `schedule_meeting.audio_type` | enum: `both` / `telephony` / `voip` | Controls whether dial-in phone is offered. AW users almost always use computer audio. Could expose as "allow phone dial-in" toggle. |
| Allow participants to join before host | `schedule_meeting.join_before_host` | bool | **Already exposed in AW.** |
| Allow Zoom Rooms to start meeting with Host Key | `schedule_meeting.zoom_rooms_host_key` ? | bool | Locked by admin. Hardware-specific. Not applicable. |
| Enable Personal Meeting ID | `schedule_meeting.personal_meeting_id_enabled` ? | bool | PMI availability. Account-level, not per-meeting. |
| Use PMI when scheduling a meeting | `schedule_meeting.use_pmi_for_scheduled_meetings` | bool | Whether new meetings use host's PMI by default. AW generates unique meeting IDs — this should stay off. |
| Use PMI when starting an instant meeting | `schedule_meeting.use_pmi_for_instant_meetings` | bool | Instant meetings only. Not relevant to AW's scheduled flow. |
| Add watermark | `schedule_meeting.watermark` | bool | Embeds attendee email on video/content. Requires authenticated users — conflicts with AW's open-join model. Not applicable. |
| Mute all participants when they join | `schedule_meeting.mute_upon_entry` | bool | **Already exposed in AW** as "mute on entry." |
| Upcoming meeting reminder | `schedule_meeting.upcoming_meeting_reminder` ? | bool | Desktop notification in Zoom client. Not an AW-controlled setting. |
| Meeting Templates | `schedule_meeting.meeting_templates` ? | bool | Admin-defined meeting templates. Could be interesting long-term but is separate infrastructure. Defer. |
| Meeting agenda — don't share with external users | `schedule_meeting.agenda_external_sharing` ? | bool | Restricts agenda visibility. Niche. |

---

### Tab: Meeting → In Meeting (Basic)

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Require media encryption for 3rd party endpoints (SIP/H.323) | `in_meeting.require_encryption_3rd_party` ? | bool | SIP/H.323 hardware. Not applicable to AW. |
| Meeting chat | `in_meeting.chat` | bool | Enables in-meeting chat. Relevant — hosts may want to disable chat (e.g. during focused sessions). Worth exposing. |
| Allow users to copy or save chats | `in_meeting.allow_save_chat` | enum | Who can save chat logs. Relevant for privacy-conscious AW users. |
| Allow users to access meeting chats before and after | `in_meeting.continuous_meeting_chat` ? | bool | New feature — persistent chat channel around meeting. Low priority for AW. |
| Allow participants to delete messages in meeting chat | `in_meeting.allow_delete_chat_message` ? | bool | Moderation control. Minor. |
| Allow participants to edit messages in meeting chat | `in_meeting.allow_edit_chat_message` ? | bool | Minor. |
| Enable Screenshot feature in meeting chat | `in_meeting.allow_screenshot_in_chat` ? | bool | Minor. |
| Allow participants to use emojis in meeting chat | `in_meeting.allow_emojis` ? | bool | Minor. |
| Meeting chat — Direct messages | `in_meeting.private_chat` | bool | Allows private DMs between participants. Some AW hosts may want to disable to keep communication visible to host. |
| Meeting chat — Auto-save | `in_meeting.auto_saving_chat` | bool | Auto-saves chat to host's computer. Could be useful default for AW hosts who want records. |
| Allow hyperlinks in Meeting and Webinar Chat | `in_meeting.allow_hyperlinks` ? | bool | Whether clickable links appear. Minor. |
| Send files via meeting chat | `in_meeting.file_transfer` | bool | Allow file uploads in chat. Potentially useful for AW's coaching/course delivery use case. |
| Sound notification when someone joins or leaves | `in_meeting.entry_exit_chime` | bool | Audible chime on join/leave. Some hosts find it disruptive in large meetings. Worth exposing. |
| Announce number of participants for dial-in participants | `in_meeting.announce_participant_count` ? | bool | Phone-dial-in specific. Not relevant. |
| Display end-of-meeting experience feedback survey | `in_meeting.post_meeting_feedback` ? | bool | Thumbs up/down after meeting. Some AW hosts may want to disable to reduce clutter. |
| Co-host | `in_meeting.co_host` | bool | Allow host to assign co-hosts. Relevant for AW — webinar-style sessions often need a co-host to manage attendees. Worth exposing. |
| Show raised hand in toolbar | `in_meeting.show_raised_hand` ? | bool | Separates raise hand from other reactions. Minor UX setting. |
| Show Zoom windows during screen share | `in_meeting.show_zoom_windows` ? | bool | Minor. |
| Screen sharing | `in_meeting.screen_sharing` | bool | Whether screen sharing is allowed. **Very relevant** — some AW hosts (courses, coaching) may want to restrict this to host-only. |
| Who can share (host only vs all participants) | `in_meeting.who_can_share_screen` | enum: `host` / `all` | Per-meeting control. Worth exposing — default should probably be "host only" for most AW use cases. |
| Who can start sharing when someone else is sharing | `in_meeting.who_can_share_screen_when_someone_is_sharing` | enum: `host` / `all` | Secondary share control. Less critical. |
| Allow participants to share documents | `in_meeting.allow_document_sharing` ? | bool | AI Docs integration. Low priority. |
| Screen Sharing Presenter View | `in_meeting.presenter_view` ? | bool | Presenter mode toggle. Minor. |
| Disable desktop screen sharing (app/window only) | `in_meeting.disable_desktop_screen_sharing` | bool | Forces participants to share specific apps, not full desktop. Privacy/security benefit. Niche use case. |
| Disable screen sharing when guests are in the meeting | `in_meeting.disable_screen_sharing_for_guests` ? | bool | Guests = non-account users. Most AW participants would be "guests." Would block all participant sharing. |
| Restrict external users from using remote control | `in_meeting.restrict_external_remote_control` ? | bool | Security — prevents outsiders controlling your screen. Not commonly needed in AW. |
| Annotation | `in_meeting.annotation` | bool | Annotate on shared screens. Useful for coaching/whiteboard-style AW meetings. Worth noting. |
| Allow saving of shared screens with annotations | `in_meeting.save_screen_annotate` ? | bool | Sub-setting of annotation. Minor. |
| Only the user who is sharing can annotate | `in_meeting.only_sharer_can_annotate` ? | bool | Restricts annotation to presenter. Relevant for structured AW sessions. |
| Enable Clips in meetings | `in_meeting.clips_in_meeting` ? | bool | Clips feature. Low priority. |
| Whiteboard (Classic) | `in_meeting.whiteboard` | bool | Classic whiteboard during meetings. Potentially relevant — covered better under new Whiteboard tab. |
| Remote control | `in_meeting.remote_control` | bool | Allow others to control your screen. Niche — relevant only for tech support AW use cases. |
| Slide Control | `in_meeting.slide_control` ? | bool | Control PowerPoint/Keynote remotely. Potentially useful for AW presenters, but niche. |
| Meeting reactions | `in_meeting.meeting_reactions` | bool | Emoji reactions during meeting (clap, heart, etc.). AW hosts may want these on for engagement. Already likely on by default. |
| Allow removed participants to rejoin | `in_meeting.allow_removed_to_rejoin` | bool | Whether kicked participants can come back. Relevant for moderation in AW. |
| Show invitee list in the Participants panel | `in_meeting.show_invitee_list` ? | bool | Shows invited but not-yet-joined people. Niche. |
| Allow users to change their name when joining | `in_meeting.allow_name_change_on_join` ? | bool | Name before joining. Some AW hosts may want to require real names. |
| Allow participants to rename themselves | `in_meeting.allow_rename` | bool | In-meeting rename. Same as above — moderation-relevant. |
| Allow host or co-host to rename participants in waiting room | `in_meeting.allow_host_rename_in_waitingroom` ? | bool | Admin/moderation. Minor. |
| Hide participant profile pictures | `in_meeting.hide_participant_pictures` ? | bool | Shows names only. Niche. |
| Meeting timers | `in_meeting.meeting_timer` ? | bool | Countdown timers visible to all. Could be useful for structured AW workshops. Low priority. |
| Default meeting wallpaper | `in_meeting.default_wallpaper` ? | string | Background for video feeds. Branding opportunity for AW — could allow per-account wallpaper. Low priority. |
| Allow users to join external meetings via mesh | `in_meeting.join_via_mesh` ? | bool | Network optimization for corporate LAN. Not applicable to AW's distributed users. |

---

### Tab: Meeting → In Meeting (Advanced)

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Report to Zoom (inappropriate behavior) | `in_meeting.report_participants` ? | bool | Safety/trust feature. Not AW-controlled. |
| Q&A in meetings | `in_meeting.question_answer` | bool | Q&A panel (separate from chat). **Highly relevant** — AW Section 6 already specs Q&A reports. This is the toggle that enables the feature. Worth exposing. |
| Q&A — allow anonymous questions | `in_meeting.qa_allow_anonymous` ? | bool | Sub-setting of Q&A. Useful to expose alongside Q&A toggle. |
| Q&A — attendees can upvote | `in_meeting.qa_allow_upvote` ? | bool | Sub-setting of Q&A. |
| Q&A — attendees can comment | `in_meeting.qa_allow_comment` ? | bool | Sub-setting of Q&A. |
| Allow participants to transcribe with My notes | `in_meeting.allow_participants_transcribe` ? | bool | AI Companion notes. Defer — covered in AI Companion SDD. |
| Breakout room | `in_meeting.breakout_room` | bool | Split participants into sub-rooms. **Highly relevant** — AW spec item #11. This is the toggle. Worth exposing, especially for workshop/course use cases. |
| Assign participants to breakout rooms when scheduling | `in_meeting.breakout_room_scheduling` ? | bool | Pre-assignment feature. Related to spec item #11. |
| Broadcast message to participants | `in_meeting.broadcast_message_to_breakout_rooms` ? | bool | Host-to-all broadcast from main room. Sub-feature of breakouts. |
| Broadcast voice to breakout rooms | `in_meeting.broadcast_voice_to_breakout_rooms` ? | bool | Sub-feature of breakouts. |
| Remote support | `in_meeting.remote_support` | bool | 1:1 screen takeover for tech support. Niche. Not a typical AW use case. |
| Manual captions | `in_meeting.manual_captions` | bool | Host-typed closed captions. Could be valuable for accessibility in AW. Worth noting. |
| Automated captions | `in_meeting.auto_generated_captions` | bool | AI-generated live captions. **Valuable** for AW's accessibility and international audience. Worth exposing — hosts should be able to turn this on by default. |
| Automated captions on device | `in_meeting.auto_captions_on_device` ? | bool | Local processing option. Technical. Not a per-meeting user setting. |
| Full transcript | `in_meeting.full_transcript` | bool | Side panel shows full live transcript. Companion to captions. Worth enabling alongside captions. |
| Enable automatic transcriptions for all meetings | `in_meeting.enable_auto_transcription` ? | bool | Automatic transcription start. Related to AI Companion SDD. |
| Save Captions | `in_meeting.save_captions` | bool | Allow participants to download transcript. Privacy consideration. |
| Language Interpretation | `in_meeting.language_interpretation` | bool | Real-time audio interpretation between languages. Relevant for AW's international accounts. Could surface as a toggle. |
| Sign Language interpretation view | `in_meeting.sign_language_interpretation` ? | bool | ASL/sign language. Accessibility. Niche but notable. |
| Far end camera control | `in_meeting.far_end_camera_control` | bool | Allow others to control your camera. Niche. |
| Virtual background | `in_meeting.virtual_background` | bool | Custom video backgrounds. Already likely enabled. Could be relevant for AW branding (custom virtual background per account). |
| Allow use of videos as virtual backgrounds | `in_meeting.virtual_background_videos` ? | bool | Sub-setting. |
| Immersive View | `in_meeting.immersive_view` ? | bool | Scene-based view (classroom, boardroom). Could be an AW differentiator — allows branded meeting environments. Worth noting. |
| Focus Mode | `in_meeting.focus_mode` | bool | **Already exposed in AW.** |
| Identify guest participants | `in_meeting.identify_guest_participants` ? | bool | Labels non-account users in participant list. Useful for AW hosts running mixed member/public sessions. |
| Only show default email when sending email invites | `in_meeting.only_default_email_for_invite` ? | bool | Invite behavior. Not AW-relevant. |
| Show a "Join from your browser" link | `in_meeting.show_browser_join_link` | bool | Lets participants skip downloading Zoom. **Very relevant** — AW members should be able to join without installing Zoom. Worth exposing (or setting on by default). |
| Require solving a CAPTCHA for guest users | `in_meeting.require_captcha_for_guests` ? | bool | Security for anonymous joiners. Could reduce bot joins. Low priority. |
| Allow livestreaming of meetings | `in_meeting.allow_live_streaming` | bool | Enables Facebook/YouTube/Twitch/custom stream. **Potentially high value** for AW — some hosts do public live streams. Covered in spec item #10. |
| Show a custom disclaimer when starting or joining | `in_meeting.meeting_disclaimer` ? | bool | Custom legal disclaimer popup. Could be relevant for AW accounts in regulated industries (health coaching, financial coaching). Worth noting. |
| Request permission to unmute | `in_meeting.request_permission_to_unmute` ? | bool | Host requests consent before unmuting. Relevant for AW's coaching sessions with clients. |
| Far end audio control | `in_meeting.far_end_audio_control` ? | bool | Remote audio control. Niche. |
| Enable "Stop incoming video" feature | `in_meeting.stop_incoming_video` ? | bool | Individual participant can turn off all incoming video (saves bandwidth). Not a host-configured setting. |

---

### Tab: Meeting → Email Notification

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| When attendees join meeting before host | `email_notification.when_attendees_join_before_host` ? | bool | Notifies host by email. Low relevance for AW — hosts are usually in the platform. |
| When a meeting is cancelled | `email_notification.when_meeting_cancelled` ? | bool | Cancellation email. Not AW-controlled. |
| When meetings are about to expire | `email_notification.when_meeting_about_to_expire` ? | bool | Expiry reminder. Not relevant — AW manages its own meeting lifecycle. |

---

### Tab: Meeting → Media Settings

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Meeting HD Video Quality | `in_meeting.hd_video` | bool | Higher resolution video (uses more bandwidth). Could be worth exposing — AW's fitness/coaching audience may care about video quality. Worth noting. |

---

### Tab: Meeting → Other

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Schedule Privilege (assign scheduling to other users) | `schedule_meeting.schedule_for_others` ? | bool/list | Allow one Zoom user to schedule on behalf of another. Not applicable in AW's single-user-per-account model. |

---

### Tab: Recording → General

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Record to computer files | `recording.local_recording` | bool | Allow local recording to host's computer. Relevant — some AW hosts want a local backup. |
| Who can request host permission to record | `recording.who_can_request_recording` ? | enum | Internal / external / domain-specific. Moderation control. Worth noting. |
| Auto approve recording permission for internal participants | `recording.auto_approve_internal` ? | bool | Sub-setting. |
| Auto approve recording permission for external participants | `recording.auto_approve_external` ? | bool | Sub-setting. |
| Save chat messages from the meeting / webinar | `recording.save_chat_text` | bool | Include chat in recording folder. Relevant — AW hosts who record also likely want the chat. |
| Save closed caption as a VTT file | `recording.save_closed_caption` | bool | VTT file alongside recording. Useful for AW hosts who publish recordings. |
| Automatic recording | `recording.auto_recording` | enum: `local` / `cloud` / `none` | **Already exposed in AW.** |

---

### Tab: Recording → Share

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Allow cloud recording sharing | `recording.cloud_recording_sharing` | bool | Whether the shareable recording link works at all. Should stay enabled for AW use case. |
| Automatically share recording with | `recording.auto_share_recording_with` ? | enum: `host_only` / `hosts_co_hosts_alt_hosts` / `hosts_invitees` / `hosts_invitees_participants` | Default post-meeting share scope. **Highly relevant** — AW hosts may want recordings auto-shared with attendees. Worth surfacing as an account-level default. |
| Require users to authenticate before viewing cloud recordings | `recording.require_auth_for_viewing` ? | bool | Passcode or Zoom login to view recording. Could be relevant for AW hosts who sell access to recordings. Worth noting. |

---

### Tab: Recording → Access

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| IP Address Access Control | `recording.ip_address_access_control` ? | bool/string | Limit recording access to specific IP ranges. Niche, enterprise-only use case. Not applicable to AW. |

---

### Tab: Recording → Notification

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Show a disclaimer to participants when a recording starts | `recording.show_recording_disclaimer` ? | enum: `all` / `guests` | Consent/compliance notice. Relevant for AW hosts in regulated industries. Worth noting. |
| Play voice prompt for | `recording.play_voice_prompt` ? | enum: `all` / `guests` / `none` | Audio "this meeting is being recorded" announcement. AW hosts may want control here. |
| Ask host to confirm before starting a recording | `recording.ask_host_to_confirm_recording` ? | bool | Adds confirmation step. Not useful — AW uses auto-recording. |
| Require phone-only users to press 1 to consent | `recording.phone_consent_required` ? | bool | Phone-specific. Not applicable. |
| Multiple notifications for phone users | `recording.multiple_phone_notifications` ? | bool | Phone-specific. Not applicable. |

---

### Tab: Recording → Data Retention

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Delete cloud recordings after N days | `recording.auto_delete_cmr` | bool | Auto-purge recordings. **Very relevant** — AW hosts storing recordings in Zoom cloud should know about this. Could expose as a warning or default. |
| Auto-delete days | `recording.auto_delete_cmr_days` | int | 1–150 days. Companion to above. |
| Delete transcripts after N days | `recording.auto_delete_transcripts` ? | bool | AI Companion transcript retention. |
| Auto-delete transcript days | `recording.auto_delete_transcript_days` ? | int | Companion to above. |

---

### Tab: Mail & Calendar → Integrations

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Calendar and contacts integration (Google/Exchange/O365) | `integration.calendar_type` ? | enum | Links Zoom to external calendar. Not an AW-managed setting — user configures this in their own Zoom profile. |
| Authentication expiry email alerts | `integration.auth_expiry_alert` ? | bool | Zoom-to-calendar auth. Not AW-relevant. |
| Insert link to meeting insights in meeting invitation | `integration.add_insights_link_to_invite` ? | bool | AI Companion link in calendar invite. Low priority. |

#### Sub-tab: Data sync

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Bidirectional sync for Zoom meeting data | `integration.bidirectional_sync` ? | bool | Syncs Zoom ↔ calendar. Not AW-relevant — AW is its own scheduling layer. |
| Show invited Zoom meetings without linked third-party calendar | `integration.show_unlinked_meetings` ? | bool | Zoom Calendar UI setting. Not AW-relevant. |
| Hide meeting invites from external users | `integration.hide_external_invites` ? | bool | Not relevant. |

---

### Tab: Audio Conferencing

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Show international numbers link on invitation email | `audio_conferencing.show_international_numbers` ? | bool | Adds dial-in numbers to invite email. Some AW hosts have international members — worth enabling by default. |
| Toll Call — included countries | `audio_conferencing.toll_call_countries` ? | array | Which country dial-in numbers appear in invite. Account-level, not per-meeting. Not worth surfacing in AW. |
| 3rd Party Audio | `audio_conferencing.third_party_audio` ? | bool | Custom audio provider. Niche. Not applicable. |
| Mask phone number in participant list | `audio_conferencing.mask_phone_number` | bool | Privacy for dial-in participants. Could be worth defaulting to on for AW. |
| Global Dial-in Countries/Regions | `audio_conferencing.global_dial_in_countries` ? | array | Adds dial-in numbers from selected regions to email invites. Account-level. Not per-meeting. |

---

### Tab: Zoom Apps → General

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Zoom Apps Quick Launch Button | `zoom_apps.show_quick_launch_button` ? | bool | Shows "Zoom Apps" button in Zoom UI. Not AW-relevant — Zoom's own app marketplace. |
| Enable Developer Mode on mobile clients | `zoom_apps.developer_mode` ? | bool | Locked by admin. Dev tooling. Not applicable. |

#### Sub-tab: Meeting

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Share realtime meeting content with apps | `zoom_apps.allow_realtime_share` ? | bool | Allows third-party Zoom Apps to access live audio/video. Niche. Not relevant to AW. |
| Auto-start apps that access shared realtime content | `zoom_apps.auto_start_apps` ? | bool | Sub-setting of above. |

#### Sub-tab: Webinar

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Share realtime webinar content with apps | `zoom_apps.webinar_realtime_share` ? | bool | Webinar-specific. AW does not use webinars. Not applicable. |

---

### Tab: Whiteboard

#### Sub-tab: In-meeting Whiteboard

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Enable In-Meeting Whiteboard | `in_meeting.whiteboard` | bool | Master toggle for whiteboard during meetings. Worth exposing — relevant for AW coaching/workshop use cases. |
| Allow whiteboards to be saved to cloud | `whiteboard.allow_save_to_cloud` ? | bool | Saves whiteboard after meeting. Useful for AW hosts who use whiteboards in sessions. |
| Allow export/duplication/templatization | `whiteboard.allow_export` ? | bool | PDF/PNG/CSV export. Useful but minor. |
| Allow participants to share whiteboard | `whiteboard.allow_participant_share` ? | bool | Participant-originated whiteboard sharing. Some AW hosts may want host-only. |
| Who can start sharing when someone else is sharing (whiteboard) | `whiteboard.who_can_share_when_someone_is_sharing` ? | enum | Secondary share control for whiteboard. Minor. |
| Who can initiate new whiteboards | `whiteboard.who_can_initiate` ? | enum: `host` / `account_users` / `all` | Important for AW — probably want host-only in structured sessions. |
| Allow commenters/viewers to facilitate | `whiteboard.commenters_can_facilitate` ? | bool | Timer, laser pointer, etc. Sub-feature. |

#### Sub-tab: Out-of-Meeting Whiteboard

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Enable Out-of-Meeting Whiteboard | `whiteboard.out_of_meeting` ? | bool | Zoom's standalone whiteboard product. Not related to AW's meeting flow. |
| Allow whiteboards to be saved to cloud (out-of-meeting) | `whiteboard.out_of_meeting_save_to_cloud` ? | bool | Same as above. |
| Allow export, duplication, templatization (out-of-meeting) | `whiteboard.out_of_meeting_export` ? | bool | Same pattern. |

#### Sub-tab: Whiteboard Collaboration

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Allow in-meeting collaboration on whiteboards | `whiteboard.in_meeting_collaboration` ? | bool | Grants temporary access to shared whiteboards. Worth enabling for AW. |
| Who can temporarily collaborate (in meeting) | `whiteboard.in_meeting_collaboration_scope` ? | enum | Account users / specified domains / all. AW's participants are external — needs "all" or collaboration is blocked. |

#### Sub-tab: Whiteboard Sharing Defaults

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Default Access Level | `whiteboard.default_access_level` ? | enum: `invited_only` / `account_users` / `anyone` | Who can access whiteboards by link. For AW external participants, needs "anyone" or they're locked out. |

#### Sub-tab: Whiteboard Retention

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Auto-delete specified whiteboards | `whiteboard.auto_delete` ? | bool | Purge old whiteboards after N days. Not a per-meeting setting. |

#### Sub-tab: Whiteboard Integrations

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Embedding whiteboard in 3rd party applications | `whiteboard.allow_embedding` ? | bool | iframe embed. Interesting for AW — could embed a whiteboard directly in the AW platform UI. Worth noting. |
| Search and add images from Pexels | `whiteboard.pexels_integration` ? | bool | Third-party image library. Minor. |

#### Sub-tab: Other Settings

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Allow users to comment on whiteboards | `whiteboard.allow_comments` ? | bool | Commenting on whiteboards. Minor. |
| Allow users to upload files to whiteboards | `whiteboard.allow_file_upload` ? | bool | File attachment to whiteboard. Minor. |
| Who can upload | `whiteboard.upload_permission` ? | enum | Anyone / account users only. |
| Allow users to download uploaded files | `whiteboard.allow_file_download` ? | bool | Sub-setting. Minor. |
| Show disclaimer when creating or opening a whiteboard | `whiteboard.show_disclaimer` ? | bool | Custom legal notice. Similar to meeting disclaimer — relevant for regulated-industry AW accounts. |

---

### Tab: Notes

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Enable My notes | `notes.enable_my_notes` ? | bool | AI Companion-powered personal notes. Covered in AI Companion SDD. |
| Enable email notifications for My notes | `notes.email_notifications` ? | bool | Not AW-relevant. |
| Allow participants to transcribe meetings with My notes | `notes.allow_participant_transcribe` ? | bool | Same as in-meeting advanced setting. Defer to AI Companion SDD. |
| My notes retention / deletion policy | `notes.auto_delete_days` ? | int | Data retention. Not AW-managed. |

---

### Tab: AI Docs

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Enable Zoom Docs in meetings | `ai_docs.enable_in_meeting` ? | bool | Zoom's document product. Not related to AW's content delivery model. |
| Enable Zoom Docs out-of-meeting | `ai_docs.enable_out_of_meeting` ? | bool | Same — standalone doc product. |
| Default Access Level (docs) | `ai_docs.default_access_level` ? | enum | Who can view docs by link. Not applicable to AW. |
| Docs retention / deletion policy | `ai_docs.auto_delete_days` ? | int | Data retention for Zoom Docs. Not AW-managed. |

---

### Tab: Tasks

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Enable Zoom Tasks | `tasks.enable` ? | bool | Zoom's internal task management product. No relevance to AW. |
| Email/chat notification when assigned a task | `tasks.assignment_notifications` ? | bool | Same — internal Zoom product. |

---

### Tab: Clips → General

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Create Clips | `clips.create_clips` ? | bool | Enables Zoom Clips (async video recording product). Not related to AW's meeting recording. Different product. |

#### Sub-tab: In-meeting clips

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Enable Zoom Clips in meetings | `clips.in_meeting_clips` ? | bool | Allow clips to be played during meetings. Minor. |

#### Sub-tab: Sharing

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Shareable link access default (clips/playlists) | `clips.default_share_access` ? | enum: `anyone` / `account_users` / `invited_only` | Clips sharing default. Not meeting-related. |
| Require guests to register email before viewing | `clips.require_guest_email` ? | bool | Lead capture for Clips. Interesting as a concept for AW's content delivery — but this is Zoom Clips, not meeting recordings. |
| Require passcode to access shared clips | `clips.require_passcode` ? | bool | Clips passcode. Not meeting recordings. |

#### Sub-tab: Data Retention

| Setting Name | API Field | Type | Notes |
|---|---|---|---|
| Auto-delete clips after N days | `clips.auto_delete_days` ? | int | Clips retention. Not related to AW's meeting recordings. |

---

### Summary of Settings Already Exposed in AttractWell

For reference — these are confirmed already in the AW meeting create/edit form:

| Setting | Zoom API Field |
|---|---|
| Waiting room | `in_meeting.waiting_room` |
| Mute on entry | `schedule_meeting.mute_upon_entry` |
| Host video | `schedule_meeting.host_video` |
| Participant video | `schedule_meeting.participant_video` |
| Join before host | `schedule_meeting.join_before_host` |
| Auto-recording | `recording.auto_recording` |
| Focus mode | `in_meeting.focus_mode` |

---

## OAuth Scopes — Current State (confirmed March 2026)

Scopes are managed on the Server-to-Server OAuth app at `marketplace.zoom.us` by Greg.

### Available scopes (added and working):
| Scope | What it enables | Status |
|-------|----------------|--------|
| `meeting:read:admin` | Read meeting data, polls (via `past_meetings/`), attendance, cloud recordings, transcripts | Working |
| `meeting:write:admin` | Create/update/delete meetings, polls CRUD | Working |
| `meeting_summary:read:admin` | AI Companion meeting summaries | Added March 2026 |
| `report:read:admin` | Q&A reports, attendance via report endpoint | Added March 2026 |
| `account:read:admin` | Read account-level settings (covers `account:read:settings`) | Already existed |
| `account:write:admin` | Update account-level settings, AI Companion auto-enable | Already existed |

### Scopes NOT available in Zoom's S2S OAuth (confirmed by Greg):
| Scope | Notes |
|-------|-------|
| `cloud_recording:read` | **Does not exist** as a scope option in Zoom's marketplace. Cloud recording read access appears to work via `meeting:read:admin`. |
| `cloud_recording:write` | **Does not exist** as a scope option. Recording management (trash, delete, sharing) may not be possible, or may require a different app type. |

### Scopes NOT needed (business decision):
| Scope | Reason |
|-------|--------|
| `webinar:read:admin` | AttractWell does not offer webinars. Licensing cost makes it unprofitable (same price as Zoom direct, loses money on CC fees). |
| `webinar:write:admin` | Same as above. |

### Impact on planned features:

| Feature | Scopes needed | Can we build it? |
|---------|--------------|-----------------|
| AI Meeting Summaries | `meeting_summary:read:admin` | **Yes** — scope added |
| Meeting Transcripts | `meeting:read:admin` | **Yes** — already working |
| Smart Recording (AI chapters) | `meeting:read:admin` | **Yes** — data is in recordings API response |
| Q&A Reports | `report:read:admin` | **Yes** — scope added |
| Webhook Receiver | No special scopes (incoming) | **Yes** |
| Post-Meeting Auto-Pipeline | Depends on feature (summaries, recordings, etc.) | **Yes** — all scopes in place |
| Cloud Recording Management (sharing, delete) | `cloud_recording:write` | **No** — scope doesn't exist in Zoom. Read-only access works. |
| Meeting Registration | `meeting:write:admin` | **Yes** — already have it |
| Advanced Meeting Settings | `meeting:write:admin` | **Yes** |
| User Settings Management | `account:read:admin`, `account:write:admin` | **Yes** — already have it |
| Breakout Pre-Assignment | `meeting:write:admin` | **Yes** — part of meeting settings |
| Live Streaming Config | `meeting:write:admin` | **Yes** — part of meeting settings |
| Webinar Support | `webinar:read:admin`, `webinar:write:admin` | **No** — business decision, not offering webinars |
| RTMS (Real-Time Media) | Requires General App (not S2S OAuth) | **No** — different app type needed, not worth it |

**Note:** Zoom migrated to granular scopes in 2024. The scope names above are the classic names confirmed working on our S2S OAuth app. Zoom's marketplace may show granular equivalents.

---

## Database Summary

All new tables live in the `zoom_license` database (same as the existing `zoom_meeting_settings` table).

| Table | Purpose | Section |
|-------|---------|---------|
| `zoom_webhook_log` | Webhook event log for debugging + dedup | 1 |
| `zoom_meeting_summaries` | Cached AI summaries | 2 |
| `zoom_meeting_recordings` | Recording metadata | 2 |
| `zoom_meeting_transcripts` | Full transcript text | 2 |
| `zoom_meeting_attendance` | Cached attendance records | 2 |
| `zoom_meeting_poll_results` | Cached poll results | 2 |
| `zoom_meeting_registrants` | Registration records + join URLs | 4 |

---

## Gotchas Reference (from Deep Dive)

1. **Meeting IDs vs UUIDs**: Past meeting endpoints require UUID, not numeric ID. UUIDs containing `/` or `=` must be double URL-encoded.
2. **Webhook deduplication**: Same event can fire multiple times. Deduplicate by `event_id`.
3. **Recording delay**: `recording.completed` can fire minutes to hours after meeting ends.
4. **Transcript requires recording**: Transcripts only exist for cloud-recorded meetings. Meeting Summary is independent and does NOT require cloud recording.
5. **Account-level locks**: User-level PATCH silently succeeds without changing locked settings. Always check locks first.
7. **Rate limits**: Vary by endpoint and plan. Pagination + throttling for heavy operations. Rate limit info in response headers.
8. **OAuth token refresh**: Access tokens expire after 1 hour. Refresh tokens last ~15 years but get rotated — always store the new refresh token.
