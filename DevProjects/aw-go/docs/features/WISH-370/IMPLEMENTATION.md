# WISH-370: Client-Side E.164 Phone Number Formatter

## Overview

This implementation adds a **client-side, user-prompted** phone number formatter to the contact add/edit screen. When a user enters or edits a phone number, they can click a "Check Format" button to validate and convert the number to E.164 format. If a formatted version is available, the UI displays a suggestion like:

> **+1 701-555-1234** [Use this format]

The user explicitly accepts the formatted version by clicking the suggestion. This respects users who are particular about formatting while still enabling data cleanup.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Trigger mechanism** | "Check Format" button next to each phone field | Explicit user action, non-intrusive |
| **Applies to** | All three phone fields: `mobile_phone`, `work_phone`, `home_phone` | Comprehensive coverage |
| **Country context** | Use the `#country` select value and its `yl_country_code` | Already available in the form; provides accurate parsing |
| **JavaScript library** | **None — custom inline JavaScript** | Zero dependencies, no update/maintenance burden, lightweight |
| **Fallback for no country** | Default to `US` | Majority of user base is US-based |
| **UI pattern** | Inline suggestion below phone input (similar to address validation) | Non-blocking, user-controlled |

---

## Files to Modify

| File | Change | Status |
|------|--------|--------|
| `oilylife/views/account/contact-edit.html.php` | Add "Check Format" buttons, suggestion UI, CSS, and custom JavaScript logic | Pending |

**No external libraries required.**

---

## How the Custom Formatter Works

The custom JavaScript formatter:

1. **Strips all non-digit characters** from the input (except a leading `+`)
2. **Looks up the country calling code** based on the selected country (e.g., `Philippines` → `63`)
3. **Handles common local formats**:
   - Leading `0` (trunk prefix) — stripped when country is known (e.g., `09082214025` → `9082214025`)
   - Leading `00` (international dialing prefix) — replaced with `+`
4. **Validates length** — E.164 requires 7-15 digits after the `+`
5. **Constructs the E.164 format** — `+` + country calling code + national number

### Country Calling Code Map

Built from `countries.config.php` which already has `yl_country_code`. We add a small inline map of ISO codes → calling codes:

```javascript
var callingCodes = {
    'US': '1', 'CA': '1', 'GB': '44', 'AU': '61', 'NZ': '64',
    'PH': '63', 'MX': '52', 'JP': '81', 'DE': '49', 'FR': '33',
    'IT': '39', 'ES': '34', 'NL': '31', 'BE': '32', 'AT': '43',
    'CH': '41', 'IE': '353', 'IN': '91', 'SG': '65', 'HK': '852',
    'MY': '60', 'ID': '62', 'TH': '66', 'VN': '84', 'KR': '82',
    'TW': '886', 'BR': '55', 'AR': '54', 'CO': '57', 'CL': '56',
    'PE': '51', 'ZA': '27', 'NG': '234', 'KE': '254', 'EG': '20',
    'AE': '971', 'SA': '966', 'IL': '972', 'RU': '7', 'UA': '380',
    'PL': '48', 'SE': '46', 'NO': '47', 'DK': '45', 'FI': '358',
    // ... (full list in implementation)
};
```

This is a **static, inline map** — no external file needed.

---

## Detailed Implementation

### Step 1: Modify `contact-edit.html.php`

#### 1.1 Add "Check Format" Button Next to Each Phone Field

Uses Bootstrap 3's `input-group` and `input-group-btn` pattern (already used elsewhere in the app), plus the existing `button button-green` class.

**Mobile Phone (lines 261-263):**

Current:
```php
<label for="mobile_phone">Mobile Phone</span></label>
<input type="text" tabindex="6" id="mobile_phone" name="mobile_phone" ... />
```

Modified:
```php
<label for="mobile_phone">Mobile Phone</label>
<div class="input-group">
    <input type="text" tabindex="6" id="mobile_phone" name="mobile_phone" value="<?=htmlspecialchars((string)$contact['mobile_phone']);?>" maxlength="50" class="form-control input-block-level" />
    <span class="input-group-btn">
        <button type="button" class="button button-green check-phone-format-btn" data-phone-field="mobile_phone">Check Format</button>
    </span>
</div>
<div id="mobile_phone_suggestion" class="alert alert-info phone-format-suggestion" style="display:none; margin-top:5px; margin-bottom:0;"></div>
```

