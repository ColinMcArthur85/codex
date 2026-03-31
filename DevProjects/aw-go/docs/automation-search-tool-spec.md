# Automation Search Tool Specs

This tool was designed as a standalone debugging script to track down disconnected or "Ghost" automations and campaign/vault leaks across the platform. It was deployed to securely scan raw database tables.

## Purpose
To locate any references site-wide to a specific Automation ID or a raw text string, mapping out exactly where an automation or campaign is linked across Vaults, Campaigns, Pages, and Products.

## Search Functionality

The tool features two main search types:

### 1. Automation Mapping Search
Lists every automation in the account (or a specific searched automation) and queries where it is attached:
- **Vault Triggers:** `vault` table (`automation_id`, `exit_automation_id`, `payment_success_automation_id`)
- **Marketing Campaigns:** `marketing_campaign` table (`automation_id`)
- **Page Lead Capture:** `page` table (`lead_capture_settings_json` containing `"automation_id":ID`)
- **Store Product Fulfillment:** `store_product` table (`automation_id`)
- **Parent Automations:** `automation_action` table (`action_type = 'automation'` and `resource_id = ID`) 

### 2. Global Keyword Page Content Search
A full-text scrape looking for literal string matches (e.g., URL slugs, campaign names, button text) to find undocumented links:
- **Custom Pages (Body Content):** `page_section` joined with `page` scanning the `html` column.
- **Custom Pages (Settings):** `page` table scanning `extra_head_tags`, `extra_footer_tags`, `title_bar_text`, and `link_path`.
- **Old-Style Landing Pages:** `landing_page` table scanning `post_registration_html` and `settings`.

## Important Implementation Details
- Filtering MUST be isolated to the specific `account_id` to prevent cross-account exposure.
- `DbExecute` should be used instead of raw `mysqli` when implemented within the MVC framework to prevent fatal query errors.

*Note: Developed during the CRC Campaign Leak investigation, March 2026.*
