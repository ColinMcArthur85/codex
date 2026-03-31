# WISH-310: Office Phone 'Call Icon' Fix

## Problem Statement
The "Call" icon (`icon-phone3`) only appears for **mobile phone numbers** in the contact manager UI. For **office phone numbers** (stored as `work_phone` in the database) and **home phone numbers**, the icon is missing, creating an inconsistent user experience.

Users expect to be able to initiate calls to office phones in the same way they can for mobile phones.

---

## Current Behavior
- **Mobile Phone**: Displays the phone number with Text, Chat, and **Call** icons.
- **Office Phone (work_phone)**: Displays only the phone number with a `tel:` link (no Call icon).
- **Home Phone**: Displays only the phone number with a `tel:` link (no Call icon).

---

## Proposed Solution
Add the "Call" icon button for **both office phone and home phone numbers** to match the mobile phone functionality.

The Call icon should:
1. Use the same `.make-call` class and data attributes as the mobile phone call button.
2. Trigger the same Modal/SweetAlert2 popup flow that initiates the call via the premium texting system.
3. Show the same tooltip explaining that "Your phone will ring first, then you will be connected to them."

---

## Technical Analysis

### Code Location
The primary file responsible for rendering the contact panel (including phone numbers and action icons) is:
- **`oilylife/helpers/contact-panel-helper.php`**

### Key Code Section: Mobile Phone with Call Icon (Lines 191-221)
The mobile phone section includes the Call icon with this structure:
```php
' <a style="display:inline-block;margin-left:10px;' . ($one_line_view ? $header_icon_base_style . $header_icon_base_style_no_select . 'padding-right:15px;' : '') . '" class="make-call" ' .
    'data-contact-name="' . htmlspecialchars((string)$contact['first_name'] . ' ' . $contact['last_name']) . '" ' .
    'data-contact-phone="' . htmlspecialchars((string)$contact['mobile_phone']) . '" ' .
    'href="#" data-contact-id="' . htmlspecialchars((string)$contact['id']) . '" data-toggle="tooltip" ' .
    'title="Call ' . htmlspecialchars((string) trim( $contact['first_name'] . ' ' . $contact['last_name'] ) ) . '. Your phone will ring first, then you will be connected to them.">' .
    '<i class="icon-phone3"></i>' . ($one_line_view ? '' : ' Call') . '</a>'
```

### Key Code Section: Home Phone WITHOUT Call Icon (Lines 230-234)
```php
if( $contact['home_phone'] != '' )
    $panelHTML .= '<div><a href="tel:' . htmlspecialchars((string)$contact['home_phone']) .
        '" data-toggle="tooltip" data-placement="right" title="Home phone" class="contact-phone-link">' .
        '<div class="contact-info-phone-type-icon"><i class="icon-line2-home"></i></div><span> ' .
        htmlspecialchars((string)$contact['home_phone']) . '</span></a></div>';
```

### Key Code Section: Office Phone WITHOUT Call Icon (Lines 236-240)
```php
if( $contact['work_phone'] != '' )
    $panelHTML .= '<div><a href="tel:' . htmlspecialchars((string)$contact['work_phone']) .
        '" data-toggle="tooltip" data-placement="right" title="Work phone" class="contact-phone-link">' .
        '<div class="contact-info-phone-type-icon"><i class="icon-building"></i></div><span> ' .
        htmlspecialchars((string)$contact['work_phone']) . '</span></a></div>';
```

### Condition for Call Icon
The Call icon is only rendered when `$two_way_texting_enabled` is true:
```php
($two_way_texting_enabled
    ? ...call icon HTML...
    : '');
```

This means the Call icon feature is tied to the Premium Texting feature being enabled.

---

## Implementation Plan

### Step 1: Identify Insertion Points
Insert the Call icon HTML after both the home phone and office phone `tel:` links, similar to how it's done for mobile phone.

### Step 2: Modify `contact-panel-helper.php` - Home Phone (Lines 230-234)
Update to add the Call icon when `$two_way_texting_enabled` is true and `$link_contact_info` is true.

The updated code should:
1. Keep the existing `tel:` link with the home icon
2. Add a Call icon button using the same pattern as mobile phone
3. Use `$contact['home_phone']` in the data attributes

