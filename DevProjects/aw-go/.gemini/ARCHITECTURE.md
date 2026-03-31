# Architecture Overview

## Application Purpose

This is a multi-tenant SaaS platform that powers two products — **GetOiling** and **AttractWell** — from a single PHP codebase located in `oilylife/`. It provides website building, CRM, email/SMS marketing, e-commerce, scheduling, AI chatbots, member areas, and more to small business owners and direct sales distributors. Each customer gets a personal website (custom domain or subdomain path like `getoiling.com/username`).

The platform runs on both Rackspace Cloud Sites and dedicated servers, with product detection at runtime via `oilylife/helpers/get-site-type.php` and product-specific configuration in `oilylife/config/`.

> **Note**: All file paths in this document are relative to the repository root (`aw-go/`). The PHP application lives in the `oilylife/` directory.

## Request Flow

```
Browser Request
     │
     ▼
.htaccess (Apache mod_rewrite)
     │
     ├── /app/*           → controllers/master-controller.php (authenticated web app)
     ├── /members/*       → controllers/members.php (member area)
     ├── /api/v1/*        → api/controllers/*.php (REST API)
     ├── /gpt/*           → controllers/gpt.php (AI chatbot endpoints)
     ├── /blog/*          → index.php (blog pages)
     ├── /events/*        → index.php (event pages)
     ├── /scheduler/*     → controllers/index.php (scheduling)
     ├── /landing/*       → controllers/landing.php (landing pages)
     ├── /store/*         → index.php (e-commerce)
     ├── /sign-up/*       → sign-up.php (registration)
     ├── /log-in/*        → controllers/log-in.php (authentication)
     ├── /info/*          → controllers/info.php (info pages)
     └── /*               → index.php (public website / catch-all)
```

## Detailed Execution Flow

### 1. `.htaccess` Routing
Apache `mod_rewrite` translates clean URLs into PHP query parameters. URL segments are mapped to `controller_slug`, `pagenum`, `location`, `pageaction`, `pagesubaction`, etc. See `oilylife/.htaccess` for the complete routing table.

### 2. `index.php` — Public Entry Point
```
oilylife/index.php
  ├── Security headers (X-Frame-Options, CSP, HSTS, etc.)
  ├── Page cache check (helpers/page-cache-start.html.php)
  ├── Config loading (config/oil.config.php, countries, themes)
  ├── Database init (lib/db.php)
  ├── Core model loading (oil, blog, events, contacts, menu, pages, store, scheduling, etc.)
  ├── Router init (lib/router.php)
  ├── Helper loading (pager, daylight savings, sponsors, landing pages, campaigns)
  ├── Product-specific redirects (GetOiling ↔ AttractWell)
  └── View rendering
```

### 3. `controllers/master-controller.php` — Authenticated App Entry Point
The `/app/*` URL pattern routes through `master-controller.php`, which:
1. Extracts the `controller_slug` from the URL
2. Validates the file exists in `controllers/`
3. Includes the matching controller file: `controllers/{controller_slug}.php`

### 4. Controller → Model → View Pattern
```php
// In a controller:
$result = $SomeModel->GetSomething($param);
if ($result->success) {
    // Use $result->results in the view
}

// In a model:
$retval = DbClass::Factory()->DbExecute([
    "sql" => "SELECT * FROM table WHERE id = ?",
    "params" => DbClass::Factory()->DbParams($id)
]);
return GetModelSuccess($retval->results);
```

