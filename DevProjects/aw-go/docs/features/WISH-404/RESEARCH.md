# WISH-404: VAT-Compliant Invoice Generation for Belgian/EU Customers

## Problem Statement
Belgian customers (and potentially other EU countries) require invoices with:
1. **Customer's EU VAT Number** displayed prominently
2. The word **"Invoice"** on the document
3. **Reverse charge statement** for EU VAT compliance
4. Proper legal formatting for bookkeeping and tax purposes

Currently, the "My Account History" page shows transactions in a simple table format. Jessica responded that customers can screenshot this page, but **screenshots are not legally sufficient** in Belgium because they lack:
- VAT number
- Company registration details
- Formal "Invoice" designation
- Legal reverse charge statement

---

## Customer Request Summary
**Customer:** Dorien Van Eygen (Belgium)
**Original Issue:** Needed copies of subscription receipts for bookkeeping

> "A print screen of the account history page is not sufficient in Belgium, since it doesn't mention the VAT number and the word Invoice."

---

## EU VAT Legal Requirements (Reverse Charge Mechanism)

Per TaxJar research and EU VAT Directive Article 196:

> For B2B supplies of digital services from US companies to EU businesses, VAT is accounted for by the business client under the "reverse charge" mechanism. The US supplier does NOT need to register for EU VAT.

### What Must Appear on Invoices:
1. **Customer's valid EU VAT number** (can verify via [EU VIES system](https://ec.europa.eu/taxation_customs/vies/))
2. **Reverse charge statement**, e.g.:
   - "Reverse charge - Article 196 of the EU VAT Directive"
   - or "Reverse charge - customer to account for VAT"
3. **No VAT amount charged** (€0.00 VAT)

---

## Existing Implementation Analysis

### Current "My Account History" Page

**Controller:** `oilylife/controllers/my-account.php`
- Line 286: Sets `$document_title = 'My Account History'`
- Lines 317-333: Fetches transactions from Braintree via `$Braintree->SearchTransactions()`
- Line 289: Sets view file to `my-account.html.php`

**View:** `oilylife/views/account/my-account.html.php` (240 lines)
- Lines 100-111: Header showing customer info (name, email, phone, address)
- Lines 113-181: Transaction table with columns: Date, Plan, Payment Method, Type, Status, Amount
- Data comes from Braintree API, not local database

**Navigation:** `oilylife/views/account/my-account-settings.html.php`
- Line 64: Menu item labeled "My Account History"
- Links to `/app/my-account`

### Account Fields in Database

**Model:** `oilylife/models/oil.php`
- Line 45-54: `$account_fields` array defines all account table columns
- Line 56-66: `$account_retrieval_select_sql` for fetching account data

**Current fields include:**
- `company_name` ✅ (exists)
- `address1`, `address2`, `city`, `state`, `postal_code`, `country` ✅ (exist)
- `email`, `site_phone` ✅ (exist)
- **`vat_number` ❌ (DOES NOT EXIST - needs to be added)**

### Greg's Suggested Approach
From the Slack conversation, Greg mentioned:
> "Generally though I've relied on the browser built-in 'print to pdf' feature so maybe we just need to add the words 'invoice history' to it."

This suggests a **minimal viable approach**: Enhance the existing page to be print-friendly with invoice terminology and VAT display, rather than building a full PDF generation system.

---

## Proposed Solution Options

### Option A: Enhanced Print-Friendly Page (Recommended by Greg)
**Minimal changes approach:**
1. Add `vat_number` field to account table and user profile
2. Rename "My Account History" to "Invoices" or "Invoice History"
3. Add VAT number + company info to the page header
4. Add print-specific CSS for clean PDF output via browser print

**Pros:** Simple, low effort, leverages browser print-to-PDF  
**Cons:** Less formal than actual PDF generation, requires user to print each page

### Option B: Individual Invoice Pages
**Medium complexity:**
1. Add `vat_number` field
2. Create a new route `/app/my-account/invoice/{transaction_id}` 
3. Design a proper invoice page layout for each transaction
4. User clicks a "View Invoice" button per transaction

**Pros:** Proper invoice format, more professional  
**Cons:** More development effort, still manual per-invoice