### Step 3: Modify `contact-panel-helper.php` - Office Phone (Lines 236-240)
Update to add the Call icon when `$two_way_texting_enabled` is true and `$link_contact_info` is true.

The updated code should:
1. Keep the existing `tel:` link with the building icon
2. Add a Call icon button using the same pattern as mobile phone
3. Use `$contact['work_phone']` in the data attributes

### Step 4: Test the Implementation
1. Verify the Call icon appears for contacts with home phone numbers
2. Verify the Call icon appears for contacts with office phone numbers
3. Click each Call icon and ensure the SweetAlert2 popup appears
4. Confirm the call initiates correctly (Premium Texting must be enabled)
5. Verify the tooltip displays correctly for each phone type
6. Confirm the Call icon does NOT appear when 2-way texting is disabled

---

## 🐛 CSS Bug Discovered: Icon Alignment Issue

### Problem Observed
When all three phone number fields (mobile, home, work) are present, the **work phone icon gets pushed to the right** and doesn't align with the other icons.

### Root Cause
The `.contact-info-phone-type-icon` class in `contact-panel.html.php` (lines 17-24) uses `float: left`:

```css
.contact-info-phone-type-icon {
    display: inline-block;
    width: 1.3em;
    text-align: center;
    font-weight: 300;
    float: left;        /* ← CAUSES ALIGNMENT ISSUE */
    padding-right: 5px;
}
```

This is an **outdated CSS pattern** from before flexbox. When floated elements stack up and one row has more content (like mobile with Text/Chat/Call buttons), the floats from previous rows interfere with subsequent rows - a classic "float clearing" problem.

### Recommended Fix
Remove `float: left` and add `vertical-align: middle` for better alignment:

```css
.contact-info-phone-type-icon {
    display: inline-block;
    width: 1.3em;
    text-align: center;
    font-weight: 300;
    /* float: left; REMOVED */
    padding-right: 5px;
    vertical-align: middle; /* ADDED */
}
```

### Risk Assessment
| Concern | Assessment |
|---------|------------|
| Browser Support | Modern `inline-block` handles this correctly |
| Text Wrapping | Numbers are in `<span>` tags - won't wrap anyway |
| Other Uses | Class used in 10+ places - all simple icon+text patterns |
| **Risk Level** | **Very Low** |

---

## Implementation Checklist

### PHP Changes (contact-panel-helper.php)
- [ ] Add Call icon to **home phone** section (lines 230-234)
- [ ] Add Call icon to **office phone** section (lines 236-240)
- [ ] Ensure both are gated by `$two_way_texting_enabled` and `$link_contact_info`

### CSS Fix (contact-panel.html.php)
- [ ] Remove `float: left` from `.contact-info-phone-type-icon` (line 22)
- [ ] Add `vertical-align: middle` for better alignment

### Testing
- [ ] Verify Call icon appears for home phone (when 2-way texting enabled)
- [ ] Verify Call icon appears for office phone (when 2-way texting enabled)
- [ ] Verify icons align correctly when all three phone types present
- [ ] Verify Call icon does NOT appear when 2-way texting disabled
- [ ] Click each Call icon and confirm SweetAlert2 popup works
- [ ] Test on both light mode and dark mode

---

## Decisions Made ✅
- [x] **Home phone included:** Yes, add the Call icon for home phone numbers as well
- [x] **Premium Texting gating:** Yes, the Call icon should only appear when `$two_way_texting_enabled` is true (matches mobile behavior)
- [x] **CSS fix included:** Yes, fix the `float: left` alignment bug as part of this feature
- [ ] **Edge cases:** TBD - Consider if invalid phone formats need special handling

---

## Related Files Summary

| File | Purpose |
|------|---------|
| `oilylife/helpers/contact-panel-helper.php` | Main file rendering contact panels with phone icons |
| `oilylife/views/contacts/contact-panel.html.php` | View template that includes contact panel styling |
| `oilylife/controllers/contacts.php` | Controller handling contact actions including call initiation |

---

## References
- Line 213-218 in `contact-panel-helper.php`: Mobile phone Call icon implementation (reference pattern)
- Line 230-234 in `contact-panel-helper.php`: Home phone display (needs Call icon)
- Line 236-240 in `contact-panel-helper.php`: Office phone display (needs Call icon)
- Line 448-513 in `contact-panel-helper.php`: `GenerateContactCallScript()` function for call handling JS
