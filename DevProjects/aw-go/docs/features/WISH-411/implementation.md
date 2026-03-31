# WISH-411: Zoom Meeting Attendees Report

## Background

The Zoom docs endpoint for webinar participants (`GET /report/webinars/{webinarId}/participants`) is for **webinars**. This platform uses **meetings** — all webinar functions in `video-conferencing.php` are stubbed out. Zoom has an equivalent endpoint for meetings:

```
GET /v2/report/meetings/{meetingId}/participants
```

Returns: name, email, join_time, leave_time, duration per participant. Paginated (up to 300 per page). Available for last 6 months of past meetings.

Corporate Zoom license qualifies (above Pro). Downloading attendees via Zoom's admin UI confirms access.

## User Flow

1. Hold meeting
2. View attendee report (in-browser table)
3. Download CSV **or** import attendees into contact manager

Similar pattern to the resource bundle claimed report (`resource-sharing-bundle-report.html.php`), which shows a viewable report with a download option.

## Pre-requisite (Manual)

- [ ] Verify/add `report:read:admin` scope on Zoom Server-to-Server OAuth app at https://marketplace.zoom.us -> App -> Scopes

## Implementation Checklist

- [ ] **Step 1:** Add `getParticipantReport()` method to `VideoConferencingClass` in `oilylife/models/video-conferencing.php`
  - Calls `GET report/meetings/{meetingId}/participants?page_size=300`
  - Handles pagination via `next_page_token` (loop until all pages fetched)
  - Returns aggregated array of all participants
  - Follows existing `sendRequest()` + `GetModelSuccess`/`GetModelError` patterns

- [ ] **Step 2:** Create controller at `oilylife/controllers/admin-meeting-attendees.php`
  - Uses `require-admin.php` for admin-only access
  - Accepts meeting ID via `$_GET['meeting_id']`
  - Fetches participant report from model
  - Default mode: render HTML view with in-browser attendee report
  - CSV mode (`$_GET['format'] == 'csv'`): stream CSV download
  - Import mode (POST `action=import_to_contacts`): write attendees to `contact_import_temp` table and redirect to step 2 of contact import

- [ ] **Step 3:** Create view at `oilylife/views/account/admin-meeting-attendees.html.php`
  - In-browser report table with columns: Name, Email, Join Time, Leave Time, Duration
  - "Download CSV" button linking to same page with `?format=csv`
  - "Import to Contact Manager" button that POSTs attendee data to the import flow
  - Bootstrap 3 table styling, existing button conventions
  - Empty state if no participants found

- [ ] **Step 4:** Import-to-contacts integration
  - On "Import to Contact Manager" action, format attendee data (name, email) as array matching the contact import format
  - Write to `contact_import_temp` via `ContactsModel->AddTemporaryContactImport()`
  - Redirect user to `/app/contacts/import/review` (step 2 of import -- the field mapping screen)
  - Reference: see contact import code in `controllers/contacts.php` (lines ~2990-3067) and `models/contacts.php` `AddTemporaryContactImport()` method

- [ ] **Step 5:** Add navigation to admin area
  - Add "Meeting Attendees" link to admin tools menu in `views/account/admin-tools.html.php`

## Files

| File | Action |
|------|--------|
| `oilylife/models/video-conferencing.php` | Add `getParticipantReport()` method |
| `oilylife/controllers/admin-meeting-attendees.php` | **New** -- controller |
| `oilylife/views/account/admin-meeting-attendees.html.php` | **New** -- in-browser attendees report view |
| `oilylife/views/account/admin-tools.html.php` | Add menu item |

## Verification

- [ ] Navigate to admin attendees page, enter a known past meeting ID
- [ ] Verify participant list displays correctly in-browser
- [ ] Test CSV download
- [ ] Test "Import to Contact Manager" -- should land on contact import step 2 (field mapping) with attendee data pre-loaded
- [ ] Test with meeting that has no participants (empty state)
- [ ] Test with non-admin user (should redirect to home)
- [ ] Test pagination with meeting with many attendees
