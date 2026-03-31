# Zoom Webhook Receiver — Software Design Document

## Overview

A single endpoint that receives real-time event notifications from Zoom via HTTP POST. The endpoint verifies authenticity (HMAC-SHA256), logs every event to the database, deduplicates by event ID, and responds HTTP 200 immediately. No event processing happens inline — this is a receive-and-log layer only.

This is the P1 foundation that all future automated Zoom features depend on (post-meeting pipeline, auto-attendance, recording management, etc.). Without it, every feature requires manual user action or unreliable polling.

## Scope

**In scope:**
- New controller: `oilylife/controllers/zoom-webhooks.php`
- HMAC-SHA256 signature verification with timing-safe comparison
- Replay protection via timestamp check (5-minute window)
- CRC challenge response for Zoom endpoint registration (`endpoint.url_validation`)
- Logging all events to `zoom_webhook_log` table
- Deduplication by `event_id`
- Model methods for webhook log CRUD in `VideoConferencingClass`
- Config addition for webhook secret token in `VideoConferencingKeyInfo` trait
- Stub event routing (log-only, no real handlers yet)

**Out of scope:**
- Event handler implementations (separate SDD per feature)
- Cron processor for queued events (separate SDD)
- Admin UI for viewing webhook logs
- Zoom Marketplace app registration (manual, done by Greg)

## Where This Lives

| File | Action | Purpose |
|------|--------|---------|
| `oilylife/controllers/zoom-webhooks.php` | **New** | Webhook receiver endpoint |
| `oilylife/models/video-conferencing.php` | Modify | Add webhook log model methods |
| `oilylife/config/attractwell/video-conferencing.config.php` | Modify | Add `$zoom_webhook_secret_token` to trait |
| `oilylife/config/getoiling/video-conferencing.config.php` | Modify | Add `$zoom_webhook_secret_token` to trait |

## Controller Flow

Follows existing patterns from `braintree-webhooks.php` and `mailgun-webhooks.php`:

- `chdir('..')` to navigate from `/controllers` to root `oilylife/` directory
- `require_once` for `config/oil.config.php`, `lib/db.php`, `models/video-conferencing.php`, error logger
- Read raw body via `file_get_contents('php://input')` (mailgun pattern)
- No session auth — public endpoint hit by Zoom servers
- No `.htaccess` rewrite needed — direct file access, same as other webhook controllers

### Request Flow

```
Zoom POST → zoom-webhooks.php
  1. Read raw body + headers (x-zm-signature, x-zm-request-timestamp)
  2. Verify HMAC-SHA256 signature → 401 if invalid
  3. Reject if timestamp > 5 min old (replay protection) → 401
  4. JSON decode body
  5. If endpoint.url_validation → CRC response + die
  6. Check dedup by event_id → 200 + die if already exists
  7. Log to zoom_webhook_log via model
  8. Respond HTTP 200
  9. Switch on event_type → stub handlers (ErrorLog info-level only)
```

### Signature Verification

```php
// Zoom sends:
// Header: x-zm-signature = v0=<hash>
// Header: x-zm-request-timestamp = <unix_timestamp>

$timestamp = $_SERVER['HTTP_X_ZM_REQUEST_TIMESTAMP'];
$signature = $_SERVER['HTTP_X_ZM_SIGNATURE'];
$raw_body = file_get_contents('php://input');

$message = 'v0:' . $timestamp . ':' . $raw_body;
$expected = 'v0=' . hash_hmac('sha256', $message, $secret_token);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    die;
}

// Replay protection — reject if timestamp is older than 5 minutes
if (abs(time() - intval($timestamp)) > 300) {
    http_response_code(401);
    die;
}
```

### CRC Challenge Response

```php
if ($event === 'endpoint.url_validation') {
    $plain_token = $payload['payload']['plainToken'];
    $hash = hash_hmac('sha256', $plain_token, $secret_token);
    header('Content-Type: application/json');
    echo json_encode([
        'plainToken' => $plain_token,
        'encryptedToken' => $hash
    ]);
    die;
}
```

### Stub Event Routing

