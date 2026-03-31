# Zoom Polls, Surveys & Attendance — Proposal for Greg

## Problem Statement

Paul Gatto has requested polls, surveys, and attendance reports for Zoom meetings managed through AttractWell. Because user Zoom accounts are managed sub-accounts, users can't access the Zoom admin portal directly to get this data. This is likely a common need across other AttractWell customers as well.

This document summarizes what the Zoom API can and can't do for each feature, and recommends a phased approach.

## Zoom API Feasibility Summary

| Feature | API Support | What it means |
|---------|-------------|---------------|
| **Attendance Reports** | Excellent | Full participant data (name, email, join/leave times, duration) via `GET /v2/report/meetings/{meetingId}/participants`. Already spec'd as WISH-411. |
| **Polls** | Good | Can create/manage polls in advance via API. Results retrievable after meeting ends. **Limitation:** polls must still be launched by the host during the live meeting in the Zoom app — the API only handles setup and retrieval of results. |
| **Surveys** | Poor | Can configure a post-meeting survey via API, but **cannot retrieve survey response data** through the API. Workaround available (see Phase 3 below). |
| **AI Companion** | Good | Zoom now exposes AI Companion features via API — meeting summaries, action items, and smart recordings. Can retrieve AI-generated summaries and next steps after meetings end. |

## Recommended Phases

### Phase 1 — Attendance Reports

**Status:** Already spec'd in [`WISH-411/implementation.md`](../WISH-411/implementation.md).

**What it does:** Admin view showing meeting participants with name, email, join/leave times, and duration. Includes CSV download and import-to-contacts flow.

**Prerequisites:**
- Add `report:read:admin` OAuth scope to the Zoom app at marketplace.zoom.us

**Effort:** Moderate — model method, new controller, new view, contact import integration.

---

### Phase 2 — Polls

**What it does:** Poll management UI in the meeting detail page. Users create poll questions in advance through AttractWell. After the meeting, poll results are pulled from Zoom and displayed in AttractWell.

**How it works:**
1. User creates poll questions in AttractWell meeting detail page (before the meeting)
2. AttractWell pushes poll config to Zoom via `POST /v2/meetings/{meetingId}/polls`
3. During the live meeting, the **host launches the poll in the Zoom app** (this step cannot be automated)
4. After the meeting, AttractWell retrieves results via `GET /v2/report/meetings/{meetingId}/polls`

**Key limitation:** The host must manually launch each poll during the meeting from within Zoom. The API cannot trigger a poll mid-meeting. Users need to understand this workflow.

**Prerequisites:**
- Verify existing OAuth scopes cover `meeting:write:admin` and `meeting:read:admin` (likely already present)

**Effort:** Moderate-to-high — new poll CRUD UI, API integration for create/list/delete polls, results display.

---

### Phase 3 — Surveys (Workaround)

**What it does:** When attendees leave a Zoom meeting, they're redirected to an AttractWell landing page with a survey/evaluation form.

**Why a workaround?** Zoom's API lets you configure a survey but does **not** expose survey response data. We can't pull results back into AttractWell. Instead, we use Zoom's built-in "third-party survey" redirect feature.

**How it works:**
1. Admin sets a "Post-Meeting Survey URL" in AttractWell's meeting settings
2. AttractWell configures the meeting via `PATCH /v2/meetings/{meetingId}` with `settings.survey_third_party_survey` pointing to an AttractWell landing page
3. When attendees click "Leave Meeting" in Zoom, they're redirected to that AttractWell page
4. Responses are captured by AttractWell's existing form/landing page pipeline — no new survey infrastructure needed

**Key limitation:** The redirect only fires when attendees click "Leave Meeting" in the Zoom client. If someone closes their browser tab or their connection drops, they won't see the survey. This is a Zoom platform limitation.

**Prerequisites:**
- Ensure the Zoom account has the third-party survey feature enabled
- Landing page with form must exist in AttractWell

**Effort:** Low — just a URL field in meeting settings and one API call to configure the redirect.

### Phase 4 — AI Companion (Meeting Summaries & Action Items)

**What it does:** After a meeting ends, display the Zoom AI Companion's meeting summary, action items, and next steps directly in AttractWell's meeting detail page. Gives hosts a quick recap without needing to log into Zoom.

**How it works:**
1. AI Companion must be enabled on the Zoom account (account-level or user-level setting)
2. After a meeting ends, AttractWell retrieves the AI-generated summary via Zoom's AI Companion API
3. Summary, action items, and next steps are displayed in the meeting detail page in AttractWell
4. Optionally, summaries could be emailed to the host or shared with attendees

**What's available via the API:**
- Meeting summary (overview of what was discussed)
- Action items with assignees
- Next steps
- Smart recording highlights/chapters

**Key limitation:** AI Companion must be enabled on the Zoom account — this is an account-level setting that the Zoom admin (AttractWell) would need to enable for sub-users. Also requires a Zoom plan that includes AI Companion features.

**Prerequisites:**
- AI Companion enabled on the Zoom account
- Verify required OAuth scopes for AI Companion endpoints
- Zoom plan that includes AI Companion (included in most paid plans as of 2024)

**Effort:** Low-to-moderate — read-only integration, no CRUD UI needed. Just fetch and display summary data on the meeting detail page.

---

## What Paul Asked For vs What We Can Deliver

| Paul's request | Can we deliver? | How |
|---------------|----------------|-----|
| Attendance/usage reports | **Yes — fully** | Phase 1. Name, email, join/leave times, duration, CSV export, contact import. |
| Polls (set up in advance for recurring meetings) | **Yes — setup & results** | Phase 2. Create polls in advance, view results after. Host must still launch during meeting in Zoom app. |
| Surveys / session evaluations at close | **Partial — via redirect** | Phase 3. Not native Zoom surveys. Attendees see an AttractWell form when they leave the meeting. |
| AI meeting summaries & action items | **Yes — fully** | Phase 4. AI Companion generates summaries automatically; we display them in AttractWell. |

## Prerequisites & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| OAuth scope changes needed | Blocks Phase 1 | Manual step at marketplace.zoom.us — needs to be done before any development |
| 6-month data retention limit | Older meeting data unavailable | Document the limitation; consider caching reports locally |
| Reporting API rate limits (~1 req/sec) | Slow for bulk operations | Pagination + caching; not an issue for single-meeting reports |
| Survey redirect limitation | Some attendees won't see the survey | Set expectations with users; no technical fix available |
| Poll launch requires host action | Can't be fully automated | Clear UX guidance explaining the workflow |
| AI Companion requires account enablement | Won't work if not enabled | Verify AI Companion is active on AttractWell's Zoom account before building |

## Decision Points for Greg

1. **Greenlight Phase 1 (Attendance)?** — Already spec'd, lowest risk, highest value. Recommend starting here.
2. **Greenlight Phase 2 (Polls)?** — Good value but users need to understand the "launch in Zoom" limitation. Worth doing?
3. **Greenlight Phase 3 (Surveys)?** — Low effort workaround but imperfect (redirect-only). Good enough for Paul's use case?
4. **Greenlight Phase 4 (AI Companion)?** — Low effort read-only integration, high perceived value. Depends on Zoom account having AI Companion enabled.
5. **Scope question:** Build for Paul only, or design for all AttractWell customers from the start?
