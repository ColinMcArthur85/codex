# WISH-370: E.164 Phone Number Formatting

## Problem
International phone numbers are not being formatted correctly for Twilio delivery. A real-world example: a Philippines contact with mobile phone `63-908-221-4025` should produce E.164 format `+639082214025`, but the current naive formatter strips dashes, sees 12 digits (>10), and produces `+63908221402` (truncated to 19 digits after the `+`). Worse, two critical SendText call sites bypass the formatted column entirely and send the raw phone number to Twilio.

### Root Cause
1. **Critical bug**: `lib/message-contacts.php:326` sends raw `$contact['mobile_phone']` to Twilio instead of `$contact['mobile_phone_format']`
2. **Same bug**: `cron/send-calendar-reminders.php:248` also sends raw `$contact['mobile_phone']`
3. **Current formatter** (`helpers/text-helper.php:19-31`) is naive — strips non-digits, assumes US for 10-digit numbers, has no country awareness
4. **No E.164 columns** exist for `home_phone` or `work_phone`

Note: `cron/send-queued-messages.php:396` correctly uses `mobile_phone_format` — these two call sites are the outliers.

---

## Current Behavior Analysis

### The Naive Formatter (`helpers/text-helper.php:19-31`)

```php
function formatPhoneNumberAsE164( $phoneNumber ) {
    $phoneNumber = preg_replace('/[^0-9]/','',(string)$phoneNumber);

    $numberLen = strlen( (string)$phoneNumber );
    if( $numberLen > 10 ) // international number. Take 1st 19 characters and add a plus
        $phoneNumber = '+' . substr( (string)$phoneNumber, 0, 19 );
    else if( $numberLen == 10 ) // no country code... assume USA and prepend +1
        $phoneNumber = '+1' . $phoneNumber;
    else
        $phoneNumber = null;

    return $phoneNumber;
}
```

**Problems:**
1. Assumes US (`+1`) for any 10-digit number — wrong for UK (also 10 digits without country code)
2. No country-awareness — ignores the contact's `country` field entirely
3. No validation that the resulting number is actually valid E.164
4. Does not handle international dialing prefix `00` (e.g., `0063-908-221-4025`)
5. Does not handle local trunk prefixes (e.g., `09082214025` in Philippines)

### Bug: Raw Phone Sent to Twilio

**`lib/message-contacts.php:326`** — TextContact function:
```php
$retval = $GLOBALS['GoText']->SendText( $contact['mobile_phone'], $text_message, $text_options );
// Should be: $contact['mobile_phone_format']
```

**`cron/send-calendar-reminders.php:248`**:
```php
$retval = $TextModel->SendText( $contact['mobile_phone'], $text_message, $text_options );
// Should be: $contact['mobile_phone_format']
```

### All Call Sites for `formatPhoneNumberAsE164()`

| Location | Line | Context |
|----------|------|---------|
| `models/contacts.php` | 370 | AddContact — formats mobile_phone on insert |
| `models/contacts.php` | 529 | UpdateContact — formats mobile_phone on update |
| `models/contacts.php` | 1784 | GetContactByE164MobilePhone — lookup |
| `models/contacts.php` | 1808 | GetContactsByEmailOrPhone — lookup |
| `models/contacts.php` | 2030 | SearchContacts — search |
| `controllers/contacts.php` | 1695 | check_for_duplicate_phone |
| `controllers/contacts.php` | 3358, 3377, 3385 | CSV import de-duplication |
| `lib/text-message.php` | 253 | Self-text prevention check |
| `cron/send-notifications.php` | 189 | Site owner phone formatting |
| Various | — | `contact-me-form.php`, `scheduling.php`, `premium-texting.php`, `messaging-block.php`, `send-member-area-notifications.php`, `api/models/exigo.php` |

### Entry Points Where Phone Numbers Enter the System

1. **Contact edit UI**: `controllers/contacts.php` — manual entry
2. **CSV import**: `controllers/contacts.php:3090-3387` — bulk import
3. **API endpoint**: `api/controllers/contacts.php` — programmatic
4. **Registration**: `controllers/register.php` — new user signup

### Database Fields

- `mobile_phone` — raw phone as entered (varchar 50)
- `mobile_phone_format` — E.164 formatted version (exists)
- `home_phone` — raw only, **no E.164 counterpart**
- `work_phone` — raw only, **no E.164 counterpart**
- `country` — freeform text field (varchar 100), e.g. "Philippines", "United States"

---

## Implementation Plan

### Phase 0: Bug Fix — Use `mobile_phone_format` in SendText Calls

**Risk:** Low | **Effort:** Minimal

