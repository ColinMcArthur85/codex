# Third-Party Cost Audit Report

**Date**: March 20, 2026
**Scope**: Full codebase review of all paid third-party services, API calls, and cost optimization opportunities

---

## Table of Contents

1. [Service Inventory](#1-complete-service-inventory)
2. [AI / LLM Costs (Highest Impact)](#2-ai--llm-costs-highest-impact)
3. [Email - Mailgun](#3-email---mailgun)
4. [SMS / Voice - Twilio](#4-sms--voice---twilio)
5. [Payment Processing - Stripe & Braintree](#5-payment-processing---stripe--braintree)
6. [CDN & File Storage - Bunny + Rackspace](#6-cdn--file-storage---bunny--rackspace-legacy)
7. [Video Conferencing - Zoom](#7-video-conferencing---zoom)
8. [Real-Time Messaging - Pusher](#8-real-time-messaging---pusher)
9. [Push Notifications - OneSignal](#9-push-notifications---onesignal)
10. [Email Validation - ZeroBounce](#10-email-validation---zerobounce)
11. [Error Reporting - Rollbar](#11-error-reporting---rollbar)
12. [Analytics - Keen.io](#12-analytics---keenio)
13. [Hosting & DNS - Liquid Web](#13-hosting--dns---liquid-web)
14. [Other Third-Party Services](#14-other-third-party-services)
15. [Priority Action Items](#15-priority-action-items)

---

## 1. Complete Service Inventory

| Service | Purpose | Pricing Model | Files |
|---------|---------|---------------|-------|
| **OpenAI** | AI chat, embeddings, transcription, moderation | Per-token | `models/ai-chatgpt.php` |
| **Anthropic (Claude)** | AI chat | Per-token | `models/ai-anthropic.php` |
| **Google Gemini** | AI chat | Per-token | `models/ai-gemini.php` |
| **x.AI (Grok)** | AI chat | Per-token | `models/ai-grok.php` |
| **Mailgun** | Transactional & marketing email | Per-message | `lib/mail.php` |
| **Twilio** | SMS, MMS, voice calls | Per-message/minute | `lib/text-message.php` |
| **Stripe** | Payment processing | 2.9% + $0.30/txn | `models/platform-payments.php` |
| **Braintree** | Payment processing (legacy) | Per-transaction | `lib/braintree.php` |
| **Bunny CDN** | File storage + CDN | Per-GB storage + egress | `models/bunny-storage.php`, `models/cloud-files.php` |
| **Rackspace Cloud Files** | File storage (legacy) | Per-GB | `models/cloud-files.php` |
| **Zoom** | Video conferencing | Per-license/month | `models/video-conferencing.php` |
| **Pusher** | WebSockets | Monthly subscription | `models/web-sockets.php` |
| **OneSignal** | Push notifications | Per-notification | `models/push-notifications.php` |
| **ZeroBounce** | Email validation | Per-validation | `models/email-validation.php` |
| **Rollbar** | Error logging | Monthly subscription | `lib/error-logger.php` |
| **Keen.io** | Analytics (migrated to internal) | Per-event | `models/keen-analytics.php` |
| **Liquid Web** | Hosting, DNS, SSL, load balancer | Monthly | `models/hosting/` |
| **CloudConvert** | File format conversion | Per-conversion | `models/cloud-convert.php` |
| **Canva** | Design integration | API subscription | `models/canva-api.php` |
| **Pixabay** | Stock images | Free tier / API key | `models/pixabay-api.php` |
| **Google Fonts** | Font loading | Free | `models/google-fonts-api.php` |
| **Google Calendar** | Calendar sync | Free (API limits) | `models/google-calendar-api.php` |
| **Microsoft 365** | Calendar sync | Free (API limits) | `models/microsoft-office-365-calendar-api.php` |
| **Freshdesk** | Support tickets | Monthly subscription | `models/helpdesk.php` |
| **ProfitWell/Retain** | Subscription analytics | Monthly | `config/*/profitwell-retain.config.php` |
| **Exigo** | MLM/order integration | Per-API-call | `api/models/exigo.php` |
| **Google reCAPTCHA** | Bot prevention | Free tier | `models/recaptcha.php` |
| **Slack** | Internal notifications | Free tier | `models/slack-integration.php` |
| **Browserless** | Web scraping/JS rendering | Per-request | `models/web-scraper.php` |
| **Zip Code API** | ZIP/postal code lookups | Per-request | `models/zip-code-api.php` |

---

## 2. AI / LLM Costs (Highest Impact)

**Location**: `oilylife/models/ai*.php`, `oilylife/models/ai-models-config.php`

### Current Setup

Four AI providers with weighted random selection when user preference is "auto":

| Provider | Weight | Default Model | Default Mini |
|----------|--------|---------------|--------------|
| OpenAI (ChatGPT) | **65%** | gpt-5.4 (most expensive) | gpt-5-mini |
| Grok (x.AI) | 15% | grok-4-1-fast-reasoning | grok-4-1-fast-reasoning (same!) |
| Anthropic (Claude) | 10% | claude-haiku-4-5 | claude-haiku-4-5 |
| Google (Gemini) | 10% | gemini-3.1-pro-preview | gemini-3-flash-preview |

### Issues Found

#### CRITICAL: Anthropic max_tokens default is 32,767
- `oilylife/models/ai-anthropic.php` enforces a minimum of 1,024 and defaults to 32,767 output tokens
- This means every Anthropic request is billed for up to 32K output tokens even for simple queries
- **Fix**: Lower the default to 4,096 (matches OpenAI). This alone could reduce Anthropic costs ~87%

#### CRITICAL: 65% of "auto" requests go to the most expensive provider
- The weighted random in `ai-models-config.php` sends 65% of traffic to ChatGPT (gpt-5.4)
- **Fix**: Rebalance weights. Consider cost-per-token when distributing. Gemini Flash and Claude Haiku are significantly cheaper for routine queries

#### HIGH: Vision always uses "high" detail
- `ai-chatgpt.php` line 198: `'detail' => 'high'`
- OpenAI charges significantly more for high-detail image analysis vs "auto"
- Applied across all providers
- **Fix**: Change to `'detail' => 'auto'` to let the API choose the appropriate level. Saves 30-40% on vision requests

#### HIGH: Grok "mini" is not actually a mini model
- Both `default_model` and `default_mini_model` in `ai-grok.php` are set to `grok-4-1-fast-reasoning`
- Users who select "grok-mini" thinking they're saving money are getting the full model
- **Fix**: Set `default_mini_model` to `grok-3-mini`

#### MEDIUM: OpenAI moderation API called on every single prompt
- `ai.php` line ~129 calls `CheckIfPromptViolatesUsagePolicies()` before processing
- This is an extra API call per request with no caching
- Only OpenAI implements this; Anthropic/Gemini/Grok return false (inconsistent)
- **Fix**: Cache moderation results for identical prompts (Redis) or rely on provider-side safety instead

#### MEDIUM: No response caching or deduplication
- Every request generates a fresh API call even for identical prompts
- Responses stored in `chatgpt_response` table but never reused
- **Fix**: Check for duplicate prompts within a time window; return cached response

#### MEDIUM: Embeddings regenerated on every knowledge file update
- `ai-chatgpt.php` uses `text-embedding-3-small` with batch size of 20
- Full regeneration on any file change (no incremental updates)
- **Fix**: Track file hashes; only regenerate embeddings for changed files

#### MEDIUM: Rate limit is generous (100 requests/hour per account)
- No per-minute throttling to prevent burst costs
- No visibility to users on token consumption
- **Fix**: Add tiered rate limits and cost visibility in the AI settings UI

#### LOW: Hidden AI operations still consume tokens
- Blog excerpt generation, class outlines, campaign messages, email editing, page builder edits
- Marked `show_to_user = false` but still billable
- Users don't realize these consume their AI budget

### Estimated Savings

Implementing the top 4 fixes (Anthropic tokens, weight rebalancing, vision detail, Grok mini) could reduce AI costs by **35-50%** with no functional impact.

---

## 3. Email - Mailgun

**Location**: `oilylife/lib/mail.php`, `oilylife/lib/mail-messages.php`, `oilylife/lib/message-contacts.php`

### Current Setup
- Two Mailgun domains per product (platform domain + customer domain)
- GetOiling: `mg.getoiling.com`, `mg.oilyemail.com`
- AttractWell: `mg.attractwell.com`, `mg.contactmailserver.com`
- Customer domain caching implemented (good)

### Volume Drivers
- **Campaign messages**: Bulk sends via `cron/send-campaign-messages.php`
- **Queued messages**: Individual/small-batch via `cron/send-queued-messages.php`
- **Calendar reminders**: Up to 3 email reminders + 1 follow-up per booking
- **Daily summary**: Sent to ALL active accounts daily
- **Notification digest**: Batches notifications per account (good)
- **Check-in emails**: Periodic account engagement emails
- **Credit usage alerts**: Sent when accounts hit 90% credit usage

### Issues Found

#### MEDIUM: Daily summary sent to all active accounts with no opt-out
- `cron/send-daily-summary.php` sends to every active account every day
- No preference check for opting out
- **Fix**: Add opt-in/out preference. Many users may not read these, and each one costs Mailgun credits

#### MEDIUM: Calendar reminders can send up to 4 emails per booking
- 3 reminder times + 1 follow-up, all via email
- **Fix**: Consider if all 4 are necessary or let users configure reminder count

#### LOW: Account check-in emails add volume
- `cron/account-check-in-emails.php` sends periodic engagement emails
- Adds to Mailgun volume for marketing purposes

### Existing Cost Controls (Good)
- Credit-based system: 1 credit per email sent
- Opt-out compliance enforced (`receive_marketing_email` flag)
- Invalid email auto-opt-out on bounce
- Customer domain caching to reduce preference lookups

---

## 4. SMS / Voice - Twilio

**Location**: `oilylife/lib/text-message.php`, `oilylife/models/premium-texting.php`

### Current Setup
- Separate Twilio accounts per product (GetOiling + AttractWell)
- Master accounts with per-customer subaccounts for premium texting
- Default shared phone numbers for non-premium users
- A2P 10DLC campaign registration for premium texting

### Issues Found

#### HIGH: SMS footer on shared numbers can double message cost
- `message-contacts.php` line ~267: shared-number texts append "Please reply to [name]"
- SMS limit is 160 characters; footer pushes many messages from 1 segment to 2 segments
- Each extra segment costs the same as a full message
- **Fix**: Shorten or abbreviate the footer text. Consider "[name]: " prefix instead of full footer

#### MEDIUM: Calendar reminder texts are sent without credit charges
- `cron/send-calendar-reminders.php` line 248: text reminders skip credit deduction
- These still cost Twilio money even though the user isn't charged credits
- Up to 3 text reminders + 1 follow-up per booking
- **Fix**: Either charge credits or limit free text reminders to 1 per booking

#### MEDIUM: Triple notification for same event
- Incoming messages trigger: email notification + text notification + push notification
- That's 3 paid messages for one event
- **Fix**: Let users choose ONE preferred notification channel, or use push as primary (cheapest)

#### LOW: MMS media URL validation is minimal
- Media URLs checked with `FILTER_VALIDATE_URL` but no HTTP validation
- Failed media downloads still result in MMS charges

### Existing Cost Controls (Good)
- Credit-based pricing: ~15 credits per text, 40 credits per picture message
- Twilio subaccount client caching to reduce API initialization
- Self-texting prevention (won't send when to/from is same number)
- Prohibited content filtering (cannabis, etc.) to avoid carrier penalties
- Push notifications amortized: 1 credit per 10 notifications

---

## 5. Payment Processing - Stripe & Braintree

**Location**: `oilylife/models/platform-payments.php`, `oilylife/lib/braintree.php`

### Current Setup
- **Stripe**: Primary payment processor. Full integration with subscriptions, invoices, payment intents, multiple currencies (12), multiple payment methods (Afterpay, Bancontact, Card, iDEAL, Klarna, US Bank)
- **Braintree**: Secondary/legacy processor. Full SDK loaded and configured with 4 credential sets (2 products x 2 environments)

### Issues Found

#### HIGH: Braintree appears to be unused but fully maintained
- `platform-payments.php` (5,779 lines) uses **only Stripe** for payment processing
- Braintree SDK is still loaded, configured, and maintained with production + sandbox credentials for both products
- The Braintree library (`lib/braintree.php`, 313 lines) is included but the main payments model doesn't reference it
- Only active Braintree usage found: `cron/referral-credit-braintree.php` (legacy referral credits)
- **Fix**: Audit whether any active customers are still on Braintree subscriptions. If not, remove the Braintree integration entirely. If some remain, plan a migration to Stripe and sunset Braintree to eliminate the dual-processor overhead

#### LOW: Tax rate creation could be cached
- Multiple `$stripe_client->taxRates->create()` calls in platform-payments.php
- Tax rates rarely change but are created via API calls
- **Fix**: Cache tax rate IDs after first creation

### Existing Cost Controls (Good)
- Lazy Stripe client initialization
- Webhook-based subscription processing (no polling)
- API version pinned for stability

---

## 6. CDN & File Storage - Bunny + Rackspace (Legacy)

**Location**: `oilylife/models/bunny-storage.php`, `oilylife/models/cloud-files.php`

### Current Setup
- **Bunny CDN** (primary): Per-account storage zones with edge + standard tiers
- **Rackspace Cloud Files** (legacy): Still supported as fallback in `cloud-files.php`

### Good Design Decisions Already in Place
- Tiered storage: frequently accessed files on edge, archives on standard (cheaper)
- Shared storage zones for contact actions and temp uploads (reduces zone count)
- Regional selection for storage endpoints

### Issues Found

#### MEDIUM: Rackspace legacy code still maintained
- `cloud-files.php` maintains dual backend support (Bunny + Rackspace)
- Rackspace is significantly more expensive (~$0.12-0.20/GB vs Bunny's ~$0.01-0.04/GB)
- `config/rackspace.config.php` still has active credentials for multiple containers
- **Fix**: Determine if any files remain on Rackspace. If migration to Bunny is complete, remove Rackspace support to simplify code and eliminate any lingering Rackspace costs

#### MEDIUM: Per-account storage zones may accumulate costs
- Each customer account gets separate storage zones (edge + standard) plus pull zones
- Inactive or churned accounts' zones may not be cleaned up
- **Fix**: Implement cleanup for storage zones of deleted/inactive accounts

#### LOW: No image compression before upload
- No evidence of image optimization, resizing, or compression before storing to CDN
- Larger files = higher storage + egress costs
- **Fix**: Compress and resize images on upload (Intervention Image library is already installed)

---

## 7. Video Conferencing - Zoom

**Location**: `oilylife/models/video-conferencing.php`, `cron/zoom-license-audit.php`

### Current Setup
- 150 Zoom meeting licenses in pool (with 5-license buffer)
- License audit cron job monitors allocation and corrects discrepancies
- Per-user license assignment (paid/free tiers)

### Issues Found

#### MEDIUM: Are all 150 licenses actively used?
- `zoom-license-audit.php` syncs license state between platform DB and Zoom
- If many licenses sit unused, there's an overpayment opportunity
- **Fix**: Review the audit cron output to see actual paid vs. free license distribution. Reduce the pool size if there's consistent slack. Zoom Pro licenses are ~$13.33/month each; unused licenses = $13.33/month waste per seat

---

## 8. Real-Time Messaging - Pusher

**Location**: `oilylife/models/web-sockets.php`

### Current Setup
- Pusher App ID `502754`, Cluster `us2`
- Used in only ~5 locations: GPT chats, text callbacks, discussion rooms, account master

### Issues Found

#### LOW: Limited usage for a paid subscription
- Pusher has a monthly subscription fee regardless of usage
- Only used in a handful of features
- **Fix**: Evaluate actual Pusher message volume vs. plan cost. If volume is low, consider:
  - Downgrading to a smaller Pusher plan
  - Replacing with Server-Sent Events (SSE) for one-directional updates (GPT chat, notifications)
  - Self-hosted WebSocket solution (only worthwhile if Pusher costs are significant)

---

## 9. Push Notifications - OneSignal

**Location**: `oilylife/models/push-notifications.php`

### Current Setup
- OneSignal integration for GoNative mobile app
- 1 credit charged per 10 notifications (amortized)

### Issues Found

#### LOW: Individual API calls per notification
- OneSignal supports batch API for multiple device IDs but current code sends individual calls
- **Fix**: Batch multiple notifications into single OneSignal API requests where possible

---

## 10. Email Validation - ZeroBounce

**Location**: `oilylife/models/email-validation.php`

### Current Setup
- Validates email deliverability before sending
- 120-day cache window for validated results
- Master kill switch (`$validation_enabled`) for outages
- Results cached in `email_validations` table in analytics DB

### Existing Cost Controls (Good)
- 120-day caching window means each email is validated at most ~3 times per year
- Invalid results cached for 30 years (effectively permanent)
- Valid results cached for 3 years
- On API failure, defaults to "deliverable" (doesn't block sending)

### Issues Found
- Cache window of 120 days is reasonable. No major issues found
- This service likely **saves more money** than it costs by preventing Mailgun sends to invalid addresses

---

## 11. Error Reporting - Rollbar

**Location**: `oilylife/lib/error-logger.php`, `oilylife/thirdparty/rollbar/`

### Current Setup
- Every `ErrorLog()` and `InfoLog()` call reports to Rollbar
- Used throughout entire codebase

### Issues Found

#### LOW: Info-level logs sent to Rollbar
- `InfoLog()` calls `ErrorLog()` with level `'info'`
- Info events still count toward Rollbar event quotas
- **Fix**: Review if info-level events need to go to Rollbar or if they should only go to local error_log

---

## 12. Analytics - Keen.io

**Location**: `oilylife/models/keen-analytics.php`

### Current Setup
- **Already migrated**: `record_to = 'internal'` and `read_from = 'internal'`
- Keen.io API code still present but not actively called
- Analytics now stored in internal database

### Issues Found

#### LOW: Keen.io subscription may still be active
- Code still references Keen.io API URLs and keys
- If the Keen.io subscription hasn't been cancelled, it's costing money for nothing
- **Fix**: Confirm Keen.io subscription is cancelled. Remove dead Keen code to reduce confusion

---

## 13. Hosting & DNS - Liquid Web

**Location**: `oilylife/models/hosting/`

### Current Setup
- 4 web servers (vm.web01-04.attractwell.com)
- 5 hosting shards per server (20 total hosting accounts)
- Liquid Web Storm API for DNS management
- Load balancer API for SSL certificates
- SSL certificate renewal via cron

### Issues Found

#### MEDIUM: Domain/DNS zone cleanup
- Each custom domain creates DNS zones via Liquid Web API
- Churned customer domains may leave orphaned zones
- **Fix**: Cross-reference active accounts with DNS zones; clean up orphaned entries

---

## 14. Other Third-Party Services

### CloudConvert (`models/cloud-convert.php`)
- File format conversion (fonts TTF->WOFF, docs to images)
- Pay-per-conversion model
- Low concern unless heavy usage

### Canva (`models/canva-api.php`, `models/canva-connect-api.php`)
- Design button integration + OAuth Connect
- API subscription cost
- Review if usage justifies subscription

### ProfitWell/Retain (`config/*/profitwell-retain.config.php`)
- Subscription analytics and retention
- Monthly subscription
- **Fix**: Review if insights justify cost vs. building basic churn metrics internally

### Freshdesk (`models/helpdesk.php`)
- Customer support ticketing
- Monthly per-agent subscription
- Standard SaaS cost; no optimization concerns

### Exigo (`api/models/exigo.php`)
- MLM/order integration for Oola products
- API Base URL: `https://oola-api.exigo.com/3.0/`
- Per-API-call pricing
- Niche integration; review if still actively used

### Browserless (`models/web-scraper.php`)
- JavaScript-rendering web scraper service
- Per-request pricing
- Used for page scraping/import features

### Zip Code API (`models/zip-code-api.php`)
- US ZIP code and Canadian postal code lookups
- Endpoint: `https://api.zip-codes.com/ZipCodesAPI.svc/1.0/`
- Low volume, low cost

### Slack (`models/slack-integration.php`)
- Used internally to fetch domain renewal messages from #domain-renewals channel
- Free tier likely sufficient

### Mailgun Domain Management (`models/mailgun-domain.php`)
- DMARC record management via Mailgun API
- Included with Mailgun subscription

---

## 15. Priority Action Items

### Tier 1: Quick Wins (Days to implement, high savings potential)

| # | Action | Est. Savings | Effort | Files |
|---|--------|-------------|--------|-------|
| 1 | Lower Anthropic default max_tokens from 32,767 to 4,096 | ~87% on Anthropic calls | 1 line change | `models/ai-anthropic.php` |
| 2 | Change vision detail from "high" to "auto" | ~30-40% on vision calls | 1 line per provider | `models/ai-chatgpt.php`, etc. |
| 3 | Fix Grok mini model (currently same as full) | Proper mini pricing | 1 line change | `models/ai-grok.php` |
| 4 | Rebalance AI provider weights (reduce ChatGPT from 65%) | ~15-25% overall AI cost | Config change | `models/ai-models-config.php` |
| 5 | Shorten SMS footer on shared numbers | Up to 50% on affected texts | Small text change | `lib/message-contacts.php` |

### Tier 2: Medium Effort (Weeks, meaningful savings)

| # | Action | Est. Savings | Effort | Files |
|---|--------|-------------|--------|-------|
| 6 | Audit & remove Braintree if unused | Eliminate dead code + any subscription | Medium | `lib/braintree.php`, configs |
| 7 | Confirm & cancel Keen.io subscription | Subscription cost | Admin task | Keen.io dashboard |
| 8 | Implement moderation result caching (Redis) | ~5-10% on AI calls | Medium | `models/ai.php` |
| 9 | Complete Rackspace-to-Bunny migration & remove legacy code | Rackspace subscription | Medium | `models/cloud-files.php` |
| 10 | Add daily summary email opt-out preference | Reduced Mailgun volume | Medium | `cron/send-daily-summary.php` |
| 11 | Limit calendar text reminders or charge credits | Reduced free Twilio spend | Small | `cron/send-calendar-reminders.php` |
| 12 | Clean up orphaned Bunny storage zones for inactive accounts | Storage costs | Medium | `models/bunny-storage.php` |

### Tier 3: Strategic (Larger effort, long-term savings)

| # | Action | Est. Savings | Effort | Files |
|---|--------|-------------|--------|-------|
| 13 | Add AI response caching/deduplication | ~10-20% on repeat queries | Large | `models/ai.php` |
| 14 | Implement AI streaming (early termination) | ~15-30% on abandoned requests | Large | All AI models |
| 15 | Smart AI provider routing by query complexity | Significant per-token savings | Large | `models/ai.php` |
| 16 | Add user-facing AI cost visibility | Behavioral cost reduction | Medium | Views + AI models |
| 17 | Image compression before CDN upload | Storage + egress savings | Medium | Upload handlers |
| 18 | Review Zoom license pool utilization | ~$13.33/mo per unused license | Admin audit | Zoom dashboard |
| 19 | Consolidate notification channels (email OR text OR push) | Reduced messaging costs | Medium | `lib/message-contacts.php` |
| 20 | Evaluate Pusher usage vs. cost; consider SSE | Subscription savings | Medium-Large | `models/web-sockets.php` |

---

## 16. Estimated Cost Savings

These are directional estimates based on code patterns. Actual savings depend on real billing data.

### Tier 1: Quick Wins (Days of work)

| Action | Assumption | Est. Annual Savings |
|--------|-----------|-------------------|
| Lower Anthropic max_tokens (32K → 4K) | 10% of AI traffic × ~87% cost reduction on those calls | **$2,000–8,000** |
| Fix Grok mini (not actually mini) | 15% of AI traffic getting full-price instead of mini | **$1,000–4,000** |
| Vision detail "high" → "auto" | 30-40% savings on all image analysis requests | **$500–3,000** |
| Rebalance provider weights (65% ChatGPT → 40%) | GPT-5.4 is the premium tier; shifting 25% to cheaper providers | **$2,000–6,000** |
| Shorten SMS footer on shared numbers | Prevents segment doubling on affected texts | **$500–2,000** |
| **Tier 1 Total** | | **$6,000–23,000/yr** |

### Tier 2: Medium Effort (Weeks of work)

| Action | Assumption | Est. Annual Savings |
|--------|-----------|-------------------|
| Remove Braintree (if unused) | Eliminate dead subscription + maintenance time | **$1,000–5,000** |
| Cancel Keen.io (if subscription still active) | Migrated to internal but subscription may be running | **$2,000–12,000** |
| Complete Rackspace migration | Rackspace is 5-10x more expensive than Bunny per GB | **$1,000–6,000** |
| Moderation API caching (Redis) | Eliminates ~50-80% of duplicate moderation calls | **$500–2,000** |
| Daily summary email opt-out | Even 30% opt-out reduces Mailgun volume | **$500–2,000** |
| Calendar text reminder credits | Free Twilio sends add up | **$500–3,000** |
| Clean up orphaned Bunny zones | Inactive account storage | **$500–2,000** |
| **Tier 2 Total** | | **$6,000–32,000/yr** |

### Tier 3: Strategic (Months of work)

| Action | Assumption | Est. Annual Savings |
|--------|-----------|-------------------|
| Right-size Zoom licenses (150 → actual need) | $13.33/mo per unused license; even 50 unused = $8K/yr | **$4,000–12,000** |
| AI response caching/dedup | 10-20% of queries are repeats | **$2,000–8,000** |
| AI streaming (early termination) | Users abandon ~15-30% of long queries | **$1,000–5,000** |
| Smart AI routing by complexity | Route simple queries to Haiku/Flash instead of GPT-5.4 | **$3,000–10,000** |
| Notification channel consolidation | Reduce triple-send (email+SMS+push) per event | **$1,000–4,000** |
| Rollbar error sampling | 30-50% event reduction | **$1,000–3,000** |
| Image compression before CDN upload | Reduces storage + egress 20-40% | **$1,000–4,000** |
| **Tier 3 Total** | | **$13,000–46,000/yr** |

### Total Estimated Savings

| Tier | Effort | Est. Annual Savings |
|------|--------|-------------------|
| Tier 1 (Quick Wins) | Days | **$6,000–23,000** |
| Tier 2 (Medium) | Weeks | **$6,000–32,000** |
| Tier 3 (Strategic) | Months | **$13,000–46,000** |
| **Total** | | **$25,000–101,000/yr** |

The wide range reflects uncertainty without actual billing data. The real number depends heavily on:
- **AI request volume** — the single biggest variable. If AI usage is high, Tier 1 alone could save $20K+
- **Whether Keen.io and Rackspace subscriptions are still active** — could be $0 or $18K
- **Actual Zoom license utilization** — easy to check via the audit cron output

### Recommended Next Step

Pull the last 3 months of invoices from: OpenAI, Anthropic, x.AI (Grok), Google Cloud (Gemini), Twilio, Mailgun, Zoom, Bunny CDN, Keen.io, Rackspace, Rollbar, Pusher, and Stripe. That will put real numbers behind these estimates and allow prioritization by highest-dollar items first.

---

## Security Note

During this audit, API keys and credentials were found hardcoded in source files for: OpenAI, Anthropic, Grok, Gemini, Twilio, Mailgun, Zoom, Bunny CDN, Rackspace, Liquid Web DNS, ZeroBounce, Canva, Pixabay, Google Fonts, Pusher, OneSignal, Freshdesk, and ProfitWell. While this is a separate concern from cost, compromised keys could lead to unauthorized usage charges. Consider migrating secrets to environment variables or a secrets manager.