## Key Architectural Components

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Database singleton | `oilylife/lib/db.php` | `DbClass::Factory()` — connection pooling, load-balanced MySQL users, HA failover |
| Router / redirects | `oilylife/lib/router.php` | `Redirect()`, `FinalRedirect()`, URL helpers |
| Email system | `oilylife/lib/mail.php`, `lib/mail-messages.php` | Email composition, templates, sending via Mailgun |
| SMS / Voice | `oilylife/lib/text-message.php` | Twilio integration for SMS and voice calls |
| HTTP client | `oilylife/lib/rolling-curl.php` | Multi-curl HTTP requests |
| Auth / session | `oilylife/lib/require-session.php`, `lib/require-admin.php` | Session management, admin access control |
| Account bootstrap | `oilylife/lib/account-master-include.php` | Loads account context, permissions, navigation |
| Page builder | `oilylife/lib/account-build-page.php` | Page rendering pipeline |
| String utilities | `oilylife/lib/string-libs.php` | String manipulation helpers |
| Error logging | `oilylife/lib/error-logger.php` | Centralized error logging (Rollbar) |
| Payment gateway | `oilylife/lib/braintree.php` | Braintree SDK initialization |
| Base model | `oilylife/models/oil.php` | `OilClass` — base model with `PaginateSet()`, content type registry |
| Core CRM | `oilylife/models/contacts.php` | Contact management, fields, properties |
| Member area | `oilylife/models/member-area.php` | Complete member portal: classes, lessons, vaults, discussions |
| Page builder | `oilylife/models/pages.php` | Page CRUD, templates, sections |
| Payments | `oilylife/models/platform-payments.php` | Stripe + Braintree billing, subscriptions, transactions |
| E-commerce | `oilylife/models/store.php` | Products, variants, pricing, orders |
| Scheduling | `oilylife/models/scheduling.php` | Bookings, call packages, calendar integration |
| AI integration | `oilylife/models/ai.php`, `models/ai-*.php` | Multi-provider AI (ChatGPT, Claude, Gemini, Grok) |
| Custom GPTs | `oilylife/models/custom-gpts.php` | AI chatbot configuration and management |
| AI config | `oilylife/models/ai-models-config.php` | AI model settings trait |
| Cloud storage | `oilylife/models/cloud-files.php` | Bunny CDN file management |
| Push notifications | `oilylife/models/push-notifications.php` | Push notification delivery |
| WebSockets | `oilylife/models/web-sockets.php` | Real-time messaging via Pusher |
| Calendar APIs | `oilylife/models/google-calendar-api.php`, `models/microsoft-office-365-calendar-api.php` | External calendar sync |
| Resource sharing | `oilylife/models/resource-sharing.php` | Cross-account resource sharing |
| Hosting/DNS | `oilylife/models/hosting/` | Custom domains, DNS management, SSL certificates |

## Directory Structure

