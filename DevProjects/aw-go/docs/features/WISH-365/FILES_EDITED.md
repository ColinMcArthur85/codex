# Files Edited - WISH-365: Search Feature for Past Actions

## Summary
Implemented a search feature for the "Past Actions" section on contact cards. Users can now search by keyword across notes, email subjects, and email bodies.

---

## Files Modified

### 1. `oilylife/models/contacts.php`

**Function Modified:** `GetContactActions()`

**Changes:**
- Added new `$search_text` parameter to the function signature
- Implemented text search filtering using SQL LIKE clauses
- Search covers direct fields: `note`, `subject`, `body`
- Added subqueries to search related tables: `marketing_message` (subject, body, text_message) and `contact_message` (subject, body)
- Created separate param arrays for COUNT and SELECT queries to avoid PDO reference consumption issues

### 2. `oilylife/controllers/contacts.php`

**Changes:**
- Updated the `GetContactActions()` call to pass `$_GET['search_text']` parameter

### 3. `oilylife/views/account/contact-view.html.php`

**UI Changes:**
- Added search input field in Past Actions panel header
- Added clear (X) button that appears when search text is entered
- Styled to match existing UI elements

**JavaScript Changes:**
- Added `past_action_search_text` variable to store current search query
- Updated `loadHistory()` AJAX call to include `search_text` parameter
- Added debounced (300ms) input event handler for search
- Added click handler for clear button
- Updated "no results" message to show search term when no matches found
- Fixed pagination reset (0-indexed) when searching

---

## Technical Notes

### Search Implementation
The search uses a combination of direct field searches and subqueries:
```sql
WHERE (
    note LIKE '%keyword%' 
    OR subject LIKE '%keyword%' 
    OR body LIKE '%keyword%'
    OR id IN (SELECT ... FROM marketing_message WHERE subject/body LIKE ...)
    OR id IN (SELECT ... FROM contact_message WHERE subject/body LIKE ...)
)
```

This approach was chosen to avoid modifying the shared `contact_actions_date_sql` property which contains hardcoded table references used throughout the codebase.

### Parameter Binding
Separate parameter arrays are created for COUNT and SELECT queries to prevent PDO from consuming references incorrectly when the same array is passed to both queries.

---

## Testing Completed
- ✅ Search finds notes by content
- ✅ Search finds emails by subject
- ✅ Search finds emails by body content
- ✅ Search works with existing type filters (AND logic)
- ✅ Clear button resets search and shows all actions
- ✅ Pagination resets to page 1 when searching
- ✅ Debounce prevents excessive API calls while typing
