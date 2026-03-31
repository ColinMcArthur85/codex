# Zoom Settings — Candidate Review for AttractWell

**Purpose:** Settings from the Zoom web UI audit (Section 13) that could add real value to AttractWell. Items marked "not applicable" (phone-only, hardware, Zoom-internal products, enterprise-only) have been removed.

**Already exposed in AW (for reference):** waiting room, mute on entry, host video, participant video, join before host, auto-recording, focus mode.

---

## Security & Access

| Setting | API Field | Type | Why It Matters for AW |
|---|---|---|---|
| Require passcode when scheduling new meetings | `security.meeting_password` | bool | Default on — hosts may want to disable to simplify join links. Note: AW already passes the passcode field; Zoom auto-embeds it in the join URL. |
| Waiting Room Options (who enters, sort order) | `in_meeting.waiting_room_settings` | object | Waiting room is already exposed — but the sub-options (everyone vs. guests only, sort order) aren't. Worth adding. |
| Identify guest participants | `in_meeting.identify_guest_participants` | bool | Labels non-account users in the participant list. Useful for hosts running mixed member/public sessions. |
| Allow removed participants to rejoin | `in_meeting.allow_removed_to_rejoin` | bool | Host moderation — do you want kicked participants to be able to come back? |

---

## Meeting Behavior

| Setting | API Field | Type | Why It Matters for AW |
|---|---|---|---|
| Audio Type (computer + phone vs. computer only) | `schedule_meeting.audio_type` | enum | Controls whether dial-in phone numbers are included. Most AW users are computer audio — could simplify invites by defaulting to computer only. |
| Enable auto-calling | `schedule_meeting.auto_calling` | bool | Automatically calls accepted participants at start time. Could reduce no-shows for AW users with phone-savvy members. |
| Co-host | `in_meeting.co_host` | bool | Allow host to assign co-hosts. Essential for AW group sessions where someone manages attendees while host presents. |
| Request permission to unmute | `in_meeting.request_permission_to_unmute` | bool | Host requests consent before unmuting participants. Professional for AW coaching/class sessions. |
| Allow participants to rename themselves | `in_meeting.allow_rename` | bool | Some AW hosts want enforced real names; others don't care. Worth exposing. |
| Allow users to change their name when joining | `in_meeting.allow_name_change_on_join` | bool | Same concern as above — name on join vs. profile name. |
| Sound notification when someone joins or leaves | `in_meeting.entry_exit_chime` | bool | Disruptive in large meetings. Hosts running bigger AW sessions likely want this off. |
| HD Video Quality | `in_meeting.hd_video` | bool | Higher resolution video. Relevant for AW's fitness/coaching audience where visual quality matters. |
| Meeting reactions (emojis) | `in_meeting.meeting_reactions` | bool | Emoji reactions (clap, heart, etc.) shown on video. Good for engagement in AW group sessions. |
| Meeting timers | `in_meeting.meeting_timer` | bool | Countdown timers visible to all participants. Useful for structured AW workshops. |
| Default meeting wallpaper | `in_meeting.default_wallpaper` | string | Account-level background for video feeds. Potential branding opportunity — AW could offer a custom wallpaper per account. |
| Display end-of-meeting feedback survey | `in_meeting.post_meeting_feedback` | bool | Zoom's thumbs up/down survey at the end. Some AW hosts may want to disable this to avoid confusion with their own feedback processes. |

---

## Screen Sharing

| Setting | API Field | Type | Why It Matters for AW |
|---|---|---|---|
| Screen sharing (on/off) | `in_meeting.screen_sharing` | bool | Master toggle. Some AW hosts (courses, coaching) may want to disable participant screen sharing entirely. |
| Who can share (host only vs. all participants) | `in_meeting.who_can_share_screen` | enum | Probably should default to "host only" for most AW use cases. Worth exposing on the meeting form. |
| Who can start sharing when someone else is sharing | `in_meeting.who_can_share_screen_when_someone_is_sharing` | enum | Secondary control. Less critical but completes the sharing permissions story. |
| Annotation (on shared screens) | `in_meeting.annotation` | bool | Draw/write on shared screens. Useful for AW coaching and whiteboard-style sessions. |
| Only the sharer can annotate | `in_meeting.only_sharer_can_annotate` | bool | Locks annotation to presenter only. Good for structured AW presentations. |
| Allow saving screens with annotations | `in_meeting.save_screen_annotate` | bool | Sub-setting of annotation — save the annotated view. |

---

## Chat

| Setting | API Field | Type | Why It Matters for AW |
|---|---|---|---|
| Meeting chat (on/off) | `in_meeting.chat` | bool | Master toggle. Some AW hosts want a distraction-free environment with chat off. |
| Private chat / direct messages between participants | `in_meeting.private_chat` | bool | Allows attendee-to-attendee DMs. Some AW hosts prefer to keep all chat visible to host. |
| Auto-save chat to host's computer | `in_meeting.auto_saving_chat` | bool | Auto-saves chat log when meeting ends. Useful for AW hosts who want a record of discussion. |
| Send files via meeting chat | `in_meeting.file_transfer` | bool | File uploads in chat. Useful for AW's content delivery use cases (share handouts, worksheets). |
| Allow users to save/copy chat | `in_meeting.allow_save_chat` | enum | Who can save the chat log. Privacy consideration. |

---

## Q&A

