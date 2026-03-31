# WISH-404: Files Reference for Manual Implementation

> 📋 **Purpose**: Exact file locations and line numbers for implementing VAT invoice feature.

---

## Quick Summary

| Task | File | Lines |
|------|------|-------|
| Add `vat_number` to DB | SQL migration | N/A |
| Add to account fields array | `oilylife/models/oil.php` | **45** |
| Add to retrieval SQL | `oilylife/models/oil.php` | **56** |
| Add VAT input to profile | `oilylife/views/account/my-contact-info.html.php` | After **36** |
| Save VAT in controller | `oilylife/controllers/my-contact-info.php` | ~**180** |
| Rename page title | `oilylife/controllers/my-account.php` | **286** |
| Add date filtering | `oilylife/controllers/my-account.php` | **317-333** |
| Enhance invoice header | `oilylife/views/account/my-account.html.php` | **100-111** |
| Update sidebar nav | `oilylife/views/partials/account-sidebar.html.php` | **194, 688** |
| Update settings menu | `oilylife/views/account/my-account-settings.html.php` | **64** |

---

## 1. Database: Add VAT Column

**Type:** SQL Migration

```sql
ALTER TABLE account 
ADD COLUMN vat_number VARCHAR(50) DEFAULT NULL 
AFTER company_name;
```

---

## 2. Model: oil.php

**File:** `oilylife/models/oil.php`

### Line 45: Add to `$account_fields` array

**Current (line 45):**
```php
private $account_fields = ['email', 'password', 'first_name', 'middle_name', 'last_name', 'company_name', 'sitename',
```

**Change to:**
```php
private $account_fields = ['email', 'password', 'first_name', 'middle_name', 'last_name', 'company_name', 'vat_number', 'sitename',
```

### Line 56: Add to `$account_retrieval_select_sql`

**Current (line 56):**
```php
private $account_retrieval_select_sql = 'id, email, password, first_name, middle_name, last_name, company_name, sitename,
```

**Change to:**
```php
private $account_retrieval_select_sql = 'id, email, password, first_name, middle_name, last_name, company_name, vat_number, sitename,
```

---

## 3. Profile View: my-contact-info.html.php

**File:** `oilylife/views/account/my-contact-info.html.php`
**Insert after line 36** (after company_name `</div>`):

```php
    <div class="col_half col_last">
        <label for="vat_number">VAT Number (EU Customers)</label>
        <input type="text" tabindex="5" id="vat_number" name="vat_number" maxlength="50" 
               value="<?=htmlspecialchars((string)($account_info['vat_number'] ?? ''));?>" 
               placeholder="e.g. BE0123456789" class="form-control input-block-level dirty-watch" />
        <div class="thin-font">For EU invoicing compliance</div>
    </div>

    <div class="clear"></div>
```

---

## 4. Profile Controller: my-contact-info.php

**File:** `oilylife/controllers/my-contact-info.php`
**Location:** Find the `SetAccountContactInfoById()` function call (around line 180)
**Add:** `'vat_number'` to the list of fields being saved

---

## 5. Invoice Controller: my-account.php

**File:** `oilylife/controllers/my-account.php`

### Line 286: Rename page title

```php
// Change from:
$document_title = 'My Account History';

// Change to:
$document_title = 'Invoice History';
```

### Lines 317-333: Add date filtering (NEW)

Add month/year filter parameters to filter Braintree transaction results.

---

## 6. Invoice View: my-account.html.php

**File:** `oilylife/views/account/my-account.html.php`

### Lines 100-111: Enhance header

**Add to header section:**
1. Customer's company name: `<?=htmlspecialchars((string)$account_info['company_name'])?>`
2. Customer's VAT number: `<?=htmlspecialchars((string)($account_info['vat_number'] ?? ''))?>`
3. **Reverse charge statement:**
   ```html
   <div class="reverse-charge-notice">Reverse charge - Article 196 of the EU VAT Directive</div>
   ```

### Add Date Filter UI (NEW)

```html
<div class="invoice-filter-bar">
    <label>Filter:</label>
    <select id="filter-month" name="filter_month">
        <option value="">All Months</option>
        <option value="1">January</option>
        <!-- ... etc -->
    </select>
    <select id="filter-year" name="filter_year">
        <option value="">All Years</option>
        <option value="2025">2025</option>
        <option value="2024">2024</option>
    </select>
    <button type="button" onclick="applyFilter()">Apply</button>
</div>
```

---

## 7. Navigation: account-sidebar.html.php

**File:** `oilylife/views/partials/account-sidebar.html.php`

### Line 194:
```php
// Change:
'text' => 'My Account History'
// To:
'text' => 'Invoice History'
```

### Line 688:
```php
// Change:
'text' => 'My Account History'
// To:
'text' => 'Invoice History'
```

---

## 8. Settings Menu: my-account-settings.html.php

**File:** `oilylife/views/account/my-account-settings.html.php`
**Line 64:**

```php
// Change:
'link_text' => 'My Account History'
// To:
'link_text' => 'Invoice History'
```

---

## 9. Print CSS (Optional)

Add to `my-account.html.php` or stylesheet:

```css
@media print {
    .sidebar, .navbar, .footer, .btn, .invoice-filter-bar { display: none !important; }
    .reverse-charge-notice { font-weight: bold; margin: 10px 0; }
    h4 { font-size: 18pt; margin-bottom: 20pt; }
    .table { border-collapse: collapse; width: 100%; }
    .table th, .table td { border: 1px solid #ddd; padding: 8px; }
}
```

---

## Testing Checklist

### Database
- [ ] Run SQL migration
- [ ] Verify column exists: `DESCRIBE account;`

### Profile Page (`/app/my-contact-info`)
- [ ] VAT Number field is visible
- [ ] Saving VAT number works (persists after refresh)

### Invoice History Page (`/app/my-account`)
- [ ] Page title shows "Invoice History"
- [ ] Company name is displayed
- [ ] VAT number is displayed (if entered)
- [ ] Reverse charge statement is visible
- [ ] Date filter dropdown works
- [ ] Browser Print → PDF looks clean

### Navigation
- [ ] Sidebar shows "Invoice History" (not "My Account History")
- [ ] Settings menu shows "Invoice History"
