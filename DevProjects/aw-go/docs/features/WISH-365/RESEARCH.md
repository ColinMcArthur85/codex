# WISH-365: Search Feature for "Past Actions"

## Problem
Users want to quickly find specific information within the "Past Actions" history on a contact card. When contacts have voluminous notes or long action histories, locating a specific keyword or past action becomes time-consuming.

## Proposed Solution
Add a **SEARCH** button/input to the Past Actions panel header that allows users to filter the list of past actions by keyword matching against:
- Note content
- Subject lines
- Body text
- Action descriptions

### UI Reference (from Jira Screenshots)
Based on the provided mockups:

1. **Screenshot 1 - Filter Modal Enhancement:**
   - Add a "SEARCH" button in the top-right of the Filter Past Actions modal
   - This would complement the existing type-based checkbox filtering

2. **Screenshot 2 - Past Actions Panel Header:**
   - Add a "SEARCH" button alongside the existing "CALLS" button and filter icon
   - Located in the Past Actions panel header row
   - Should integrate visually with existing UI elements

---

## Research Findings

### Confirmed: Pagination is 5 Items Per Page
Past actions are paginated with ~5 actions displayed at a time (controlled by `$this->standard_small_page_size` in the model). This means **client-side filtering alone won't work** - we need backend search to find keywords across the entire action history.