```
aw-go/                          # Repository root
├── .claude/                    # AI coding guidelines (this file + rules.md)
│   ├── ARCHITECTURE.md         # This file
│   └── rules.md                # Coding standards and conventions
├── docs/                       # Project documentation
│   ├── features/               # Feature specs (WISH-* tickets)
│   ├── ARCHITECTURE.md         # Older architecture doc (superseded by this file)
│   └── WISHLIST_ROADMAP.md     # Feature roadmap
├── framework/                  # Framework utilities
├── getoiling/                  # GetOiling-specific assets
│
└── oilylife/                   # Main PHP application
    ├── .htaccess                   # Apache URL routing, security, caching rules
    ├── index.php                   # Public-facing entry point
    ├── sign-up.php                 # Registration entry point
    ├── composer.json               # PHP dependencies (see for current library list)
    │
    ├── config/                     # Configuration files
    │   ├── oil.config.php          # Main application config
    │   ├── product.config.php      # Product settings
    │   ├── plans.config.php        # Subscription plans
    │   ├── stripe.config.php       # Stripe payment config
    │   ├── braintree.config.php    # Braintree payment config
    │   ├── themes.config.php       # Theme settings
    │   ├── countries.config.php    # Country/region data
    │   ├── attractwell/            # AttractWell-specific configs
    │   └── getoiling/              # GetOiling-specific configs
    │
    ├── controllers/                # Page controllers (one per feature area)
    │   ├── master-controller.php   # /app/* route dispatcher
    │   ├── members.php             # Member area controller
    │   ├── log-in.php              # Authentication controller
    │   ├── landing.php             # Landing page controller
    │   ├── gpt.php                 # GPT/AI chat endpoints
    │   ├── info.php                # Info pages controller
    │   └── ...                     # Run `ls oilylife/controllers/` for full list
    │
    ├── models/                     # Data/business logic classes
    │   ├── oil.php                 # OilClass — base model with PaginateSet()
    │   ├── contacts.php            # CRM contacts
    │   ├── member-area.php         # Member area logic
    │   ├── pages.php               # Page builder logic
    │   ├── platform-payments.php   # Billing/payments
    │   ├── store.php               # E-commerce
    │   ├── scheduling.php          # Booking/scheduling
    │   ├── ai.php                  # AI base model
    │   ├── ai-chatgpt.php          # OpenAI ChatGPT provider
    │   ├── ai-anthropic.php        # Anthropic Claude provider
    │   ├── ai-gemini.php           # Google Gemini provider
    │   ├── ai-grok.php             # xAI Grok provider
    │   ├── ai-models-config.php    # AI model config trait
    │   ├── custom-gpts.php         # Custom GPT chatbot management
    │   ├── cloud-files.php         # Bunny CDN integration
    │   ├── push-notifications.php  # Push notification delivery
    │   ├── web-sockets.php         # Pusher WebSocket integration
    │   ├── traits/                 # PHP traits (shared behaviors)
    │   │   ├── encryption.php      # AES-128-GCM token encryption
    │   │   ├── tags.php            # Tag CRUD operations
    │   │   ├── prepare-account-id.php # Account ID preparation
    │   │   ├── member-area.php     # Member area trait
    │   │   ├── bunny-api-key.php   # Bunny CDN API key management
    │   │   ├── mailgun-api-trait.php # Mailgun API authentication
    │   │   └── detect-hosting-platform.php # Server environment detection
    │   ├── hosting/                # Hosting & domain management
    │   │   ├── hosting.php         # Core hosting logic
    │   │   ├── account-domains.php # Custom domain management
    │   │   ├── dns-api.php         # DNS API integration
    │   │   ├── check-dns-trait.php # DNS verification trait
    │   │   └── ssl-api.php         # SSL certificate management
    │   └── ...                     # Run `ls oilylife/models/` for full list
    │
    ├── views/                      # View templates (organized by feature area)
    │   ├── account/                # Account management views
    │   ├── contacts/               # Contact views
    │   ├── members/                # Member area views
    │   ├── store/                  # E-commerce views
    │   ├── landing/                # Landing page views
    │   ├── partials/               # Reusable view partials
    │   ├── mail-templates/         # Email templates
    │   ├── error-pages/            # Error page templates
    │   └── ...                     # Run `ls oilylife/views/` for full list
    │
    ├── helpers/                    # 120+ utility files (always search before creating new ones)
    │   ├── page-cache-start.html.php # Page caching
    │   ├── get-site-type.php       # Product detection (GetOiling vs AttractWell)
    │   ├── contact-email-helper.php # Email/modal examples
    │   ├── pager-helper.php        # Pagination UI
    │   ├── gpt-streaming-helper.php # GPT SSE streaming
    │   └── ...                     # Run `ls oilylife/helpers/` for full list
    │
    ├── lib/                        # Core framework libraries
    │   ├── db.php                  # Database singleton (DbClass)
    │   ├── router.php              # URL routing and redirect utilities
    │   ├── mail.php                # Email system
    │   ├── mail-messages.php       # Email message management
    │   ├── message-contacts.php    # Contact messaging
    │   ├── text-message.php        # Twilio SMS/voice
    │   ├── rolling-curl.php        # Multi-curl HTTP client
    │   ├── string-libs.php         # String utilities
    │   ├── error-logger.php        # Error logging
    │   ├── braintree.php           # Braintree SDK init
    │   ├── require-session.php     # Session auth
    │   ├── require-admin.php       # Admin auth
    │   ├── account-master-include.php # Account context bootstrap
    │   ├── account-build-page.php  # Page rendering
    │   ├── account-top-include.php # Page header
    │   └── account-bottom-include.php # Page footer
    │
    ├── api/                        # REST API
    │   ├── controllers/            # API endpoint controllers (one per resource)
    │   │   ├── contacts.php        # Contact API
    │   │   ├── leads.php           # Leads API
    │   │   ├── oauth.php           # OAuth endpoints
    │   │   ├── custom-gpts.php     # GPT API
    │   │   ├── zapier.php          # Zapier integration
    │   │   └── ...                 # Run `ls oilylife/api/controllers/` for full list
    │   └── models/
    │       ├── api-auth.php        # API authentication
    │       └── exigo.php           # Exigo integration model
    │
    ├── cron/                       # Background jobs (run on cron servers)
    │   ├── send-queued-messages.php     # Message queue processing
    │   ├── send-campaign-messages.php   # Campaign delivery
    │   ├── send-daily-summary.php       # Daily digest emails
    │   ├── send-calendar-reminders.php  # Calendar notifications
    │   ├── send-notifications.php       # Push notifications
    │   ├── database-cleanup.php         # Database maintenance
    │   ├── renew-ssl-certificates.php   # SSL cert renewal
    │   ├── referral-credit.php          # Referral credit processing
    │   └── ...                          # Run `ls oilylife/cron/` for full list
    │
    ├── js/                         # Core JavaScript files
    │   ├── gpt-chat-core.js        # GPT chat client-side logic
    │   └── gpt-conversation-viewer.js # GPT conversation display
    │
    ├── i18n/                       # Internationalization
    │   └── strings-en.php          # English string translations
    │
    ├── themes/                     # Visual themes
    ├── thirdparty/                 # Bundled third-party libraries
    │   ├── braintree-php-*/        # Braintree SDK versions
    │   ├── rollbar/                # Error reporting
    │   ├── dropzonejs/             # File upload UI
    │   ├── tinymce/                # Rich text editor
    │   ├── linkifyjs/              # URL detection
    │   ├── livestamp/              # Live timestamp updates
    │   └── ...                     # Run `ls oilylife/thirdparty/` for full list
    │
    ├── images/                     # Static images
    ├── site-logos/                 # Platform logos
    ├── uploads/                    # User upload placeholder
    │
    ├── scripts-command-line/       # CLI scripts
    │   └── create-bunny-storage-zones.php
    │
    ├── deploy.php                  # GetOiling deployment script
    ├── attractwell-deploy.php      # AttractWell deployment script
    ├── deploy-service.php          # Deployment service endpoint
    ├── *.yml                       # Deployment YAML configs
    ├── *.sh                        # Deployment shell scripts
    │
    ├── vendor/                     # Composer dependencies (do not edit)
    └── node_modules/               # NPM dependencies (do not edit)
```