### Option C: PDF Generation with Bulk Download (Colin's Original Proposal)
**Full implementation:**
1. Add `vat_number` field
2. Install PDF library (TCPDF, DOMPDF, or wkhtmltopdf)
3. Generate proper PDF invoices
4. Add "Download All" feature for date range

**Pros:** Most professional, bulk download capability  
**Cons:** Highest effort, PHP 7.2 compatibility concerns, server-side PDF generation

---

## Recommended Approach: Option A with Date Filtering

Based on Greg's feedback and user requirements:

1. **Add VAT Number field** to account profile (`/app/my-contact-info`)
2. **Rename the page** from "My Account History" to "Invoice History" 
3. **Enhance the page header** to include:
   - GetOiling/AttractWell company info
   - Customer's company name and VAT number
   - **Reverse charge statement** ("Reverse charge - Article 196 of the EU VAT Directive")
   - Date generated
4. **Add date filtering** - filter by month OR year (e.g., "May 2024" or "All of 2025")
5. **Add print-optimized CSS** for clean browser Print-to-PDF

---

## Files to Modify

### 1. Database Schema Change
**File:** SQL migration (new file needed)
**Change:** Add `vat_number` column to `account` table
```sql
ALTER TABLE account ADD COLUMN vat_number VARCHAR(50) DEFAULT NULL AFTER company_name;
```

### 2. Model: oil.php
**File:** `oilylife/models/oil.php`
**Lines to modify:**
- Line 45-54: Add `'vat_number'` to `$account_fields` array
- Line 56-66: Add `vat_number` to `$account_retrieval_select_sql`

### 3. Account Profile Page (My Contact Info)
**File:** `oilylife/views/account/my-contact-info.html.php` (203 lines)
**Lines to modify:**
- **Lines 33-36:** After company_name field, add VAT Number input field
- Currently company_name is at lines 34-35

**Controller:** `oilylife/controllers/my-contact-info.php`
- POST handler needs to save `vat_number` field (after line ~180)

### 4. Controller: my-account.php
**File:** `oilylife/controllers/my-account.php`
**Line 286:** Change `$document_title` from `'My Account History'` to `'Invoice History'`
**NEW:** Add date filtering logic (month/year filter) to transaction query

### 5. View: my-account.html.php
**File:** `oilylife/views/account/my-account.html.php`
**Lines to modify:**
- Lines 100-111: Enhance header to include:
  - Customer's company name and VAT number
  - **Reverse charge statement**: "Reverse charge - Article 196 of the EU VAT Directive"
  - "Invoice History" terminology
- **NEW:** Add date filter dropdown UI (month/year selector)
- Add CSS for print media queries (or separate print stylesheet)

### 6. Navigation Updates
**File:** `oilylife/views/partials/account-sidebar.html.php`
**Lines 194, 688:** Change "My Account History" text to "Invoice History"

**File:** `oilylife/views/account/my-account-settings.html.php`
**Line 64:** Change `link_text` from "My Account History" to "Invoice History"

---

## Detailed Implementation Guide

### Step 1: Database Migration
Create SQL to add `vat_number` column:

**New file:** Execute directly on database or create migration script
```sql
ALTER TABLE account 
ADD COLUMN vat_number VARCHAR(50) DEFAULT NULL 
AFTER company_name;
```

### Step 2: Update oil.php (Model)

**File:** `oilylife/models/oil.php`

**Line 45:** Find the `$account_fields` array and add `'vat_number'` after `'company_name'`:
```php
private $account_fields = ['email', 'password', 'first_name', 'middle_name', 'last_name', 'company_name', 'vat_number', 'sitename', ...
```

**Line 56-66:** Find `$account_retrieval_select_sql` and add `vat_number` after `company_name`:
```php
private $account_retrieval_select_sql = 'id, email, password, first_name, middle_name, last_name, company_name, vat_number, sitename, ...
```

### Step 3: Add VAT Input to Profile Page

**File:** `oilylife/views/account/my-contact-info.html.php`
**Insert after line 36** (after company_name input `</div>`):

