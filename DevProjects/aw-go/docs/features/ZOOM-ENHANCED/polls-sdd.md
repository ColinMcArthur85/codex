# Zoom Polls — Software Design Document

## Overview

Admin-only feature to create, edit, and delete meeting polls via the Zoom API, and view poll results after meetings. No local database storage — all data lives in Zoom. Polls persist across recurring meeting occurrences; results are per-occurrence.

## Scope

- **In scope:** Poll CRUD (create, update, delete), list polls on meeting detail page, view poll results per occurrence
- **Out of scope:** CSV export of results, local DB storage, non-admin access, launching polls during meetings (host does this in Zoom app)

## Where This Lives

All poll functionality lives on the **existing meeting detail page** (`/app/conferencing/meetings/{meeting_id}`). No new list pages or tabs are needed. Admins reach past meetings via the existing "All Meetings" view (`/app/conferencing/meetings?type=all`), click into a meeting, and see both poll setup and results on the same page.

This page will eventually also house attendance reports (WISH-411) and AI Companion summaries (Phase 4), making it a single post-meeting dashboard.

## User Flow

### Managing Polls (before the meeting)

1. Admin navigates to a meeting detail page (`/app/conferencing/meetings/{meeting_id}`)
2. New "Polls" section appears below Cloud Recordings (admin-only)
3. Admin clicks "Add Poll" — modal opens with form fields:
   - Poll title
   - Question text
   - Answer options (minimum 2, add/remove dynamically)
   - Anonymous polling toggle (yes/no)
4. On save, poll is created via Zoom API and appears in the list
5. Admin can edit or delete existing polls from the list

### Viewing Results (after the meeting)

1. Admin goes to "All Meetings" (`/app/conferencing/meetings?type=all`) and clicks into a past meeting
2. The same meeting detail page now also shows a "Poll Results" section below the poll setup list
3. Results are fetched from Zoom's reporting API and displayed inline — each question with responses
4. For recurring meetings, results are per-occurrence (admin selects which occurrence)

## Zoom API Endpoints

| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| List polls | GET | `meetings/{meetingId}/polls` | Returns all polls for the meeting |
| Create poll | POST | `meetings/{meetingId}/polls` | Returns created poll with `id` |
| Get poll | GET | `meetings/{meetingId}/polls/{pollId}` | Single poll detail |
| Update poll | PUT | `meetings/{meetingId}/polls/{pollId}` | Full replacement |
| Delete poll | DELETE | `meetings/{meetingId}/polls/{pollId}` | — |
| Get poll results | GET | `report/meetings/{meetingId}/polls` | Results from past meeting instance |

### Example: Create Poll Request Body

```json
{
  "title": "Session Feedback",
  "anonymous": true,
  "questions": [
    {
      "name": "How would you rate this session?",
      "type": "single",
      "answers": ["Excellent", "Good", "Fair", "Poor"]
    }
  ]
}
```

### Example: Poll Results Response

```json
{
  "questions": [
    {
      "name": "How would you rate this session?",
      "question_details": [
        {
          "name": "Jane Smith",
          "email": "jane@example.com",
          "answer": "Excellent"
        }
      ]
    }
  ]
}
```

## Prerequisites

- [ ] Verify OAuth scopes include `meeting:write:admin` and `meeting:read:admin` at marketplace.zoom.us
- [ ] Verify `report:read:admin` scope is present (needed for poll results — same scope as WISH-411 attendance reports)

## Implementation Checklist

### Step 1: Model — Add poll methods to `VideoConferencingClass`

**File:** `oilylife/models/video-conferencing.php`

Add these methods following the existing `sendRequest()` pattern:

```php
public function listMeetingPolls($options)
{
    return $this->sendRequest('meetings/' . $options['meeting_id'] . '/polls');
}

public function createMeetingPoll($options)
{
    return $this->sendRequest('meetings/' . $options['meeting_id'] . '/polls', 'POST', $options['poll_data']);
}

public function updateMeetingPoll($options)
{
    return $this->sendRequest('meetings/' . $options['meeting_id'] . '/polls/' . $options['poll_id'], 'PUT', $options['poll_data']);
}

public function deleteMeetingPoll($options)
{
    return $this->sendRequest('meetings/' . $options['meeting_id'] . '/polls/' . $options['poll_id'], 'DELETE');
}

public function getMeetingPollResults($options)
{
    return $this->sendRequest('report/meetings/' . $options['meeting_id'] . '/polls');
}
```

---

### Step 2: Controller — Add poll actions to shared admin controller

**File:** `oilylife/controllers/admin-meeting-data.php` (new — shared across polls, attendance, AI companion)

This controller serves all admin-only, meeting-scoped AJAX requests. Uses `require-admin.php` for access control.

