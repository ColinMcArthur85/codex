# Zoom AI Companion — Software Design Document

## Overview

Admin-only features to display Zoom AI Companion data on the existing meeting detail page. Three read-only integrations — fetch and display, no CRUD. All data lives in Zoom.

1. **Meeting Summaries** — AI-generated summary, action items, and next steps *(already implemented)*
2. **Meeting Transcripts** — Full speaker-attributed transcript of the meeting audio
3. **Smart Recording** — AI-generated chapters, highlights, and next steps attached to cloud recordings

## Scope

- **In scope:** Display AI-generated meeting summaries, transcripts, and smart recording data on the meeting detail page (admin-only)
- **Out of scope:** Configuring AI Companion settings, AI Companion panel archive, real-time captions, in-meeting AI questions, local storage of transcripts/recordings, emailing summaries to attendees

## Where This Lives

On the **existing meeting detail page** (`/app/conferencing/meetings/{meeting_id}`), within the admin-only tabbed section that already contains AI Summary, Attendance, and Polls.

- **Meeting Summary** — existing "AI Summary" tab *(already implemented)*
- **Meeting Transcript** — new "Transcript" tab
- **Smart Recording** — enhances the existing cloud recordings section with AI chapter markers and summary data

## Zoom API Endpoints

| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| Get meeting summary | GET | `meetings/{meetingId}/meeting_summary` | AI-generated summary, action items, next steps. **Already implemented.** |
| Get cloud recordings | GET | `meetings/{meetingId}/recordings` | Returns recording files including transcript (VTT) and smart recording data. **Already implemented** (basic download only). |

### What's new vs. what already exists

The existing `getMeetingCloudRecordings()` method already calls `meetings/{id}/recordings`. The response from this endpoint already contains:
- Recording files (video, audio, chat) — **currently displayed as download links**
- Transcript files (VTT format) — **not currently surfaced in the UI**
- Smart recording data (timeline/chapters) — **not currently surfaced in the UI**

No new Zoom API endpoints are needed. The new features extract additional data from responses we're already fetching.

---

## Feature 1: Meeting Summaries *(Already Implemented)*

### Status: COMPLETE

Meeting summaries are already fully integrated:
- **Model:** `getMeetingSummary()` in `oilylife/models/video-conferencing.php`
- **Controller:** `ai-summary` action in `oilylife/controllers/admin-meeting-data.php`
- **View:** "AI Summary" tab in `oilylife/views/account/video-conferencing-meetings-view.html.php`

### Example Response (for reference)

```json
{
  "meeting_host_id": "abc123",
  "meeting_host_email": "host@example.com",
  "meeting_id": 12345678,
  "meeting_topic": "Weekly Team Sync",
  "meeting_start_time": "2024-03-15T14:00:00Z",
  "meeting_end_time": "2024-03-15T15:00:00Z",
  "summary": {
    "summary_overview": "The team discussed Q1 results and planning for Q2...",
    "summary_details": [
      {
        "label": "Action Items",
        "summary": "1. Jane to send updated report by Friday\n2. Bob to schedule follow-up with client"
      },
      {
        "label": "Next Steps",
        "summary": "1. Review Q2 budget proposal\n2. Finalize hiring plan"
      }
    ]
  }
}
```

---

## Feature 2: Meeting Transcripts

### What It Does

Displays the full speaker-attributed transcript of a past meeting. Zoom automatically generates transcripts when cloud recording is enabled with audio transcript turned on. The transcript is returned as a VTT (Web Video Text Tracks) file within the recordings API response.

### User Flow

1. Admin views a past meeting's detail page
2. Clicks the "Transcript" tab (admin-only)
3. Sees the full meeting transcript with speaker names and timestamps
4. Can download the transcript as a text file
5. If no transcript is available, sees "No transcript available for this meeting."

### How the Transcript Is Retrieved

The existing `getMeetingCloudRecordings()` endpoint (`GET meetings/{meetingId}/recordings`) returns an array of `recording_files`. Each file has a `recording_type` field. Transcript files have:

```json
{
  "recording_type": "audio_transcript",
  "file_type": "VTT",
  "download_url": "https://zoom.us/rec/download/...",
  "status": "completed"
}
```

The VTT file content looks like:

```
WEBVTT

1
00:00:05.000 --> 00:00:12.000
Jane Smith: Good morning everyone, let's start with Q1 results.

2
00:00:12.500 --> 00:00:20.000
Bob Jones: Sure, the main highlights are...
```

### Implementation Checklist

#### Step 1: Controller — Add transcript action

**File:** `oilylife/controllers/admin-meeting-data.php`