> **Tip**: Run `ls` on any directory to see current contents. The descriptions above document the *pattern*, not every file.

## URL Routing Reference

All routing is defined in `oilylife/.htaccess`. Key patterns:

| URL Pattern | Target | Purpose |
|-------------|--------|---------|
| `/app/{controller}` | `controllers/master-controller.php` | Authenticated web app features |
| `/app/{controller}/{page}/{loc}/{action}/...` | Same, with URL segments as query params | Deep app navigation |
| `/members/{page}/{loc}/...` | `controllers/members.php` | Member area (public-facing) |
| `/members/gpt/stream` | Same (with SSE flags) | GPT streaming in member area |
| `/api/v1/{resource}/...` | `api/controllers/{resource}.php` | REST API v1 |
| `/api/{resource}/...` | `api/controllers/{resource}.php` | REST API (unversioned) |
| `/gpt/{slug}` | `controllers/gpt.php` | Public GPT chat page |
| `/gpt/stream` | Same (with SSE flags) | GPT streaming endpoint |
| `/gpt/send`, `/gpt/start-session`, etc. | Same | GPT API actions |
| `/blog/{page}`, `/blog/{id}/{slug}` | `index.php` | Blog listing and posts |
| `/events/{page}`, `/events/{id}/{slug}` | `index.php` | Event listing and detail |
| `/landing/{path}` | `controllers/landing.php` | Landing pages |
| `/scheduler/{path}` | `controllers/index.php` | Scheduling/booking pages |
| `/store/*` | `index.php` | E-commerce store pages |
| `/page/{slug}` | `index.php` | Custom pages |
| `/sign-up/{plan}/{promo}` | `sign-up.php` | Registration with plan/promo |
| `/log-in`, `/log-out` | `controllers/log-in.php` | Authentication |
| `/reset-password/{token}` | `controllers/log-in.php` | Password reset |
| `/two-factor-login/{token}` | `controllers/log-in.php` | 2FA login |
| `/all-log-in` | `controllers/log-in.php` | Universal login |
| `/confirm-email/{uuid}` | `controllers/confirm-email.php` | Email opt-in |
| `/opt-out/{uuid}` | `controllers/opt-out.php` | Email opt-out |
| `/m/{id}` | `controllers/view-message.php` | Campaign message view |
| `/a/{id}/{contact}` | `controllers/automation-run.php` | Automation trigger from email |
| `/l/{code}` | `index.php` | Short URL redirect |
| `/for/{sponsor}` | `index.php` | Sponsor/referral links |
| `/videos/{path}` | `controllers/video-view.php` | Video viewing |
| `/info/{path}` | `controllers/info.php` | Info pages |
| `/legal/{document}` | `controllers/legal.php` | Legal pages (terms, privacy, etc.) |
| `/business-builder`, `/brand-partner` | `index.php` | Business builder pages |
| `/starter-kits`, `/starter-bundles` | `index.php` | Starter kit pages |
| `/start` | `controllers/start.php` | Direct signup link |
| `/referral/{name}` | `index.php` | Referral pages |
| `/sitemap.txt` | `controllers/sitemap.txt.php` | Sitemap |
| `/feed` | `controllers/rssfeed.php` | RSS feed |
| `/robots.txt` | `controllers/robots.txt.php` | Robots.txt |
| `/{sitepath}/...` | Same routes with sitepath prefix | Multi-tenant subsite URLs |