```php
<?php
chdir('..');
require_once 'lib/account-master-include.php';
require_once 'lib/require-admin.php';
require_once 'models/video-conferencing.php';

$VideoConference = new VideoConferencingClass();
$meeting_id = intval($_GET['meeting_id']);
$poll_id = intval($_GET['poll_id']);
$action = $_GET['action'];

header('Content-Type: application/json');

// --- Poll actions ---
if ($action === 'polls-list') {
    $result = $VideoConference->listMeetingPolls(['meeting_id' => $meeting_id]);
    echo json_encode($result);
}
else if ($action === 'polls-create') {
    $poll_data = json_decode(file_get_contents('php://input'), true);
    $result = $VideoConference->createMeetingPoll(['meeting_id' => $meeting_id, 'poll_data' => $poll_data]);
    echo json_encode($result);
}
else if ($action === 'polls-update') {
    $poll_data = json_decode(file_get_contents('php://input'), true);
    $result = $VideoConference->updateMeetingPoll(['meeting_id' => $meeting_id, 'poll_id' => $poll_id, 'poll_data' => $poll_data]);
    echo json_encode($result);
}
else if ($action === 'polls-delete') {
    $result = $VideoConference->deleteMeetingPoll(['meeting_id' => $meeting_id, 'poll_id' => $poll_id]);
    echo json_encode($result);
}
else if ($action === 'polls-results') {
    $result = $VideoConference->getMeetingPollResults(['meeting_id' => $meeting_id]);
    echo json_encode($result);
}

// --- Attendance actions (see attendance-sdd.md) ---
// else if ($action === 'attendance') { ... }
// else if ($action === 'attendance-csv') { ... }

// --- AI Companion actions (see ai-companion-sdd.md) ---
// else if ($action === 'ai-summary') { ... }
```

---

### Step 3: View — Add Polls section to meeting detail page

**File:** `oilylife/views/account/video-conferencing-meetings-view.html.php`

Insert a new "Polls" section after the Cloud Recordings block (after line 113) and before the When/Duration section. This section is only rendered for admins.

**UI Elements:**

1. **Section header:** "Polls" with an "Add Poll" button (button-leaf style)
2. **Poll list:** Table or card layout showing each poll's title and question count
   - Each row has Edit and Delete buttons (button-white button-light, button-mini)
3. **Empty state:** "No polls have been created for this meeting."
4. **Results section:** Below the poll list, a "View Poll Results" button (only shown for past meetings)
   - Expands to show results inline — each question with a summary of responses

**Add Poll Modal** (Bootstrap modal, following `SendMailModal` pattern):
- Poll title (text input)
- Anonymous toggle (checkbox)
- Questions section:
  - Question text (text input)
  - Question type: single choice or multiple choice (radio toggle)
  - Answer options (text inputs, min 2, "Add Answer" button to add more, X to remove)
  - "Add Question" button to add additional questions
- Save / Cancel buttons

**Poll Results Display** (inline expandable section):
- For each poll question:
  - Question text as header
  - Table: Respondent name, email, answer (or "Anonymous" if anonymous poll)
  - Summary count per answer option

---

### Step 4: JavaScript — Poll CRUD and results fetch

**Location:** Inline `<script>` block within the view file (following existing patterns in the codebase)

**Functions needed:**

```javascript
/* <?php // Poll management functions ?> */

function loadPolls(meetingId) {
    // GET to admin-meeting-data.php?meeting_id={id}&action=list
    // Populate polls table/list on success
}

function savePoll(meetingId, pollId) {
    // Collect form data from modal
    // POST (create) or PUT (update) to admin-meeting-data.php
    // Reload polls list on success
}

function deletePoll(meetingId, pollId) {
    // Confirm with user
    // DELETE to admin-meeting-data.php
    // Reload polls list on success
}

function loadPollResults(meetingId) {
    // GET to admin-meeting-data.php?meeting_id={id}&action=results
    // Render results inline
}
```

---

### Step 5: Admin access check in view

The polls section should only render if the current user is an admin. Use the same admin check pattern used elsewhere in the codebase to conditionally show the Polls section.

## Files

| File | Action |
|------|--------|
| `oilylife/models/video-conferencing.php` | Add 5 poll methods |
| `oilylife/controllers/admin-meeting-data.php` | **New** — admin-only poll AJAX controller |
| `oilylife/views/account/video-conferencing-meetings-view.html.php` | Add Polls section + modal + inline results |

## Limitations

- **Host must launch polls in Zoom** — the API cannot trigger a poll during a live meeting. The UI should make this clear to the admin.
- **6-month retention** — poll results are only available via Zoom's reporting API for 6 months after the meeting.
- **Rate limits** — Zoom reporting API is limited to ~1 request/second. Not an issue for single-meeting views but worth noting.
- **Poll question limits** — Zoom limits meetings to 25 polls, each with up to 10 questions.

## Verification

- [ ] Admin can see the Polls section on a meeting detail page
- [ ] Non-admin users do NOT see the Polls section
- [ ] Create a poll with single-choice question — verify it appears in Zoom
- [ ] Create a poll with multiple-choice question — verify it appears in Zoom
- [ ] Edit an existing poll — verify changes reflect in Zoom
- [ ] Delete a poll — verify it's removed from Zoom
- [ ] View poll results for a past meeting with completed polls
- [ ] Verify empty state when no polls exist
- [ ] Verify empty state when no poll results exist (meeting hasn't happened yet)
- [ ] Test with recurring meeting — polls persist across occurrences