```php
else if ($action === 'transcript') {
    // Get recordings (already fetched elsewhere, reuse pattern)
    $recordings = $VideoConference->getMeetingCloudRecordings([
        'id' => $meeting_id,
        'host_id' => $host_id
    ]);

    if ($recordings->success && isset($recordings->results->recording_files)) {
        $transcript_file = null;
        foreach ($recordings->results->recording_files as $file) {
            if ($file->recording_type === 'audio_transcript') {
                $transcript_file = $file;
                break;
            }
        }

        if ($transcript_file) {
            // Fetch the VTT content from Zoom
            $vtt_url = $transcript_file->download_url . '?access_token=' . $VideoConference->GetDownloadAccessToken();
            $vtt_content = file_get_contents($vtt_url);
            echo json_encode(['success' => true, 'transcript' => $vtt_content, 'download_url' => $transcript_file->download_url]);
        } else {
            echo json_encode(['success' => true, 'transcript' => null]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Could not retrieve recordings.']);
    }
}
```

> **Note:** The approach of fetching the VTT content server-side avoids exposing the Zoom access token to the browser. Alternatively, we could just pass the download URL and let the browser fetch it, but server-side is cleaner for parsing.

#### Step 2: View — Add Transcript tab

**File:** `oilylife/views/account/video-conferencing-meetings-view.html.php`

Add a "Transcript" tab to the admin-only tab bar and tab content area.

**UI Elements:**

1. **Tab:** "Transcript" in the `#meeting-data-tabs` nav
2. **Transcript content** — parsed VTT rendered as speaker-attributed lines with timestamps
3. **Download button** — "Download Transcript" button to download the raw VTT or plain text
4. **Empty state:** "No transcript available for this meeting."
5. **Loading state:** Spinner while fetching

**VTT Parsing (JavaScript):**

```javascript
function parseVTT(vttContent) {
    // Strip the "WEBVTT" header
    // Split into cue blocks (separated by blank lines)
    // For each cue, extract:
    //   - timestamp line (HH:MM:SS.mmm --> HH:MM:SS.mmm)
    //   - speaker + text line ("Speaker Name: text content")
    // Return array of { timestamp, speaker, text }
}
```

Display as a scrollable list with speaker names bolded and timestamps as subtle labels.

#### Step 3: JavaScript — Transcript fetch

```javascript
function loadTranscript(meetingId) {
    // GET to admin-meeting-data.php?meeting_id={id}&action=transcript&host_id={host_id}
    // On success:
    //   - Parse VTT content into structured transcript
    //   - Render speaker-attributed lines with timestamps
    //   - Show download button
    // On empty/error: show "No transcript available" message
}
```

---

## Feature 3: Smart Recording

### What It Does

Enhances the existing cloud recordings display with AI-generated data from Zoom's Smart Recording feature. When Smart Recording is enabled, Zoom's recordings API response includes additional data beyond the basic recording files:

- **Smart Chapters** — AI-generated topic segments with titles and timestamps, allowing users to jump to specific parts of a recording
- **Summary** — A brief AI summary attached to the recording itself (separate from the meeting summary)
- **Next Steps** — Action items extracted from the recording
- **Meeting Coach** — Speaking pace, talk-time ratio, and other coaching metrics

### How Smart Recording Data Is Retrieved

The existing `getMeetingCloudRecordings()` endpoint already returns this data when Smart Recording is enabled. The response includes additional fields:

```json
{
  "recording_files": [...],
  "recording_play_passcode": "...",
  "summary": {
    "summary_overview": "Discussion of quarterly goals...",
    "summary_details": [
      { "label": "Next Steps", "summary": "1. Review budget\n2. Send proposal" }
    ],
    "smart_chapters": [
      {
        "title": "Q1 Review",
        "start_time": "00:00:30",
        "end_time": "00:15:45"
      },
      {
        "title": "Q2 Planning",
        "start_time": "00:15:46",
        "end_time": "00:32:00"
      }
    ]
  }
}
```

> **Note:** The exact response structure for smart recording data should be verified against Zoom's current API documentation at implementation time. Smart Recording fields may be nested differently or have additional properties.

### User Flow

1. Admin views a past meeting with cloud recordings
2. The existing recordings table now shows additional columns/sections:
   - **Smart Chapters** — clickable chapter titles with timestamps (if available)
   - **Recording Summary** — brief AI summary below the recordings table
3. If Smart Recording data is not available, the recordings section displays as it does today (no change)

### Implementation Checklist

#### Step 1: Controller — Add smart-recording action

**File:** `oilylife/controllers/admin-meeting-data.php`

```php
else if ($action === 'smart-recording') {
    $recordings = $VideoConference->getMeetingCloudRecordings([
        'id' => $meeting_id,
        'host_id' => $host_id
    ]);

    if ($recordings->success) {
        // Extract smart recording data (summary, chapters) from the response
        // The structure may vary — check for summary/smart_chapters at the top level
        echo json_encode([
            'success' => true,
            'summary' => isset($recordings->results->summary) ? $recordings->results->summary : null,
            'recording_files' => isset($recordings->results->recording_files) ? $recordings->results->recording_files : []
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Could not retrieve recording data.']);
    }
}
```

#### Step 2: View — Enhance recordings section

**File:** `oilylife/views/account/video-conferencing-meetings-view.html.php`