## Database Layer

### Connection Architecture

The database layer (`oilylife/lib/db.php`) uses a **singleton pattern** with **load-balanced connections**:

```php
// Always access the database through the singleton:
$result = DbClass::Factory()->DbExecute([
    "sql" => "SELECT * FROM accounts WHERE id = ?",
    "params" => DbClass::Factory()->DbParams($account_id)
]);
```

**Key design decisions:**
- **Singleton**: `DbClass::Factory()` returns the single `DbClass` instance
- **Load balancing**: Multiple MySQL users per database; a random user is selected per connection to distribute load across the MySQL connection pool
- **HA failover**: Dedicated MySQL HA server with internal/external IPs; connection routing based on hosting platform (Cloud Sites vs dedicated servers vs cron servers)
- **Multi-database**: Separate databases for main data, analytics, cron tracking, service requests, zoom licenses, universal login, and domain tracking
- **Auto-reconnect**: Handles "MySQL server has gone away" (error 2006) with automatic reconnection attempts
- **Product isolation**: GetOiling and AttractWell have separate databases with separate credentials

### Database Functions

| Function | Purpose |
|----------|---------|
| `DbClass::Factory()->DbExecute($input)` | Execute parameterized SQL. Returns object with `->success`, `->results`, `->code`, `->message` |
| `DbClass::Factory()->DbParams(&$var1, &$var2, ...)` | Create parameter array for DbExecute (pass by reference) |
| `DbClass::Factory()->ArrayToParameterizedSql(&$array, &$params, &$sql)` | Convert array to `?,?,?` SQL with params |
| `GetModelSuccess($results)` | Return success object: `{success: true, results: ...}` |
| `GetModelError($code, $message)` | Return error object: `{success: false, code: ..., message: ...}` |
| `GetModelSuccessWithData($results, $data)` | Success with additional data field |
| `GetModelErrorWithData($code, $message, $data)` | Error with additional data field |
| `SuccessOnOnlyOneRow($result)` | Returns success only if exactly one row |
| `$Oil->PaginateSet(...)` | Pagination helper (defined in `oilylife/models/oil.php` on `OilClass`) |

### Query Pattern

```php
// In a model class:
public function GetWidget($widget_id)
{
    $retval = DbClass::Factory()->DbExecute([
        "sql" => "SELECT id, name, status FROM widgets WHERE id = ?",
        "params" => DbClass::Factory()->DbParams($widget_id)
    ]);

    if ($retval->success) {
        return GetModelSuccess($retval->results);
    }
    return GetModelError($retval->code, $retval->message);
}

// Pagination (in OilClass or subclass):
public function GetWidgetsPaginated($pagenum, $pagesize)
{
    return $this->PaginateSet(
        $pagenum,
        $pagesize,
        "SELECT COUNT(*) as cnt FROM widgets",
        null,
        "SELECT id, name FROM widgets ORDER BY created_at DESC LIMIT ?, ?",
        DbClass::Factory()->DbParams($offset, $pagesize)
    );
}
```