Fix the two broken call sites to use the pre-formatted E.164 number:

**`lib/message-contacts.php:326`** — change:
```php
$retval = $GLOBALS['GoText']->SendText( $contact['mobile_phone_format'], $text_message, $text_options );
```

**`cron/send-calendar-reminders.php:248`** — change:
```php
$retval = $TextModel->SendText( $contact['mobile_phone_format'], $text_message, $text_options );
```

---

### Phase 1: Install `giggsey/libphonenumber-for-php`

**Risk:** Low | **Effort:** Minimal

Add the PHP port of Google's libphonenumber to `oilylife/composer.json`:

```bash
cd oilylife && composer require giggsey/libphonenumber-for-php:^8.0
```

This library provides:
- Parsing phone numbers with country context
- Validation of phone number structure per country
- Formatting to E.164, national, and international formats
- Handling of local trunk prefixes (e.g., `0` in Philippines/UK)

---

### Phase 2: Country Name-to-ISO Mapping Helper

**Risk:** Low | **Effort:** Low

Create `oilylife/helpers/country-code-helper.php` with a mapping function:

```php
function countryNameToIsoCode( $countryName ) {
    if( $countryName === null || trim((string)$countryName) === '' )
        return null;

    $map = [
        'united states'  => 'US',
        'usa'            => 'US',
        'canada'         => 'CA',
        'united kingdom' => 'GB',
        'uk'             => 'GB',
        'australia'      => 'AU',
        'philippines'    => 'PH',
        'mexico'         => 'MX',
        'japan'          => 'JP',
        // ... full list of countries used in the system
    ];

    $normalized = strtolower(trim((string)$countryName));
    return $map[$normalized] ?? null;
}
```

The map should cover all country values present in the `contact.country` column. A migration script (Phase 5) can query `SELECT DISTINCT country FROM contact` to ensure full coverage.

---

### Phase 3: Rewrite `formatPhoneNumberAsE164()` with libphonenumber

**Risk:** Medium | **Effort:** Medium

Replace the naive formatter in `helpers/text-helper.php:19-31` with a libphonenumber-backed implementation that accepts an optional `$country` parameter:

```php
use libphonenumber\PhoneNumberUtil;
use libphonenumber\PhoneNumberFormat;
use libphonenumber\NumberParseException;

function formatPhoneNumberAsE164( $phoneNumber, $country = null ) {
    $phoneNumber = trim((string)$phoneNumber);
    if( $phoneNumber === '' )
        return null;

    require_once __DIR__ . '/country-code-helper.php';

    $regionCode = countryNameToIsoCode($country);
    if( $regionCode === null )
        $regionCode = 'US'; // default fallback per user decision

    $phoneUtil = PhoneNumberUtil::getInstance();

    try {
        $numberProto = $phoneUtil->parse($phoneNumber, $regionCode);

        if( $phoneUtil->isValidNumber($numberProto) ) {
            return $phoneUtil->format($numberProto, PhoneNumberFormat::E164);
        }

        // Handle international dialing prefix "00" (e.g., 0063-908-221-4025)
        if( !$phoneUtil->isValidNumber($numberProto) && $regionCode !== null ) {
            $cleaned = preg_replace('/^00/', '+', $phoneNumber);
            if( $cleaned !== $phoneNumber ) {
                $numberProto2 = $phoneUtil->parse($cleaned, $regionCode);
                if( $phoneUtil->isValidNumber($numberProto2) ) {
                    return $phoneUtil->format($numberProto2, PhoneNumberFormat::E164);
                }
            }
        }
    } catch( NumberParseException $e ) {
        // Fall through to legacy behavior
    }

    // Legacy fallback for numbers libphonenumber can't parse
    $digitsOnly = preg_replace('/[^0-9]/', '', $phoneNumber);
    $numberLen = strlen($digitsOnly);
    if( $numberLen > 10 )
        return '+' . substr($digitsOnly, 0, 19);
    else if( $numberLen == 10 && $regionCode == 'US' )
        return '+1' . $digitsOnly;

    return null;
}
```

**Key design decisions:**
- Accepts `$country` as a free-form country name (matching the DB field), not an ISO code
- Falls back to `US` when country is null/empty (per user decision)
- Retains legacy fallback so existing US numbers continue to work even if libphonenumber fails
- Handles `00` international dialing prefix as a second parsing attempt

---

### Phase 4: Thread `$country` Through All Call Sites

**Risk:** Medium | **Effort:** Medium

Every call to `formatPhoneNumberAsE164()` must now pass the contact's country. Key changes:

**`models/contacts.php:370` (AddContact):**
```php
$contact_record['mobile_phone_format'] = formatPhoneNumberAsE164(
    $contact_record['mobile_phone'], $contact_record['country'] ?? null
);
```

**`models/contacts.php:529` (UpdateContact):**
```php
$contact_record['mobile_phone_format'] = formatPhoneNumberAsE164(
    $contact_record['mobile_phone'], $contact_record['country'] ?? null
);
```

**`controllers/contacts.php:1695` (duplicate check):**
```php
$temp_phone = formatPhoneNumberAsE164( $_POST['mobile_phone'], $_POST['country'] ?? null );
```

**CSV import** (`controllers/contacts.php:3358, 3377, 3385`):
```php
$e164_number = formatPhoneNumberAsE164(
    $contact[$column_mapping['mobile_phone']],
    $column_mapping['country'] !== null ? ($contact[$column_mapping['country']] ?? null) : null
);
```

**Lookup functions** (`models/contacts.php:1784, 1808, 2030`): These accept phone numbers from external sources (incoming texts, search queries) and may not have country context. The default US fallback handles this.

All other call sites (see table above) should be audited and updated similarly.

---

### Phase 5: DB Migration — Add `home_phone_format` and `work_phone_format` Columns

**Risk:** Medium | **Effort:** Medium

#### 5.1 Schema Change

```sql
ALTER TABLE contact
    ADD COLUMN home_phone_format VARCHAR(20) DEFAULT NULL AFTER home_phone,
    ADD COLUMN work_phone_format VARCHAR(20) DEFAULT NULL AFTER work_phone;

CREATE INDEX idx_contact_home_phone_format ON contact(home_phone_format);
CREATE INDEX idx_contact_work_phone_format ON contact(work_phone_format);
```

#### 5.2 Update AddContact and UpdateContact

Extend `models/contacts.php` AddContact (~line 370) and UpdateContact (~line 527) to also format `home_phone` and `work_phone`:

```php
// In AddContact, alongside mobile_phone_format logic:
if( $contact_record['home_phone'] !== null && trim((string)$contact_record['home_phone']) !== '' )
    $contact_record['home_phone_format'] = formatPhoneNumberAsE164(
        $contact_record['home_phone'], $contact_record['country'] ?? null
    );

if( $contact_record['work_phone'] !== null && trim((string)$contact_record['work_phone']) !== '' )
    $contact_record['work_phone_format'] = formatPhoneNumberAsE164(
        $contact_record['work_phone'], $contact_record['country'] ?? null
    );
```

Add the new columns to the INSERT and UPDATE SQL statements.

#### 5.3 Backfill Script

Create `oilylife/tools/migrate-phone-numbers.php`:

```php
// Usage: php migrate-phone-numbers.php [--dry-run]
// Processes all contacts in batches of 500
// Re-formats mobile_phone_format using new libphonenumber logic
// Populates home_phone_format and work_phone_format for the first time
// Outputs summary: total processed, changed, failed
```

The script should:
- Process contacts in batches of 500 to avoid memory issues
- Support `--dry-run` flag to preview changes without writing
- Log any numbers that fail to parse
- Use the contact's `country` field for formatting context

---

### Phase 6: Defensive E.164 Check at SendText Time

**Risk:** Low | **Effort:** Minimal

Add a guard in `lib/text-message.php` at line 311, just before the Twilio API call:

```php
$to_number = trim((string)$to_number);
if( substr($to_number, 0, 1) !== '+' ) {
    $to_number = formatPhoneNumberAsE164($to_number);
    if( $to_number === null ) {
        return GetModelErrorWithData( 'Invalid phone number format',
            null, ["fatal" => false, "twilio_error_code" => 0,
                   "twilio_error_message" => "Number could not be formatted as E.164"] );
    }
}
```

This ensures that even if a raw number somehow reaches the SendText function, it gets formatted or rejected before hitting Twilio.

---

### Phase 7: Test Script with International Examples

**Risk:** Low | **Effort:** Low

Create `oilylife/tools/test-phone-formatting.php` — a standalone CLI script that validates the formatter against known-good test cases:

| Input | Country | Expected Output |
|-------|---------|-----------------|
| `"63-908-221-4025"` | `"Philippines"` | `"+639082214025"` |
| `"09082214025"` | `"Philippines"` | `"+639082214025"` |
| `"0063-908-221-4025"` | `"Philippines"` | `"+639082214025"` |
| `"+639082214025"` | `null` | `"+639082214025"` |
| `"(701) 555-1234"` | `null` | `"+17015551234"` |
| `"701-555-1234"` | `"United States"` | `"+17015551234"` |
| `"7015551234"` | `null` | `"+17015551234"` |
| `"+447911123456"` | `null` | `"+447911123456"` |
| `"07911 123456"` | `"United Kingdom"` | `"+447911123456"` |
| `"07911 123456"` | `null` | `null` (ambiguous without country) |
| `""` | `null` | `null` |
| `"123"` | `null` | `null` |
| `"+1 (701) 555-1234"` | `"Canada"` | `"+17015551234"` |
| `"0061-412-345-678"` | `"Australia"` | `"+61412345678"` |