```php
switch ($event_type) {
    case 'meeting.ended':
    case 'meeting.summary_completed':
    case 'recording.completed':
    case 'recording.transcript_completed':
        ErrorLog('INFO: Zoom webhook received: ' . $event_type .
                 ' | meeting_id: ' . $meeting_id .
                 ' | event_id: ' . $event_id,
                 __FILE__, __LINE__, 'info');
        break;
    default:
        ErrorLog('INFO: Zoom webhook received unknown event: ' . $event_type .
                 ' | event_id: ' . $event_id,
                 __FILE__, __LINE__, 'info');
        break;
}
```

## Database Schema

Table `zoom_webhook_log` in the `zoom_license` database (follows existing Zoom data pattern — see `cron/zoom-license-audit.php` for `"db" => 'zoom_license'` usage):

```sql
CREATE TABLE zoom_webhook_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(100) NOT NULL,
    meeting_id VARCHAR(50) DEFAULT NULL,
    account_id INT DEFAULT NULL,
    payload_json MEDIUMTEXT,
    processed TINYINT(1) DEFAULT 0,
    processed_at DATETIME DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_event_id (event_id),
    INDEX idx_event_type (event_type),
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_processed (processed, created_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Column notes:**
- `product` — `'attractwell'` or `'getoiling'`, set from `$site_config` at request time
- `event_id` — Zoom's unique ID per event delivery, used for deduplication (UNIQUE constraint)
- `meeting_id` — extracted from payload for easy querying; VARCHAR because Zoom uses string IDs
- `account_id` — the platform account ID (if resolvable from the meeting), NULL initially
- `payload_json` — full Zoom payload stored for future handler processing
- `processed` / `processed_at` / `error_message` — for future cron processor to track state

## Security

- **HMAC-SHA256 signature verification** using `hash_equals()` (timing-safe comparison prevents timing attacks)
- **Replay protection** via timestamp check — reject requests where `x-zm-request-timestamp` is more than 5 minutes from server time
- **CRC challenge response** — required by Zoom during endpoint registration to prove endpoint ownership
- **No session auth** — public endpoint, authentication is entirely via signature verification
- **No user input in queries** — event data is logged via prepared statements, never interpolated into SQL

## Config

Add `$zoom_webhook_secret_token` to the `VideoConferencingKeyInfo` trait in both product config files:

```php
// oilylife/config/attractwell/video-conferencing.config.php
// oilylife/config/getoiling/video-conferencing.config.php

trait VideoConferencingKeyInfo {
    private $api_key = '...';
    private $api_secret = '...';
    private $zoom_webhook_secret_token = ''; // Set after Zoom Marketplace app registration
}
```

This follows the same pattern as existing OAuth credentials. The controller accesses the token via the model instance: `$VideoConference->zoom_webhook_secret_token` (or a getter method if private access is an issue — see open question #1).

## Model Methods

Add to `VideoConferencingClass` in `oilylife/models/video-conferencing.php`:

```php
/**
 * Log a webhook event to the zoom_webhook_log table.
 * Returns true on success, false on duplicate (event_id already exists).
 */
public function LogWebhookEvent($product, $event_type, $event_id, $meeting_id, $account_id, $payload_json)
{
    global $dbconn;
    $retval = $dbconn->query(
        "INSERT IGNORE INTO zoom_webhook_log
            (product, event_type, event_id, meeting_id, account_id, payload_json)
         VALUES (?, ?, ?, ?, ?, ?)",
        array($product, $event_type, $event_id, $meeting_id, $account_id, $payload_json),
        array("db" => "zoom_license")
    );
    return $retval->affected_rows > 0;
}

/**
 * Check if a webhook event has already been received.
 */
public function IsWebhookEventDuplicate($event_id)
{
    global $dbconn;
    $retval = $dbconn->query(
        "SELECT id FROM zoom_webhook_log WHERE event_id = ? LIMIT 1",
        array($event_id),
        array("db" => "zoom_license")
    );
    return count($retval->results) > 0;
}

/**
 * Mark a webhook event as processed (for future cron processor).
 */
public function MarkWebhookEventProcessed($event_id, $error_message = null)
{
    global $dbconn;
    $dbconn->query(
        "UPDATE zoom_webhook_log
         SET processed = 1, processed_at = NOW(), error_message = ?
         WHERE event_id = ?",
        array($error_message, $event_id),
        array("db" => "zoom_license")
    );
}