**Work Phone (lines 265-266):**

Modified:
```php
<label for="work_phone" class="second-line-top-margin">Office phone</label>
<div class="input-group">
    <input type="text" tabindex="7" id="work_phone" name="work_phone" value="<?=htmlspecialchars((string)$contact['work_phone']);?>" maxlength="50" class="form-control input-block-level" />
    <span class="input-group-btn">
        <button type="button" class="button button-green check-phone-format-btn" data-phone-field="work_phone">Check Format</button>
    </span>
</div>
<div id="work_phone_suggestion" class="alert alert-info phone-format-suggestion" style="display:none; margin-top:5px; margin-bottom:0;"></div>
```

**Home Phone (lines 274-275):**

Modified:
```php
<label for="home_phone">Home phone</label>
<div class="input-group">
    <input type="text" tabindex="8" id="home_phone" name="home_phone" value="<?=htmlspecialchars((string)$contact['home_phone']);?>" maxlength="50" class="form-control input-block-level" />
    <span class="input-group-btn">
        <button type="button" class="button button-green check-phone-format-btn" data-phone-field="home_phone">Check Format</button>
    </span>
</div>
<div id="home_phone_suggestion" class="alert alert-info phone-format-suggestion" style="display:none; margin-top:5px; margin-bottom:0;"></div>
```

#### 1.2 Add Minimal CSS Styling

Most styling comes from Bootstrap 3's built-in classes (`input-group`, `alert`, etc.) and the existing `button button-green` class.

Only add these minimal overrides to the existing `<style>` block (around line 19):

```css
/* WISH-370: E.164 Phone Formatter - minimal custom styles */
.phone-format-suggestion .formatted-number {
    font-weight: bold;
}
.phone-format-suggestion.alert-danger .formatted-number {
    color: inherit;
}

```

#### 1.3 Add Custom JavaScript Logic (Zero Dependencies)

Add to the existing `$(function() { ... })` block (around line 563):