## Authentication Flow

1. **Login**: `oilylife/controllers/log-in.php` handles `/log-in` routes
2. **Session**: `oilylife/lib/require-session.php` validates active sessions on authenticated pages
3. **Admin access**: `oilylife/lib/require-admin.php` restricts admin-only features
4. **JWT**: Firebase JWT (`firebase/php-jwt`) used for token-based auth (API, universal login)
5. **Two-factor**: Token-based 2FA via `/two-factor-login/{token}`
6. **Universal login**: Cross-product SSO via `/all-log-in` and shared `368140_universal_login` database
7. **Password reset**: Token-based via `/reset-password/{token}`

## Model Traits

Traits in `oilylife/models/traits/` provide shared behaviors across model classes:

| Trait | File | Purpose |
|-------|------|---------|
| `DetectHostingPlatformTrait` | `detect-hosting-platform.php` | Detects server environment (Cloud Sites, new web server, cron server, etc.) Used by `DbClass`. |
| `EncryptionTrait` | `encryption.php` | AES-128-GCM token encryption/decryption |
| `TagsTrait` | `tags.php` | Tag CRUD operations (add, remove, list tags) |
| `PrepareAccountIdTrait` | `prepare-account-id.php` | Account ID normalization and preparation |
| `MemberAreaTrait` | `member-area.php` | Member area shared functionality |
| `BunnyApiKeyTrait` | `bunny-api-key.php` | Bunny CDN API key management |
| `MailgunApiTrait` | `mailgun-api-trait.php` | Mailgun API authentication headers |

## API Endpoints

The REST API lives in `oilylife/api/controllers/`, with authentication handled by `oilylife/api/models/api-auth.php`.

**URL pattern**: `/api/v1/{resource}/{id}/{action}/...` → `api/controllers/{resource}.php`

Key endpoints include contacts, leads, classes, events, campaigns, automations, follow-up plans, landing pages, pages, vaults, custom GPTs, OAuth, Zapier, and Exigo integrations. See `oilylife/api/controllers/` for the current list.

## Cron / Background Jobs

Background jobs run on dedicated cron servers (`new_cron` or `old_cron` hosting platforms). Job categories:

- **Messaging**: `send-queued-messages.php`, `send-campaign-messages.php`, `send-notifications.php`
- **Billing**: `referral-credit.php`, `referral-credit-braintree.php`
- **Scheduling**: `send-calendar-reminders.php`
- **Maintenance**: `database-cleanup.php`, `renew-ssl-certificates.php`, `process-ssl-queue.php`, `archive-contact-actions.php`
- **Summaries**: `send-daily-summary.php`, `notification-summary.php`, `account-check-in-emails.php`
- **Services**: `run-service-request.php`

See `oilylife/cron/` for the current full list.

## Deployment

Deployment uses SFTP-based scripts:

| File | Purpose |
|------|---------|
| `oilylife/deploy.php` | GetOiling web server deployment |
| `oilylife/attractwell-deploy.php` | AttractWell web server deployment |
| `oilylife/deploy-service.php` | Deployment service endpoint (retrieves site list) |
| `oilylife/oilylife-deploy.yml` | GetOiling deployment config |
| `oilylife/attractwell-deploy.yml` | AttractWell deployment config |
| `oilylife/cron-deploy.yml`, `cron-deploy2.yml` | GetOiling cron server configs |
| `oilylife/attractwell-cron-deploy.yml`, `attractwell-cron2-deploy.yml` | AttractWell cron configs |
| `oilylife/production.yml` | Production deployment config |
| `oilylife/site_deploy.sh`, `production_deploy.sh` | Shell deployment scripts |
| `oilylife/attractwell-deploy.sh`, `attractwell_cron_site_deploy.sh` | AttractWell shell scripts |
| `oilylife/cron_site_deploy.sh` | Cron deployment shell script |
| `oilylife/rollbar-deployment-notifier.sh` | Rollbar deploy notification |

### Staging Server

- **Host**: `vm.web01.attractwell.com`
- **SSH port**: 522
- **User**: `colin`
- **Remote path**: `public_html/`

