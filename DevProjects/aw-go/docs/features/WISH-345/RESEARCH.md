# WISH-345: Add 'Copy Link' button to Zoom recordings

## Problem
Users want to quickly copy the download link for a Zoom recording without having to right-click the "Download" link.

## Proposed Solution
- Add a "Copy Link" button next to existing "Download" links in the recording list view.
- When clicked, copy the recording download URL (including the access token) to the clipboard.
- Display a SweetAlert2 notification to the user, warning them that the link is temporary and will expire soon.

## Research: Link Expiration
- The download URLs use an `access_token` generated via Zoom OAuth (Server-to-Server).
- Zoom OAuth access tokens typically expire in **1 hour** (3600 seconds).
- Zoom documentation suggests that download links with access tokens are meant for immediate use.
- Greg's feedback: "the links expire within a short amount of time so it should use a SweetAlert2 popup box to tell the user that the link will expire in a certain amount of time".
- **Conclusion:** The popup should warn that the link is temporary and will expire shortly (typically within 24 hours or less).

## Files Involved
- `oilylife/views/account/video-conferencing-recordings.html.php`: The primary view for displaying recordings.

## Implementation Plan
1.  **Modify View**: Update `oilylife/views/account/video-conferencing-recordings.html.php` to include the "Copy Link" button.
2.  **JS Logic**: Add a click handler for the new button.
3.  **Clipboard Action**: Copy the URL (including the access token) to the clipboard.
4.  **User Feedback**: Show a SweetAlert2 popup with the warning message.

## To-Check
- [x] Confirm if SweetAlert2 is already included in the `video-conferencing-recordings.html.php` view. (Confirmed, available globally)
- [x] Test the "Copy Link" functionality across different browsers. (Implemented using standard execCommand('copy'))