```javascript
// ========================================
// WISH-370: E.164 Phone Number Formatter
// Custom implementation — no external libraries
// ========================================

// Map of country names to ISO codes (injected from PHP)
var countryIsoMap = <?php
    $isoMap = [];
    foreach ($GLOBALS['country_list'] as $countryName => $countryData) {
        $isoMap[$countryName] = $countryData['yl_country_code'];
    }
    echo json_encode($isoMap);
?>;

// Map of ISO country codes to phone calling codes
// This is a static inline map — covers the countries in countries.config.php
var callingCodes = {
    'US': '1', 'CA': '1', 'GB': '44', 'AU': '61', 'NZ': '64', 'SG': '65',
    'AF': '93', 'AL': '355', 'DZ': '213', 'AS': '1684', 'AD': '376',
    'AO': '244', 'AI': '1264', 'AG': '1268', 'AR': '54', 'AM': '374',
    'AW': '297', 'AT': '43', 'AZ': '994', 'BS': '1242', 'BH': '973',
    'BD': '880', 'BB': '1246', 'BY': '375', 'BE': '32', 'BZ': '501',
    'BJ': '229', 'BM': '1441', 'BT': '975', 'BO': '591', 'BA': '387',
    'BW': '267', 'BR': '55', 'IO': '246', 'BN': '673', 'BG': '359',
    'BF': '226', 'BI': '257', 'KH': '855', 'CM': '237', 'CV': '238',
    'KY': '1345', 'CF': '236', 'TD': '235', 'CL': '56', 'CN': '86',
    'CX': '61', 'CC': '61', 'CO': '57', 'KM': '269', 'CG': '242',
    'CD': '243', 'CK': '682', 'CR': '506', 'HR': '385', 'CU': '53',
    'CY': '357', 'CZ': '420', 'DK': '45', 'DJ': '253', 'DM': '1767',
    'DO': '1809', 'TL': '670', 'EC': '593', 'EG': '20', 'SV': '503',
    'GQ': '240', 'ER': '291', 'EE': '372', 'ET': '251', 'FK': '500',
    'FO': '298', 'FJ': '679', 'FI': '358', 'FR': '33', 'GF': '594',
    'PF': '689', 'GA': '241', 'GM': '220', 'GE': '995', 'DE': '49',
    'GH': '233', 'GI': '350', 'GR': '30', 'GL': '299', 'GD': '1473',
    'GP': '590', 'GU': '1671', 'GT': '502', 'GN': '224', 'GW': '245',
    'GY': '592', 'HT': '509', 'HN': '504', 'HK': '852', 'HU': '36',
    'IS': '354', 'IN': '91', 'ID': '62', 'IR': '98', 'IQ': '964',
    'IE': '353', 'IL': '972', 'IT': '39', 'CI': '225', 'JM': '1876',
    'JP': '81', 'JE': '44', 'JO': '962', 'KZ': '7', 'KE': '254',
    'KI': '686', 'KR': '82', 'XK': '383', 'KW': '965', 'KG': '996',
    'LA': '856', 'LV': '371', 'LB': '961', 'LS': '266', 'LR': '231',
    'LY': '218', 'LI': '423', 'LT': '370', 'LU': '352', 'MO': '853',
    'MK': '389', 'MG': '261', 'MW': '265', 'MY': '60', 'MV': '960',
    'ML': '223', 'MT': '356', 'MH': '692', 'MQ': '596', 'MR': '222',
    'MU': '230', 'YT': '262', 'MX': '52', 'FM': '691', 'MD': '373',
    'MC': '377', 'MN': '976', 'ME': '382', 'MS': '1664', 'MA': '212',
    'MZ': '258', 'MM': '95', 'NA': '264', 'NR': '674', 'NP': '977',
    'NL': '31', 'NC': '687', 'NI': '505', 'NE': '227', 'NG': '234',
    'NU': '683', 'NF': '672', 'MP': '1670', 'NO': '47', 'OM': '968',
    'PK': '92', 'PW': '680', 'PA': '507', 'PG': '675', 'PY': '595',
    'PE': '51', 'PH': '63', 'PN': '64', 'PL': '48', 'PT': '351',
    'PR': '1787', 'QA': '974', 'RE': '262', 'RO': '40', 'RU': '7',
    'RW': '250', 'KN': '1869', 'LC': '1758', 'VC': '1784', 'WS': '685',
    'SM': '378', 'ST': '239', 'SA': '966', 'SN': '221', 'RS': '381',
    'SC': '248', 'SL': '232', 'SK': '421', 'SI': '386', 'SB': '677',
    'SO': '252', 'ZA': '27', 'ES': '34', 'LK': '94', 'SH': '290',
    'PM': '508', 'SD': '249', 'SR': '597', 'SZ': '268', 'SE': '46',
    'CH': '41', 'SY': '963', 'TW': '886', 'TJ': '992', 'TZ': '255',
    'TH': '66', 'TG': '228', 'TK': '690', 'TO': '676', 'TT': '1868',
    'TN': '216', 'TR': '90', 'TM': '993', 'TC': '1649', 'TV': '688',
    'UG': '256', 'UA': '380', 'AE': '971', 'UM': '1', 'UY': '598',
    'UZ': '998', 'VU': '678', 'VE': '58', 'VN': '84', 'VG': '1284',
    'VI': '1340', 'WF': '681', 'EH': '212', 'YE': '967', 'ZM': '260',
    'ZW': '263'
};

/**
 * Get the ISO country code from the currently selected country in the form.
 * Falls back to 'US' if no country is selected or country not found.
 */
function getSelectedCountryCode() {
    var countryName = $('#country').val();
    if (countryName && countryIsoMap[countryName]) {
        return countryIsoMap[countryName];
    }
    return 'US'; // Default fallback
}

/**
 * Get the phone calling code for an ISO country code.
 */
function getCallingCode(isoCode) {
    return callingCodes[isoCode] || '1'; // Default to US calling code
}

/**
 * Format a phone number to E.164 using custom logic.
 * Returns an object with { success: bool, formatted: string, display: string, error: string }
 */
function formatPhoneToE164(phoneNumber, isoCountryCode) {
    if (!phoneNumber || phoneNumber.trim() === '') {
        return { success: false, formatted: null, display: null, error: 'No phone number entered' };
    }

    var original = phoneNumber.trim();
    var callingCode = getCallingCode(isoCountryCode);

    // Check if number already starts with + (possibly already E.164)
    if (original.charAt(0) === '+') {
        var digitsOnly = original.replace(/[^0-9]/g, '');
        if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
            var formatted = '+' + digitsOnly;
            return {
                success: true,
                formatted: formatted,
                display: formatted,
                alreadyFormatted: (original.replace(/[^0-9+]/g, '') === formatted),
                error: null
            };
        }
    }

    // Handle "00" international dialing prefix (e.g., 0063-908-221-4025)
    var working = original;
    if (working.match(/^00[1-9]/)) {
        working = '+' + working.substring(2);
        var digitsAfterPlus = working.replace(/[^0-9]/g, '');
        if (digitsAfterPlus.length >= 7 && digitsAfterPlus.length <= 15) {
            var formatted = '+' + digitsAfterPlus;
            return {
                success: true,
                formatted: formatted,
                display: formatted,
                error: null
            };
        }
    }

    // Strip all non-digit characters
    var digits = original.replace(/[^0-9]/g, '');

    if (digits.length === 0) {
        return { success: false, formatted: null, display: null, error: 'No digits found in phone number' };
    }

    // Check if number already starts with the country calling code
    if (digits.indexOf(callingCode) === 0) {
        // Number already has country code (e.g., 639082214025 for Philippines)
        var nationalPart = digits.substring(callingCode.length);
        if (nationalPart.length >= 4 && nationalPart.length <= 14) {
            var formatted = '+' + digits;
            if (formatted.length >= 8 && formatted.length <= 16) {
                return {
                    success: true,
                    formatted: formatted,
                    display: '+' + callingCode + ' ' + nationalPart,
                    error: null
                };
            }
        }
    }

    // Handle local trunk prefix (leading 0) — common in UK, Philippines, Australia, etc.
    // Only strip if the remaining number length is reasonable
    if (digits.charAt(0) === '0' && digits.length > 7) {
        digits = digits.substring(1);
    }

    // Construct E.164: + country code + national number
    var e164 = '+' + callingCode + digits;

    // Validate E.164 length (should be 8-16 characters including +)
    if (e164.length < 8 || e164.length > 16) {
        return {
            success: false,
            formatted: null,
            display: null,
            error: 'Phone number length is invalid (too short or too long)'
        };
    }

    return {
        success: true,
        formatted: e164,
        display: '+' + callingCode + ' ' + digits,
        error: null
    };
}

/**
 * Show a formatted phone number suggestion below the input field.
 * Uses Bootstrap 3 alert classes (alert-info, alert-danger) and existing button styles.
 */
function showPhoneSuggestion(fieldId, result) {
    var $suggestion = $('#' + fieldId + '_suggestion');

    if (result.success) {
        var currentValue = $('#' + fieldId).val().trim();

        // Check if it's already in E.164 format
        if (result.alreadyFormatted || currentValue.replace(/[^0-9+]/g, '') === result.formatted) {
            $suggestion.removeClass('alert-danger').addClass('alert-info')
                       .html('<span class="formatted-number">' + result.formatted + '</span> — Already in correct format ✓')
                       .show();
            return;
        }

        $suggestion.removeClass('alert-danger').addClass('alert-info')
                   .html('<span class="formatted-number">' + result.display + '</span> ' +
                         '<button type="button" class="button button-green button-small nomargin" data-field="' + fieldId + '" data-value="' + result.formatted + '" style="margin-left:10px;">Use this format</button>')
                   .show();
    } else {
        $suggestion.removeClass('alert-info').addClass('alert-danger')
                   .html(result.error + '. Please check the number and country selection.')
                   .show();
    }
}

/**
 * Hide the phone suggestion for a field.
 */
function hidePhoneSuggestion(fieldId) {
    $('#' + fieldId + '_suggestion').hide();
}

// Handle "Check Format" button clicks
$(document).on('click', '.check-phone-format-btn', function() {
    var fieldId = $(this).data('phone-field');
    var phoneValue = $('#' + fieldId).val();
    var countryCode = getSelectedCountryCode();

    var result = formatPhoneToE164(phoneValue, countryCode);
    showPhoneSuggestion(fieldId, result);
});

// Handle "Use this format" button clicks (button inside suggestion alert)
$(document).on('click', '.phone-format-suggestion .button', function() {
    var fieldId = $(this).data('field');
    var formattedValue = $(this).data('value');

    $('#' + fieldId).val(formattedValue);
    hidePhoneSuggestion(fieldId);
    globalPageDirty = true;

    toastr.success('Phone number updated to E.164 format');
});

// Hide suggestion when user starts typing in the phone field again
$('#mobile_phone, #work_phone, #home_phone').on('input', function() {
    hidePhoneSuggestion($(this).attr('id'));
});
```