### Current Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Frontend (contact-view.html.php)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  loadHistory() function (line 1251)                                         │
│       │                                                                     │
│       ▼                                                                     │
│  $.ajax({                                                                   │
│      url: '/app/contacts',                                                  │
│      method: "GET",                                                         │
│      data: {                                                                │
│          'contact_actions_page': contact_actions_page,  // Page number      │
│          'contact_id': contact_id,                      // Contact ID       │
│          'type_filters': past_action_filters            // Array of types   │
│      }                                                                      │
│  })                                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Controller (contacts.php, line 140-143)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  if( isset($_GET['contact_actions_page']) ) {                               │
│      $contact_actions = $ContactsModel->GetContactActions(                  │
│          $contact_id,                                                       │
│          intval($_GET['contact_actions_page']),                             │
│          $site_config,                                                      │
│          $_GET['type_filters']    // <-- Currently only filters by TYPE     │
│      );                                                                     │
│      echo json_encode( $contact_actions );                                  │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Model (contacts.php, line 3994-4031)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  public function GetContactActions($contact_id, $page_number, $site_config, │
│                                     $filters = [] )                         │
│  {                                                                          │
│      // Builds SQL with type filtering:                                     │
│      // SELECT * FROM contact_actions                                       │
│      // WHERE contact_id=? AND account_id=?                                 │
│      // AND action_type IN (?, ?, ...)   <-- Type filter only               │
│      // ORDER BY action_datetime DESC                                       │
│      //                                                                     │
│      // Uses PaginateSet() for pagination (5 per page)                      │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Fields in `contact_actions` Table
From the model code, searchable fields include:
- `note` - User-entered notes
- `subject` - Email/message subject
- `body` - Email/message body content
- `action_type` - Type of action (email, call, note, etc.)
- `action_datetime` - When the action occurred

---

## Implementation Plan

### Phase 1: Backend Changes (Model + Controller)

#### 1.1 Update `GetContactActions()` in `models/contacts.php`
Add a new `$search_text` parameter that performs a LIKE search:

```php
public function GetContactActions($contact_id, $page_number, $site_config, 
                                   $filters = [], $search_text = null )
{
    // ... existing code ...

    // NEW: Add search text filtering
    if( $search_text !== null && trim($search_text) !== '' ) {
        $search_pattern = '%' . $search_text . '%';
        $extra_sql .= ' AND (note LIKE ? OR subject LIKE ? OR body LIKE ?) ';
        $params[] = &$search_pattern;
        $params[] = &$search_pattern;
        $params[] = &$search_pattern;
    }

    // ... rest of existing code ...
}
```

#### 1.2 Update Controller in `controllers/contacts.php`
Pass the new search parameter to the model:

```php
// Line ~140-143
else if( isset($_GET['contact_actions_page']) && $_GET['contact_actions_page'] != '' ) {
    $contact_actions = $ContactsModel->GetContactActions( 
        $contact_id, 
        intval($_GET['contact_actions_page']),
        $site_config, 
        $_GET['type_filters'],
        $_GET['search_text'] ?? null   // NEW parameter
    );
    echo json_encode( $contact_actions, JSON_PARTIAL_OUTPUT_ON_ERROR );
}
```

### Phase 2: Frontend Changes (View + JavaScript)

#### 2.1 Add Search Button to Panel Header
In `contact-view.html.php` around line 296, add the SEARCH button:

```html
<button id="search-past-actions" 
        class="pull-right panel-header-button <?=$panel_button_classes_light?>" 
        style="margin-right:20px;"
        data-toggle="tooltip" title="Search past actions">
    Search
</button>
```

#### 2.2 Add Search Input (Hidden by Default)
Add an expandable search input that appears when the button is clicked:

```html
<div id="search-past-actions-input-wrapper" style="display:none;">
    <input type="text" id="search-past-actions-text" class="form-control" 
           placeholder="Search notes, subjects..." style="margin-bottom:10px;">
</div>
```

#### 2.3 Update JavaScript `loadHistory()` Function
Modify the AJAX call to include the search parameter:

```javascript
function loadHistory( options ) {
    // ... existing code ...

    $.ajax({
        url: '/app/contacts',
        method: "GET",
        dataType: "json",
        data: {
            'contact_actions_page': contact_actions_page,
            'contact_id': contact_id,
            'type_filters': past_action_filters,
            'search_text': past_action_search_text   // NEW
        }
    })
    // ... rest of existing code ...
}
```

#### 2.4 Add Event Handlers
```javascript
var past_action_search_text = '';

$('#search-past-actions').click(function() {
    $('#search-past-actions-input-wrapper').toggle();
    if($('#search-past-actions-input-wrapper').is(':visible')) {
        $('#search-past-actions-text').focus();
    }
});

// Debounce search input to avoid excessive API calls
var searchTimeout;
$('#search-past-actions-text').on('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() {
        past_action_search_text = $('#search-past-actions-text').val();
        contact_actions_page = 1;  // Reset to first page
        loadHistory();
    }, 300);  // 300ms debounce
});
```

---

## Answered Questions

| Question | Answer |
|----------|--------|
| Are past actions paginated? | ✅ Yes, 5 items per page |
| Should search be client-side or backend? | ✅ **Backend** - pagination makes client-side search ineffective |
| What fields should be searchable? | `note`, `subject`, `body` (could add `action_type` display name) |
| Is there an existing search endpoint? | ❌ No dedicated search endpoint, but the existing `GetContactActions()` can be extended |

---

## Files to Edit

| File | Changes |
|------|---------|
| `oilylife/models/contacts.php` | Add `$search_text` parameter to `GetContactActions()` (~line 3994) |
| `oilylife/controllers/contacts.php` | Pass `$_GET['search_text']` to model (~line 141) |
| `oilylife/views/account/contact-view.html.php` | Add Search button, input, and JS handlers |

---

## Finalized Design Decisions

| Decision | Choice |
|----------|--------|
| Search UI Style | **(B) Always-visible search input** - search bar always visible in panel header |
| Combined Filtering | **Yes** - search text AND type filters work together (search within filtered types) |
| Location | **Panel header only** - not in the filter modal (modal is for filtering by type, not searching) |

---

## Final Implementation Plan

### Overview
Add an always-visible search input to the Past Actions panel header. When the user types, it will:
1. Send the search text to the backend (with debouncing)
2. Backend filters actions where `note`, `subject`, or `body` contain the search text
3. Combine with any active type filters (AND logic)
4. Return paginated results
5. Reset to page 1 when search text changes

### Visual Mockup (Panel Header)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Past Actions                    [🔍 Search...    ] [CALLS] [⚙️] [ADD]     │
├────────────────────────────────────────────────────────────────────────────┤
│  Tracking  │  When       │  Action                                        │
│  ───────────────────────────────────────────────────────────────────────── │
│            │  04/15/2020 │  Note: 🧑 New lead from your GetOiling...      │
│            │  02/20/2020 │  ✉️ 🧑 (none)                                   │
│            │  02/20/2020 │  Note: 🧑 New message from your GetOiling...   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Backend Changes

#### 1.1 Model: `models/contacts.php` (~line 3994)

**Current signature:**
```php
public function GetContactActions($contact_id, $page_number, $site_config, $filters = [])
```

**New signature:**
```php
public function GetContactActions($contact_id, $page_number, $site_config, $filters = [], $search_text = null)
```

**Add search logic after existing type filter logic (~line 4012):**
```php
// Add text search filtering
if ($search_text !== null && trim($search_text) !== '') {
    $search_pattern = '%' . $search_text . '%';
    $extra_sql .= ' AND (note LIKE ? OR subject LIKE ? OR body LIKE ?) ';
    $params[] = &$search_pattern;
    $params[] = &$search_pattern;
    $params[] = &$search_pattern;
}
```

#### 1.2 Controller: `controllers/contacts.php` (~line 141)

**Current:**
```php
$contact_actions = $ContactsModel->GetContactActions(
    $contact_id, 
    intval($_GET['contact_actions_page']),
    $site_config, 
    $_GET['type_filters']
);
```

**New:**
```php
$contact_actions = $ContactsModel->GetContactActions(
    $contact_id, 
    intval($_GET['contact_actions_page']),
    $site_config, 
    $_GET['type_filters'],
    isset($_GET['search_text']) ? $_GET['search_text'] : null
);
```

---

### Phase 2: Frontend Changes

#### 2.1 HTML: Add Search Input to Panel Header

**Location:** `views/account/contact-view.html.php` (~line 296, after the Calls button)

```html
<div class="pull-right" style="margin-right:15px;">
    <input type="text" 
           id="search-past-actions-text" 
           class="form-control input-sm" 
           placeholder="Search..."
           style="width:150px; display:inline-block;">
</div>
```

#### 2.2 JavaScript: Add Search Variable and Event Handler

**Add variable (near other contact_actions variables, ~line 1170):**
```javascript
var past_action_search_text = '';
```

**Add event handler (in the $(function(){}) block):**
```javascript
// Debounced search for past actions
var searchPastActionsTimeout;
$('#search-past-actions-text').on('input', function() {
    clearTimeout(searchPastActionsTimeout);
    searchPastActionsTimeout = setTimeout(function() {
        past_action_search_text = $('#search-past-actions-text').val();
        contact_actions_page = 1; // Reset to first page
        loadHistory();
    }, 300); // 300ms debounce
});
```

#### 2.3 JavaScript: Update `loadHistory()` AJAX Call

**Location:** `views/account/contact-view.html.php` (~line 1262)

**Current:**
```javascript
data: {
    'contact_actions_page': contact_actions_page,
    'contact_id': contact_id,
    'type_filters': past_action_filters
}
```

**New:**
```javascript
data: {
    'contact_actions_page': contact_actions_page,
    'contact_id': contact_id,
    'type_filters': past_action_filters,
    'search_text': past_action_search_text
}
```

#### 2.4 JavaScript: Clear Search When Contact Changes (Optional but Recommended)

If the user navigates to a different contact, we should clear the search:
```javascript
// When contact changes, clear the search
$('#search-past-actions-text').val('');
past_action_search_text = '';
```

---

### Testing Checklist

- [x] Search with no type filters active → returns matching results across all action types ✅ **Tested: Works correctly**
- [x] Search with type filters active → returns matching results only within selected types ✅ **Tested: AND logic works**
- [x] Empty search box → shows all results (no filter applied) ✅ **Tested: Works correctly**
- [x] Pagination still works with active search ✅ **Tested: Resets to page 0 (first page) on new search**
- [x] Clearing search box (X button) reloads full results ✅ **Tested: Works silently without loading toast**
- [x] Search is case-insensitive ✅ **Tested: "Welcome" and "welcome" both work**
- [x] No SQL injection vulnerabilities ✅ **Uses parameterized queries with prepared statements**
- [x] Search finds content in related tables (marketing_message, contact_message) ✅ **Implemented using subqueries**
- [x] Debounced input prevents excessive API calls ✅ **300ms debounce implemented**

### Additional Test Cases Verified

| Search Term | Expected Result | Actual Result |
|-------------|-----------------|---------------|
| "Welcome" | Finds "Welcome to !" email | ✅ Pass |
| "Thank" | Finds "Thank you" email | ✅ Pass |
| "to" | Finds both emails (both contain "to" in subject/body) | ✅ Pass |
| Empty string | Shows all past actions | ✅ Pass |
| Click X button | Clears search, shows all actions | ✅ Pass |

---

## Files to Edit Summary

| File | Line(s) | Change |
|------|---------|--------|
| `oilylife/models/contacts.php` | ~3994-4012 | Add `$search_text` parameter and LIKE clause |
| `oilylife/controllers/contacts.php` | ~141 | Pass `$_GET['search_text']` to model |
| `oilylife/views/account/contact-view.html.php` | ~296 | Add search input to panel header HTML |
| `oilylife/views/account/contact-view.html.php` | ~1170 | Add `past_action_search_text` variable |
| `oilylife/views/account/contact-view.html.php` | ~1262 | Add `search_text` to AJAX data |
| `oilylife/views/account/contact-view.html.php` | ~3200+ | Add debounced input event handler |

---

## Estimated Complexity

| Aspect | Estimate |
|--------|----------|
| Backend Changes | Low - just adding one parameter and SQL clause |
| Frontend Changes | Low-Medium - UI + event handlers |
| Testing | Medium - need to test various filter combinations |
| **Overall** | **Low-Medium complexity, ~2-3 hours** |

---

## Implementation Status: ✅ COMPLETE

### Summary
The search feature for Past Actions has been fully implemented and tested. Users can now search through their past actions by keyword, and the search covers:

- Direct fields: `note`, `subject`, `body` in `contact_actions` table
- Related tables: `marketing_message` and `contact_message` for email subjects and bodies

### Key Implementation Details
1. **Backend:** Added `$search_text` parameter to `GetContactActions()` with subquery approach to search related tables without modifying shared SQL properties
2. **Frontend:** Added always-visible search input with clear (X) button, debounced input handling (300ms), and proper pagination reset
3. **Testing:** All test cases pass - see Testing Checklist above

### Date Completed
January 17, 2026
