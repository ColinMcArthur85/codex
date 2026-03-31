# Double URL Encoding Audit

We fixed a bug in the file manager where `encodeURI()` was applied to a URL that was already encoded, turning `%20` into `%2520`. This audit identifies other places in the platform where the same pattern could cause issues.

---

## Fixed

**File Manager - Copy Link Button**
`oilylife/views/account/file-manager.html.php` line 487
- Removed `encodeURI()` wrapper from the copy-to-clipboard call. The URL from the `href` attribute is already properly encoded.

---

## High Risk

### 1. Videos List - Share/Copy Link
`oilylife/views/account/videos-list.html.php`

| Line | Code | Issue |
|------|------|-------|
| 1609 | `encodeURI(sharing_url)` | Building share URL |
| 1646 | `encodeURI(sharing_url)` | Copy link to clipboard |
| 1950 | `encodeURI(...)` on `data-share-slug` attr | Reading from DOM attribute |

Same pattern as the file manager bug. If video slugs contain encoded characters, these will double-encode.

### 2. Resource Sharing Bundles
`oilylife/views/account/resource-sharing.html.php`

| Line | Code | Issue |
|------|------|-------|
| 97 | `encodeURIComponent($sharing_url)` | Sharing URL embedded in query string |
| 104 | `encodeURIComponent($view_url)` | GoNative share link |
| 135 | `encodeURIComponent(htmlspecialchars($_GET['search']))` | Search param |

`oilylife/views/account/add-edit-resource-sharing-bundle.html.php`

| Line | Code | Issue |
|------|------|-------|
| 40 | `encodeURIComponent($sharing_url)` | Same pattern as resource-sharing.html.php line 97 |

---

## Medium Risk

### 3. Videos Model - BunnyCDN API Calls
`oilylife/models/videos.php`

| Line | Code | Issue |
|------|------|-------|
| 314 | `encodeURIComponent($video_library_id)` | API path segment |
| 709 | `encodeURIComponent($video_library_id)` | API path segment |
| 845, 878 | `encodeURIComponent($video_provider_id)` | API path segment |
| 1397 | `encodeURIComponent($new_thumbnail_url)` | Full URL as query param - most likely to double-encode |

### 4. Cron Scripts

| File | Line | Code |
|------|------|------|
| `cron/renew-ssl-certificates.php` | 88, 102 | `encodeURIComponent($account['website_full_url'])` |
| `cron/run-service-request.php` | 145 | `encodeURIComponent($replacement['data'])` on contact data |
| `cron/send-daily-summary.php` | 48 | `encodeURIComponent('anniversary_month[]=')` |

### 5. Router Redirect Messages
`oilylife/lib/router.php`

| Line | Code | Issue |
|------|------|-------|
| 42 | `encodeURIComponent($i18n_strings[$i18n_string])` | i18n error messages |
| 46 | `encodeURIComponent($retval->code . ', ' . $retval->message)` | Error messages |

---

## Low Risk

These are unlikely to cause user-facing issues but are worth being aware of.

| File | Lines | Notes |
|------|-------|-------|
| `models/google-calendar-api.php` | 152, 166 | `urlencode()` on OAuth redirect URIs (static values) |
| `models/microsoft-office-365-calendar-api.php` | 717, 719 | `urlencode()` on OAuth redirect URIs (static values) |
| `models/mailgun-domain.php` | 281, 308, 341, 384, 436, 474, 501, 528 | `urlencode($domain_name)` - domains are alphanumeric |
| `models/pixabay-api.php` | 26 | `urlencode($query)` on search queries |
| `models/zip-code-api.php` | 15 | `urlencode($zip_code)` - zip codes are alphanumeric |
| `views/account/online-class-lesson-approvals.html.php` | 323, 325, 327, 329 | `encodeURIComponent()` on numeric IDs |