Upload to staging (when explicitly requested):
```bash
scp -P 522 oilylife/<file-path> colin@vm.web01.attractwell.com:public_html/<remote-path>
```

### Update All Environments

To synchronize local repos and staging server:
1. `cd oilylife && git pull origin master --no-rebase --no-edit`
2. `cd getoiling && git pull origin master`
3. `ssh -A -p 522 colin@vm.web01.attractwell.com "cd public_html && git stash && git pull origin master --no-rebase --no-edit && git stash pop"`

## Security

### Headers (set in `oilylife/index.php`)
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `Content-Security-Policy: frame-ancestors 'self'` — CSP frame restriction
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — controls referrer leakage
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` — enforces HTTPS

### `.htaccess` Security
- Blocks access to sensitive directories: `config/`, `helpers/`, `i18n/`, `lib/`, `models/`, `scripts-command-line/`, `themes/`, `vendor/`, `views/`, `cron/`
- Blocks probing for `.git`, `.env`, `wp-config.php`, `wp-admin`, `.htaccess`, `.bak`, `.sql`, `.zip`
- IP blocklist for known bad actors
- Bot blocking (missing User-Agent + Referer, with Twilio callback exceptions)
- Forced HTTPS on all platform domains

### PHP Configuration (`.htaccess`)
- `upload_max_filesize`: 64MB
- `post_max_size`: 64MB
- `max_input_vars`: 10,000

## Quick Reference: Adding a New Feature

### New Controller
1. Create `oilylife/controllers/my-feature.php`
2. It will be auto-routed via `/app/my-feature` through `master-controller.php`
3. Include required models and helpers at the top
4. Use `$_GET['pagenum']`, `$_GET['location']`, `$_GET['pageaction']` for sub-routing

### New Model
1. Create `oilylife/models/my-feature.php` with a class (e.g., `MyFeatureClass`)
2. All SQL goes in the model, never in controllers
3. Use `DbClass::Factory()->DbExecute()` with prepared statements
4. Return `GetModelSuccess()` / `GetModelError()` from all methods

### New API Endpoint
1. Create `oilylife/api/controllers/my-resource.php`
2. Auto-routed via `/api/v1/my-resource`
3. Use `oilylife/api/models/api-auth.php` for authentication

### New Cron Job
1. Create `oilylife/cron/my-job.php`
2. Include `lib/db.php` and any needed models directly (cron jobs don't go through `index.php`)
3. Add to deployment YAML cron configs

## PHP Version Constraint

PHP 7.2 — defined in `oilylife/composer.json` under `config.platform.php`. All code must be compatible.

## Third-Party Libraries

See `oilylife/composer.json` for the current dependency list with versions. Key integrations:

- **Stripe** (`stripe/stripe-php`) — Primary payment processing
- **Braintree** (`oilylife/thirdparty/braintree-php-*`) — Alternative payment processing
- **Twilio** (`twilio/sdk`) — SMS and voice calls
- **Pusher** (`pusher/pusher-php-server`) — Real-time WebSocket messaging
- **Firebase JWT** (`firebase/php-jwt`) — JWT authentication
- **Guzzle** (`guzzlehttp/guzzle`) — HTTP client
- **Intervention Image** (`intervention/image`) — Image manipulation
- **Parsedown** (`erusev/parsedown`) — Markdown parsing
- **HTML to Text** (`soundasleep/html2text`) — Email text conversion
- **HTML to Markdown** (`league/html-to-markdown`) — HTML→Markdown conversion
- **ParseCSV** (`parsecsv/php-parsecsv`) — CSV parsing
- **Rollbar** (`oilylife/thirdparty/rollbar/`) — Error reporting
- **Dropzone.js** (`oilylife/thirdparty/dropzonejs/`) — File upload UI
- **TinyMCE** (`oilylife/thirdparty/tinymce/`) — Rich text editor
- **Linkify.js** (`oilylife/thirdparty/linkifyjs/`) — URL detection in text

Frontend libraries loaded via CDN or bundled (check views for current usage): Froala Editor, Flatpickr, Chart.js, Select2, jQuery UI, SortableJS, Canva Embed SDK, Giphy SDK, Pixabay SDK.
