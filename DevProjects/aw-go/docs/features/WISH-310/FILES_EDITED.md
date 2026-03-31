# Files Involved/Edited - WISH-310: Office Phone 'Call Icon' Fix

## Primary Files to Edit

### `oilylife/helpers/contact-panel-helper.php`
- **Full Path:** `/Users/colinmcarthur/DevProjects/aw-go/oilylife/helpers/contact-panel-helper.php`
- **Purpose:** Main file responsible for generating contact panel HTML, including phone numbers and action icons
- **Lines of Interest:** 
  - Lines 191-221: Mobile phone section with Call icon (reference implementation)
  - Lines 230-234: Home phone section (needs Call icon added)
  - Lines 236-240: Office phone section (needs Call icon added)
- **Change Required:** Add the `.make-call` anchor tag with Call icon after both home phone and office phone `tel:` links (only when 2-way texting is enabled)

---

### `oilylife/views/contacts/contact-panel.html.php`
- **Full Path:** `/Users/colinmcarthur/DevProjects/aw-go/oilylife/views/contacts/contact-panel.html.php`
- **Purpose:** View template that includes contact panel styling (CSS) and JavaScript event handlers
- **Lines of Interest:** 
  - Lines 17-24: `.contact-info-phone-type-icon` CSS class (has alignment bug)
  - Line 22: `float: left` property causing icon misalignment
- **Change Required:** Remove `float: left` and add `vertical-align: middle` to fix icon alignment when all phone types are present

---

## Supporting/Reference Files

### `oilylife/controllers/contacts.php`
- **Full Path:** `/Users/colinmcarthur/DevProjects/aw-go/oilylife/controllers/contacts.php`
- **Purpose:** Controller handling contact actions including call initiation
- **Lines of Interest:**
  - Line 1473: Uses `office_phone` field name (maps to `work_phone` in contact record)
- **Note:** Review to understand how calls are processed on the backend

---

## Files NOT to Edit (Reference Only)

### `oilylife/views/account/contact-edit.html.php`
- Contains the "Office phone" label and input field (line 265-266)
- No changes needed - just for understanding field naming

### `oilylife/views/account/my-contact-info.html.php`
- Contains the "Office phone" label for account settings (line 69-70)
- No changes needed - just for understanding field naming

---

## Edited Files Log
> This section will be updated as files are modified during implementation

| File | Status | Date | Notes |
|------|--------|------|-------|
| `oilylife/helpers/contact-panel-helper.php` | Pending | - | Add Call icon for home_phone and work_phone |
| `oilylife/views/contacts/contact-panel.html.php` | Pending | - | Fix CSS float alignment bug |

---

## Total Impact
- **Files to Edit:** 2
- **Estimated Lines Changed:** ~20-25 lines
  - PHP: ~15-20 lines (two Call icon additions)
  - CSS: ~2 lines (remove float, add vertical-align)
- **Risk Level:** Low (additive change + minor CSS fix)
- **Condition:** Call icons only appear when `$two_way_texting_enabled` is true
