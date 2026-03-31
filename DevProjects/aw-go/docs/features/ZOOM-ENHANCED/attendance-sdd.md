# Zoom Attendance Reports — Software Design Document

## Overview

Admin-only feature to view meeting attendance data on the existing meeting detail page. Shows who attended, when they joined/left, and for how long. No local database storage — all data fetched live from Zoom's reporting API. Includes CSV download and import-to-contacts.

This replaces the standalone admin page approach from the original WISH-411 spec. Instead, attendance data lives on the meeting detail page alongside polls and (eventually) AI Companion summaries.

## Scope

- **In scope:** Attendance report on meeting detail page (admin-only), CSV download, import to contact manager
- **Out of scope:** Local DB caching, non-admin access, real-time attendance during live meetings

## Where This Lives

On the **existing meeting detail page** (`/app/conferencing/meetings/{meeting_id}`), as a new "Attendance" section visible only to admins. Admins reach past meetings via "All Meetings" (`/app/conferencing/meetings?type=all`).

## User Flow

1. Admin goes to "All Meetings" and clicks into a past meeting
2. "Attendance" section shows a table: Name, Email, Join Time, Leave Time, Duration
3. Admin can click "Download CSV" to export the data
4. Admin can click "Import to Contact Manager" to push attendees into the contact import flow
5. If the meeting hasn't happened yet, the section shows "Attendance data will be available after the meeting ends."

## Zoom API Endpoint

| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| Get participants | GET | `report/meetings/{meetingId}/participants?page_size=300` | Paginated via `next_page_token`. Available for 6 months. |

### Example Response

```json
{
  "page_size": 300,
  "next_page_token": "",
  "participants": [
    {
      "name": "Jane Smith",
      "user_email": "jane@example.com",
      "join_time": "2024-03-15T14:00:00Z",
      "leave_time": "2024-03-15T15:02:00Z",
      "duration": 3720
    }
  ]
}
```

## Prerequisites

- [ ] Add `report:read:admin` scope on Zoom OAuth app at marketplace.zoom.us (shared with polls results)

## Implementation Checklist

### Step 1: Model — Add participant report method

**File:** `oilylife/models/video-conferencing.php`

```php
public function getParticipantReport($options)
{
    $endpoint = 'report/meetings/' . $options['meeting_id'] . '/participants?page_size=300';
    $all_participants = [];
    $next_page_token = '';

    do {
        $url = $endpoint . ($next_page_token !== '' ? '&next_page_token=' . $next_page_token : '');
        $result = $this->sendRequest($url);

        if (!$result->success) {
            return $result;
        }

        $all_participants = array_merge($all_participants, $result->results->participants);
        $next_page_token = $result->results->next_page_token;
    } while ($next_page_token !== '');

    return GetModelSuccess($all_participants);
}
```

Handles pagination — loops until all pages are fetched.

---

### Step 2: Controller — Add attendance actions

**File:** `oilylife/controllers/admin-meeting-polls.php`

> **Note:** Rename this controller to `admin-meeting-data.php` since it will serve polls, attendance, and eventually AI Companion data. All share the same admin-only, meeting-scoped, JSON-response pattern.

Add actions:

```php
else if ($action === 'attendance') {
    $result = $VideoConference->getParticipantReport(['meeting_id' => $meeting_id]);
    echo json_encode($result);
}
else if ($action === 'attendance-csv') {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="attendance-' . $meeting_id . '.csv"');

    $result = $VideoConference->getParticipantReport(['meeting_id' => $meeting_id]);
    if ($result->success) {
        $out = fopen('php://output', 'w');
        fputcsv($out, ['Name', 'Email', 'Join Time', 'Leave Time', 'Duration (seconds)']);
        foreach ($result->results as $p) {
            fputcsv($out, [$p->name, $p->user_email, $p->join_time, $p->leave_time, $p->duration]);
        }
        fclose($out);
    }
    die;
}
else if ($action === 'attendance-import') {
    // Format attendees for contact import, write to contact_import_temp, redirect to import review
    // See contacts.php AddTemporaryContactImport() for the pattern
}
```

---

### Step 3: View — Add Attendance section to meeting detail page

**File:** `oilylife/views/account/video-conferencing-meetings-view.html.php`

Insert "Attendance" section on the meeting detail page (admin-only, after Cloud Recordings). Loaded via AJAX on page load.

**UI Elements:**

1. **Section header:** "Attendance"
2. **Table:** Name, Email, Join Time, Leave Time, Duration — Bootstrap `table table-hover` styling
3. **Buttons:** "Download CSV" (button-white button-light) and "Import to Contact Manager" (button-leaf)
4. **Empty state:** "Attendance data will be available after the meeting ends."
5. **Loading state:** Spinner while fetching from Zoom API

---

### Step 4: JavaScript — Attendance fetch, CSV trigger, import trigger

```javascript
function loadAttendance(meetingId) {
    // GET to admin-meeting-data.php?meeting_id={id}&action=attendance
    // Populate attendance table on success
    // Show empty state if no data
}

function downloadAttendanceCsv(meetingId) {
    // Navigate to admin-meeting-data.php?meeting_id={id}&action=attendance-csv
    window.location.href = '/app/admin-meeting-data?meeting_id=' + meetingId + '&action=attendance-csv';
}

function importAttendanceToContacts(meetingId) {
    // POST to admin-meeting-data.php with action=attendance-import
    // On success, redirect to /app/contacts/import/review
}
```

## Files

| File | Action |
|------|--------|
| `oilylife/models/video-conferencing.php` | Add `getParticipantReport()` method with pagination |
| `oilylife/controllers/admin-meeting-data.php` | Add attendance, attendance-csv, attendance-import actions |
| `oilylife/views/account/video-conferencing-meetings-view.html.php` | Add Attendance section |

## Differences from Original WISH-411 Spec

| WISH-411 (original) | This SDD |
|---------------------|----------|
| Standalone admin page at `/app/admin-meeting-attendees` | Section on existing meeting detail page |
| Admin enters meeting ID manually | Admin clicks into meeting from "All Meetings" list |
| Separate controller + view files | Shared `admin-meeting-data.php` controller |
| Navigation via admin tools menu | No admin tools menu entry needed |

The core model method and data flow are the same — just the presentation layer changed.

## Limitations

- **6-month retention** — Zoom reporting API only retains data for 6 months
- **Rate limits** — ~1 req/sec on reporting API; pagination may be slow for very large meetings
- **Duplicate entries** — If an attendee leaves and rejoins, they appear as multiple rows (Zoom's behavior)

## Verification

- [ ] Admin can see attendance section on a past meeting's detail page
- [ ] Non-admin users do NOT see the attendance section
- [ ] Attendance table shows correct data (name, email, join/leave times, duration)
- [ ] CSV download works and contains all attendee rows
- [ ] Import to Contact Manager redirects to contact import review with data pre-loaded
- [ ] Empty state displays for meetings that haven't happened yet
- [ ] Pagination works for meetings with 300+ attendees