---

## Testing Checklist

- [ ] Phase 0 bug fix: `TextContact()` in `message-contacts.php` uses `mobile_phone_format`
- [ ] Phase 0 bug fix: Calendar reminders cron uses `mobile_phone_format`
- [ ] Composer install of libphonenumber succeeds
- [ ] Country name-to-ISO mapping covers all distinct `country` values in production DB
- [ ] US numbers with no country context still format correctly (backward compatible)
- [ ] Philippines number `63-908-221-4025` formats to `+639082214025`
- [ ] Philippines local format `09082214025` formats to `+639082214025` with country=Philippines
- [ ] UK number `07911 123456` formats to `+447911123456` with country=United Kingdom
- [ ] Numbers with `00` prefix (e.g., `0063-908-221-4025`) are handled
- [ ] Already-formatted E.164 numbers (with `+`) pass through unchanged
- [ ] Invalid/short numbers return `null`
- [ ] All 10+ call sites pass `$country` parameter
- [ ] CSV import passes country column to formatter
- [ ] `home_phone_format` and `work_phone_format` columns added to schema
- [ ] AddContact populates all three `*_format` columns
- [ ] UpdateContact updates all three `*_format` columns when relevant fields change
- [ ] Backfill migration script runs without errors on production data
- [ ] Defensive guard in `SendText()` rejects non-E.164 numbers gracefully
- [ ] All test cases in test script pass

---

## Files to Edit

| File | Line(s) | Change | Phase |
|------|---------|--------|-------|
| `oilylife/lib/message-contacts.php` | 326 | Use `mobile_phone_format` instead of `mobile_phone` | 0 |
| `oilylife/cron/send-calendar-reminders.php` | 248 | Use `mobile_phone_format` instead of `mobile_phone` | 0 |
| `oilylife/composer.json` | — | Add `giggsey/libphonenumber-for-php:^8.0` | 1 |
| `oilylife/helpers/country-code-helper.php` | **NEW** | Country name-to-ISO code mapping function | 2 |
| `oilylife/helpers/text-helper.php` | 19-31 | Rewrite `formatPhoneNumberAsE164()` with libphonenumber | 3 |
| `oilylife/models/contacts.php` | 370, 529 | Pass `$country` to `formatPhoneNumberAsE164()` | 4 |
| `oilylife/models/contacts.php` | 1784, 1808, 2030 | Audit call sites, pass country where available | 4 |
| `oilylife/controllers/contacts.php` | 1695 | Pass `$_POST['country']` to formatter in duplicate check | 4 |
| `oilylife/controllers/contacts.php` | 3358, 3377, 3385 | Pass country from CSV column mapping | 4 |
| `oilylife/lib/text-message.php` | 253 | Pass country to formatter in self-text check | 4 |
| `oilylife/cron/send-notifications.php` | 189 | Pass country to formatter for site owner phone | 4 |
| Various controllers | — | Audit remaining call sites | 4 |
| `oilylife/models/contacts.php` | 370-407, 527-533 | Add `home_phone_format`, `work_phone_format` to INSERT/UPDATE | 5 |
| DB schema | — | `ALTER TABLE contact ADD COLUMN home_phone_format, work_phone_format` | 5 |
| `oilylife/tools/migrate-phone-numbers.php` | **NEW** | Backfill script with `--dry-run` support | 5 |
| `oilylife/lib/text-message.php` | 311 | Defensive E.164 guard before Twilio API call | 6 |
| `oilylife/tools/test-phone-formatting.php` | **NEW** | CLI test script with international test cases | 7 |

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Which phone fields get E.164 columns? | All three: mobile, home, work | Future-proofs for texting/calling from any number |
| Default country when none provided? | US | Majority of user base is US-based |
| Library for phone parsing? | `giggsey/libphonenumber-for-php` | PHP port of Google's libphonenumber, industry standard |
| Keep legacy fallback in formatter? | Yes | Ensures backward compatibility if libphonenumber fails |
| Backfill existing data? | Yes, with migration script | Ensures all existing contacts get correct E.164 formatting |

---

## Implementation Status: Pending