| Setting | API Field | Type | Why It Matters for AW |
|---|---|---|---|
| Q&A in meetings (on/off) | `in_meeting.question_answer` | bool | **High priority.** Separate Q&A panel from chat. AW already specs Q&A reports (Section 6). This is the toggle that enables the feature — must be on for Q&A data to exist. |
| Allow anonymous questions | `in_meeting.qa_allow_anonymous` | bool | Sub-setting — useful if AW hosts want candid Q&A without participants feeling exposed. |
| Attendees can upvote questions | `in_meeting.qa_allow_upvote` | bool | Surfaces popular questions. Useful for AW's larger group sessions. |
| Attendees can comment on questions | `in_meeting.qa_allow_comment` | bool | Discussion within Q&A panel. |

---

## Captions & Accessibility

| Setting | API Field | Type | Why It Matters for AW |
|---|---|---|---|
| Automated captions (live AI captions) | `in_meeting.auto_generated_captions` | bool | Live captions during the meeting. High value for AW's accessibility and international members. |
| Full transcript (side panel) | `in_meeting.full_transcript` | bool | Live transcript visible to participants during meeting. Companion to captions. |
| Enable automatic transcriptions for all meetings | `in_meeting.enable_auto_transcription` | bool | Starts transcription automatically — no manual action by host. |
| Save captions / download transcript | `in_meeting.save_captions` | bool | Allow participants to download transcript after. Privacy consideration — some AW hosts may want to restrict. |
| Language Interpretation | `in_meeting.language_interpretation` | bool | Real-time audio interpretation (e.g., English → Spanish). Relevant for AW accounts with multilingual member bases. |
| Sign Language interpretation | `in_meeting.sign_language_interpretation` | bool | ASL/sign language interpreter view. Accessibility. |

---

## Breakout Rooms

| Setting | API Field | Type | Why It Matters for AW |
|---|---|---|---|
| Breakout room (on/off) | `in_meeting.breakout_room` | bool | **High priority.** Split participants into sub-groups. Essential for AW workshops, masterminds, group coaching. Already in spec #11. |
| Assign participants to breakout rooms when scheduling | `in_meeting.breakout_room_scheduling` | bool | Pre-assign participants before the meeting starts. Related to spec #11. |
| Broadcast message to breakout rooms | `in_meeting.broadcast_message_to_breakout_rooms` | bool | Host can send a message to all rooms at once. Useful for AW workshop facilitation. |

---

## Virtual Background & Visual

| Setting | API Field | Type | Why It Matters for AW |
|---|---|---|---|
| Virtual background | `in_meeting.virtual_background` | bool | Custom video backgrounds. Could allow AW to offer branded backgrounds per account. |
| Allow video virtual backgrounds | `in_meeting.virtual_background_videos` | bool | Animated/video backgrounds. Sub-setting. |
| Immersive View | `in_meeting.immersive_view` | bool | Scene-based views (classroom, boardroom layout). Potential AW differentiator — branded meeting environments. Worth exploring. |

---

## Compliance & Disclaimers

| Setting | API Field | Type | Why It Matters for AW |
|---|---|---|---|
| Show custom disclaimer when starting/joining a meeting | `in_meeting.meeting_disclaimer` | bool | Custom legal notice shown to all participants at join. Relevant for AW accounts in regulated industries (health coaches, financial coaches, therapists). |
| Show disclaimer to participants when recording starts | `recording.show_recording_disclaimer` | enum | Consent/compliance notice at recording start. Same audience — regulated-industry AW users. |
| Play voice prompt when recording starts | `recording.play_voice_prompt` | enum | Audio "this meeting is being recorded." Control over who hears it. |

---

## Recording

| Setting | API Field | Type | Why It Matters for AW |
|---|---|---|---|
| Local recording (to host's computer) | `recording.local_recording` | bool | Allow hosts to record locally in addition to or instead of cloud. Some AW hosts prefer local. |
| Save chat messages with recording | `recording.save_chat_text` | bool | Includes chat log in the recording folder. Most AW hosts who record will want this on. |
| Save closed captions as VTT file | `recording.save_closed_caption` | bool | Subtitle file alongside recording. Useful for AW hosts who publish recordings. |
| Require authentication before viewing cloud recordings | `recording.require_auth_for_viewing` | bool | Require Zoom login or passcode to view a recording. Could be relevant for AW hosts who sell access to recordings. |

---

## Whiteboard

| Setting | API Field | Type | Why It Matters for AW |
|---|---|---|---|
| Enable in-meeting whiteboard | `in_meeting.whiteboard` | bool | Master toggle. Relevant for AW coaching/workshop use cases. |
| Allow whiteboards to be saved to cloud | `whiteboard.allow_save_to_cloud` | bool | Persist whiteboard after meeting ends. Useful for AW session notes. |
| Allow participants to share whiteboard | `whiteboard.allow_participant_share` | bool | Restrict to host-only if needed for structured AW sessions. |
| Who can initiate new whiteboards in the meeting | `whiteboard.who_can_initiate` | enum | Host only / account users / all participants. Probably host-only for most AW use cases. |
| In-meeting whiteboard collaboration scope | `whiteboard.in_meeting_collaboration_scope` | enum | **Important.** Must be set to "all participants" for AW's external members to collaborate on whiteboards. |
| Default whiteboard access level | `whiteboard.default_access_level` | enum | Must allow "anyone with link" for AW external participants to access shared whiteboards. |
| Embed whiteboard in third-party applications | `whiteboard.allow_embedding` | bool | iframe embed. Could allow AW to embed a Zoom Whiteboard directly inside the platform. Worth exploring. |