/**
 * Get unprocessed webhook events for cron processing.
 */
public function GetUnprocessedWebhookEvents($limit = 50)
{
    global $dbconn;
    $retval = $dbconn->query(
        "SELECT * FROM zoom_webhook_log
         WHERE processed = 0
         ORDER BY created_at ASC
         LIMIT " . intval($limit),
        array(),
        array("db" => "zoom_license")
    );
    return $retval->results;
}
```

**Notes:**
- `LogWebhookEvent` uses `INSERT IGNORE` so the UNIQUE constraint on `event_id` handles deduplication at the DB level — returns false if the event already existed
- All queries use `"db" => "zoom_license"` to target the correct database, following the pattern in `cron/zoom-license-audit.php`
- All queries use prepared statements (parameterized) — no string interpolation

## Open Questions for Greg

1. **Webhook secret token access** — The trait defines private properties. Should the controller access the token via a public getter method on `VideoConferencingClass`, or should the trait property be changed to `protected`/`public`? Check how `$api_key` / `$api_secret` are currently accessed.
2. **One Zoom Marketplace app or separate per product?** — If one app, both products share a webhook secret token. If separate, each product config has its own token. Recommend one app if both products use the same Zoom account.
3. **Initial event subscriptions** — Recommend starting with: `meeting.ended`, `meeting.summary_completed`, `recording.completed`, `recording.transcript_completed`. These cover the post-meeting pipeline. Registration events can be added later.
4. **Endpoint URL format** — Direct path (`/controllers/zoom-webhooks.php`) or a clean route? Other webhook controllers use direct file paths, so recommend the same for consistency.
5. **Log retention policy** — Recommend 90 days. The `payload_json` column stores full payloads which could grow large. A simple cron to `DELETE FROM zoom_webhook_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)` would keep the table manageable.

## Implementation Checklist

### Step 1: Database — Create `zoom_webhook_log` table
Run the CREATE TABLE statement above against the `zoom_license` database.

### Step 2: Config — Add webhook secret token to traits
Add `$zoom_webhook_secret_token` to `VideoConferencingKeyInfo` in both product config files (value left empty until Greg registers the Marketplace app).

### Step 3: Model — Add webhook log methods
Add `LogWebhookEvent`, `IsWebhookEventDuplicate`, `MarkWebhookEventProcessed`, and `GetUnprocessedWebhookEvents` to `VideoConferencingClass`.

### Step 4: Controller — Create `zoom-webhooks.php`
New file following the controller flow above. Bootstrap with `chdir('..')` + requires, implement signature verification, CRC handling, dedup check, event logging, and stub routing.

### Step 5: Deploy + Register
Deploy to staging, register endpoint URL in Zoom Marketplace app, complete CRC challenge.

## Verification

- [ ] CRC challenge passes — Zoom endpoint validation succeeds during Marketplace app setup
- [ ] Valid webhook → event logged in `zoom_webhook_log` table with correct `event_type`, `event_id`, `meeting_id`, and full `payload_json`
- [ ] Invalid signature → HTTP 401, no database write
- [ ] Replayed request (timestamp > 5 min old) → HTTP 401, no database write
- [ ] Duplicate `event_id` → HTTP 200 returned, no duplicate row in database
- [ ] Response time < 3 seconds (Zoom timeout requirement)
- [ ] Test `meeting.ended` event → logged, info-level ErrorLog entry written
- [ ] Test unknown event type → logged, info-level ErrorLog entry written

## Existing Patterns Referenced

- `oilylife/controllers/mailgun-webhooks.php` — controller bootstrap, `file_get_contents('php://input')` for raw body
- `oilylife/controllers/braintree-webhooks.php` — challenge handling pattern
- `oilylife/models/video-conferencing.php` — model class structure, `VideoConferencingClass`
- `oilylife/config/attractwell/video-conferencing.config.php` — `VideoConferencingKeyInfo` trait pattern
- `oilylife/cron/zoom-license-audit.php` — `"db" => 'zoom_license'` query pattern
- `docs/features/ZOOM-ENHANCED/zoom-api-expansion-specs.md` §1 — high-level webhook receiver notes