```html
<div class="col_half col_last">
    <label for="vat_number">VAT Number (EU Customers)</label>
    <input type="text" tabindex="5" id="vat_number" name="vat_number" maxlength="50" 
           value="<?=htmlspecialchars((string)($account_info['vat_number'] ?? ''));?>" 
           placeholder="e.g. BE0123456789" class="form-control input-block-level dirty-watch" />
    <div class="thin-font">For EU invoicing compliance</div>
</div>
<div class="clear"></div>
```

**Also update:** `oilylife/controllers/my-contact-info.php` 
In the `SetAccountContactInfoById()` call, add `'vat_number'` to the saved fields.

### Step 4: Update Controller my-account.php

**File:** `oilylife/controllers/my-account.php`
**Line 286:** Change:
```php
$document_title = 'My Account History';
```
To:
```php
$document_title = 'Invoice History';
```

**NEW - Date Filtering:** Around line 317-333 where transactions are fetched, add month/year filter parameters from $_GET and filter the Braintree transaction results.

### Step 5: Enhance View my-account.html.php

**File:** `oilylife/views/account/my-account.html.php`

**Lines ~100-111:** Modify the header section to include:
1. Customer's company name and VAT number
2. **Reverse charge statement**: "Reverse charge - Article 196 of the EU VAT Directive"
3. "Invoice History" terminology

**NEW - Add date filter UI** (before line 112):
```html
<div class="filter-bar">
    <select id="filter-month">...</select>
    <select id="filter-year">...</select>
    <button onclick="filterInvoices()">Filter</button>
</div>
```

Add print-friendly CSS either inline or via a `@media print` block.

### Step 6: Update Navigation Labels

**File:** `oilylife/views/partials/account-sidebar.html.php`
- **Line 194:** Change `'text' => 'My Account History'` to `'text' => 'Invoice History'`
- **Line 688:** Same change

**File:** `oilylife/views/account/my-account-settings.html.php`
- **Line 64:** Change `'link_text' => 'My Account History'` to `'link_text' => 'Invoice History'`

---

## Verification Plan

### Manual Testing (Primary Method)
Since this codebase doesn't have automated tests for the UI:

1. **Database Change:**
   - Verify column exists: `DESCRIBE account;` (check for `vat_number`)
   - Test inserting/updating VAT number manually

2. **Profile Page:**
   - Navigate to account profile/settings
   - Verify VAT Number field is visible
   - Enter a test VAT number (e.g., "BE0123456789")
   - Save and verify it persists

3. **Invoice History Page:**
   - Navigate to `/app/my-account`
   - Verify page title says "Invoice History" not "My Account History"
   - Verify VAT number is displayed in the header
   - Verify GetOiling/AttractWell company info is displayed

4. **Print-to-PDF:**
   - Use browser's Print function (Cmd/Ctrl+P)
   - Verify the printed output looks like a proper invoice
   - Verify VAT numbers are visible in print output

5. **Navigation:**
   - Verify sidebar menu shows "Invoice History"
   - Verify Settings page shows "Invoice History"

---

## Remaining Questions

1. **GetOiling/AttractWell company details:** Should these appear on the invoice? If so, what info? (Company name, address, country - note: US companies don't have/need EU VAT numbers)

2. **VAT validation:** Should we validate EU VAT numbers against the EU VIES system, or just accept any input?

---

## Summary of Requirements (Confirmed)

✅ **VAT Number Field** - Add to account profile at `/app/my-contact-info`  
✅ **Reverse Charge Statement** - "Reverse charge - Article 196 of the EU VAT Directive"  
✅ **Rename to Invoice History** - Change all "My Account History" labels  
✅ **Date Filtering** - Filter by month (e.g., May 2024) or year (e.g., all 2025)  
✅ **Print-Friendly CSS** - Clean output for browser Print-to-PDF  

---

## References

- **Slack conversation:** Jan 26th regarding approach
- **Freshdesk ticket:** 213778
- **TaxJar EU VAT Guide:** taxjar.com/blog/guide-european-vat-b2b-digital-services-sellers
- **EU VIES VAT Verification:** ec.europa.eu/taxation_customs/vies/
- **Customer:** Dorien Van Eygen, Belgium
- **Related Pattern:** Similar to how receipts are handled in other SaaS platforms
