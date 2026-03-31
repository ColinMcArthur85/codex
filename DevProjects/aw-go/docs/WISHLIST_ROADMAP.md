# 🚀 Wishlist Implementation Roadmap

Welcome to the dev team! This roadmap is your guiding light for turning wishlist items from Jira/CSV into real software features. We've organized these by **Difficulty Level** so you can gain confidence as you go.

---

## 🛠 How to use this Roadmap
1. **Pick a Task:** Start with **Level 1** (Beginner).
2. **Signal Me:** Say something like *"I want to work on WISH-345."* 
3. **Plan:** I will create a detailed implementation plan in your `docs/` folder.
4. **Execute:** We write the code together.
5. **Test:** We verify it on your staging site.
6. **Deploy:** Once you're happy, mark it [x] here and update Jira!

---

## 🟢 Level 1: Beginner (UI Tweaks & Text Changes)
*Perfect for getting familiar with the file structure and basic PHP/HTML.*

- [x] **WISH-345: Add 'Copy Link' button to Zoom recordings**
  - **Goal:** Add a "Copy Link" button next to "Download" links for recordings.
  - **Why:** Saves users from right-clicking.
  - **Files likely involved:** `oilylife/views/` (recording list view).

- [ ] **WISH-358: Add Domain Connection Alert to Dashboard**
  - **Goal:** Show a red/yellow alert box on the dashboard IF a domain isn't connected.
  - **Why:** Catches user attention before they launch.
  - **Files likely involved:** `oilylife/views/account/dashboard.html.php`.

- [ ] **WISH-310: Office Phone 'Call Icon' fix**
  - **Goal:** Enable the "Call" icon for office phone numbers (currently only shows for mobile).
  - **Why:** Consistency in the contact manager UI.
  - **Files likely involved:** `oilylife/views/contacts/` folder.

- [x] **WISH-365: Search feature for "Past Actions"**
  - **Goal:** Add a simple search input to filter the list of past actions on a contact card.
  - **Why:** Fast filtering of long history logs.
  - **Files likely involved:** `oilylife/views/contacts/contact-panel.html.php`.

- [] **WISH-314: Image Gallery access in Blog Editor**
  - **Goal:** Add a button in the blog image uploader to "Choose from Gallery".
  - **Why:** Saves users from re-uploading the same images.
  - **Files likely involved:** `oilylife/views/posts/` (blog editor view).

---

## 🟡 Level 2: Intermediate (Logic & Data)
*Requires a bit more PHP logic or basic database field handling.*

- [ ] **WISH-386: Add Phone Number to Store Checkout**
  - **Goal:** Add a required field for phone numbers during store checkout.
  - **Files likely involved:** `oilylife/views/store/` and checkout controllers.

- [ ] **WISH-370: Auto E.164 Phone Formatting**
  - **Goal:** Automatically fix phone numbers (add +, remove dashes) when saved.
  - **Files likely involved:** `oilylife/lib/text-message.php` or contact models.

- [ ] **WISH-288: Manual Store Product Ordering**
  - **Goal:** Let users drag/drop or set a number to order products instead of just alphabetical.
  - **Files likely involved:** `oilylife/controllers/store.php` and its view.

---

## ✅ Completed Items
*Move items here once they are live and checked off in Jira.*

- [ ] *None yet—let's get started!*

---

## 📂 Reference
- **Wishlist Source:** `docs/wishlist_jan_14_2026.csv`
- **Official Tracker:** Jira (Colin's Dashboard)