---

## User Experience Flow

1. **User enters a phone number** in any of the three phone fields (e.g., `63-908-221-4025`)
2. **User selects a country** from the Country dropdown (e.g., `Philippines`)
3. **User clicks "Check Format"** button next to the phone field
4. **Custom JS parses the number**:
   - Strips non-digits
   - Looks up calling code for Philippines (`63`)
   - Detects number already starts with `63`, keeps it
   - Constructs `+639082214025`
5. **Suggestion appears** below the input:
   - ✅ Success: **+63 9082214025** [Use this format]
   - ❌ Error: "Phone number length is invalid. Please check the number and country selection."
6. **User clicks "Use this format"** → The input field updates to `+639082214025`
7. **Toast notification** confirms: "Phone number updated to E.164 format"
8. **User saves the contact** as normal

---

## Test Cases

| Input | Country | Expected Suggestion | Notes |
|-------|---------|---------------------|-------|
| `63-908-221-4025` | Philippines | `+63 9082214025` | Already has country code in number |
| `09082214025` | Philippines | `+63 9082214025` | Local mobile format (leading 0 stripped) |
| `0063-908-221-4025` | Philippines | `+639082214025` | International dialing prefix `00` |
| `+639082214025` | Any | Already in correct format ✓ | Already E.164 |
| `(701) 555-1234` | USA | `+1 7015551234` | US domestic format |
| `7015551234` | (empty) | `+1 7015551234` | Defaults to US |
| `07911 123456` | United Kingdom | `+44 7911123456` | UK mobile with trunk 0 |
| `123` | USA | Error | Too short |
| (empty) | Any | Error | No number entered |

---

## Limitations of Custom Approach

Compared to a full library like libphonenumber, this custom formatter:

- ✅ **Zero dependencies** — no updates, no bloat
- ✅ **Lightweight** — ~100 lines of JavaScript
- ✅ **Fast** — simple string manipulation
- ⚠️ **No carrier/type validation** — doesn't detect landline vs mobile
- ⚠️ **No strict length validation per country** — relies on general E.164 length rules (7-15 digits)
- ⚠️ **No formatting to local display format** — shows E.164 style only

**This is acceptable** for the use case: the goal is to clean up user-entered numbers into a consistent format, not to validate every edge case.

---

## Future Enhancements (Out of Scope)

1. **Auto-trigger on blur** — Could optionally trigger format check when user leaves the phone field
2. **Bulk formatter** — Apply formatting to existing contacts via a migration/admin tool
3. **Server-side validation** — Double-check E.164 format on save (defense in depth)
4. **CSV import integration** — Offer format suggestions during CSV import preview

---

## Dependencies

**None.** This implementation uses only:
- Inline JavaScript (~100 lines)
- Existing jQuery (already loaded on the page)
- Static calling code map (inline, derived from `countries.config.php`)

---

## Implementation Status: Pending Review