Enhance the existing cloud recordings section (currently just a download table) with:

1. **Smart Chapters panel** — displayed below the recordings table when available
   - List of chapter titles with start timestamps
   - Each chapter is a clickable row (future: could link to timestamped playback)
2. **Recording Summary** — displayed below chapters when available
   - Brief AI summary text
   - Next steps list (if present)
3. **Graceful degradation** — if no smart recording data exists, the section looks identical to today

**UI Approach:**

```html
<!-- Below existing recordings table -->
<div id="smart-recording-data" style="display:none; margin-top:15px;">
    <label>Smart Chapters</label>
    <div id="smart-chapters-list">
        <!-- Populated via JS: chapter title + timestamp rows -->
    </div>

    <label style="margin-top:15px;">Recording Summary</label>
    <div id="recording-summary-content">
        <!-- Populated via JS: summary text + next steps -->
    </div>
</div>
```

#### Step 3: JavaScript — Smart recording fetch

```javascript
function loadSmartRecording(meetingId, hostId) {
    // GET to admin-meeting-data.php?meeting_id={id}&action=smart-recording&host_id={host_id}
    // On success:
    //   - If smart chapters exist, render chapter list with timestamps
    //   - If recording summary exists, render summary and next steps
    //   - Show #smart-recording-data container
    // On empty: leave hidden (existing recordings table unchanged)
}
```

---

## Prerequisites

- [x] AI Companion must be enabled on the Zoom account — *auto-enabled via `updateAiCompanionSetting()` in `getHostId()`*
- [x] OAuth scopes include `meeting:read:admin` — *already configured*
- [x] `meeting_summary:read:admin` scope added — *Greg added March 2026*
- [x] Cloud recording with audio transcript enabled — *`recording_audio_transcript: true` confirmed in account settings*
- [ ] Smart Recording must be enabled in Zoom account settings for smart chapters/recording summary
- [x] Zoom plan includes AI Companion features — *confirmed working*

## Files

| File | Action |
|------|--------|
| `oilylife/models/video-conferencing.php` | No changes needed — existing methods cover all endpoints |
| `oilylife/controllers/admin-meeting-data.php` | Add `transcript` and `smart-recording` actions |
| `oilylife/views/account/video-conferencing-meetings-view.html.php` | Add Transcript tab; enhance recordings section with smart recording data |

## Limitations

- **Requires AI Companion to be enabled** — if the Zoom account doesn't have AI Companion active, no summary data will be available. Features degrade gracefully (empty states).
- **Transcripts require cloud recording** — transcripts are only generated when cloud recording with audio transcript is turned on. Local recordings do not produce API-accessible transcripts.
- **Smart Recording is account-level** — Smart Recording must be enabled in the Zoom account admin settings. If disabled, no smart chapters or recording summary will be returned.
- **Not available for all meetings** — AI Companion may not generate data for very short meetings or meetings where it was explicitly disabled by the host.
- **API response structure may vary** — Zoom's AI Companion and Smart Recording APIs are relatively new. Response structures should be verified at implementation time and may require adjustments.
- **6-month retention** — subject to Zoom data retention limits. Transcripts and recordings may be deleted after the account's retention period.
- **10-day cloud recording auto-delete** — the existing recordings display already warns about this. Transcripts tied to recordings may also be deleted.
- **VTT parsing** — transcript quality depends on Zoom's speech-to-text accuracy. Speaker attribution may not always be correct.

## API Features NOT Included (No API Access)

These Zoom AI Companion features exist but are **not accessible via API** and cannot be integrated:

- Real-time meeting questions / "catch me up"
- Live captions and translated captions (46 languages)
- AI Companion 3.0 web surface (ai.zoom.us)
- My Notes (AI-enriched personal notes)
- Personal workflows / agentic follow-up features
- Cross-meeting analysis
- "Prepare me for a meeting" / "Free up my time"
- Custom AI Companion agents (enterprise-tier)

## Verification

### Meeting Summaries *(already implemented)*
- [x] Admin can see AI Summary tab on a past meeting's detail page
- [x] Non-admin users do NOT see the AI Summary tab
- [x] Summary, action items, and next steps display correctly when available
- [x] Empty state displays when AI Companion data is not available

### Meeting Transcripts
- [ ] "Transcript" tab appears in admin-only tab section
- [ ] Non-admin users do NOT see the Transcript tab
- [ ] Full transcript displays with speaker names and timestamps
- [ ] Transcript is scrollable for long meetings
- [ ] "Download Transcript" button works and downloads the transcript
- [ ] Empty state displays when no transcript is available
- [ ] Section handles API errors gracefully

### Smart Recording
- [ ] Smart chapters display below the recordings table when available
- [ ] Chapter titles and timestamps render correctly
- [ ] Recording summary displays when available
- [ ] Next steps from recording display when available
- [ ] No visual change when smart recording data is not available (graceful degradation)
- [ ] Section handles API errors gracefully
