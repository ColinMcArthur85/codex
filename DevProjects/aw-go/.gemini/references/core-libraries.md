# Core Libraries Reference

Reference for what already exists in the codebase. Consult before writing new code.

## Core Libraries — Never Reimplement

| Category | File(s) | Rule |
|----------|---------|------|
| Database | `oilylife/lib/db.php` | Never create new database connections. Always use `DbClass::Factory()` |
| Email | `oilylife/lib/mail.php`, `lib/mail-messages.php` | Never create new email sending logic |
| SMS / Voice | `oilylife/lib/text-message.php` | Never create new Twilio clients |
| HTTP requests | `oilylife/lib/rolling-curl.php` | Use for multi-curl operations |
| Routing | `oilylife/lib/router.php` | Use `Redirect()`, `FinalRedirect()` for redirects |
| String utilities | `oilylife/lib/string-libs.php` | Check here before writing string helpers |
| AI — ChatGPT | `oilylife/models/ai-chatgpt.php` | Never instantiate OpenAI API clients directly |
| AI — Claude | `oilylife/models/ai-anthropic.php` | Never instantiate Anthropic API clients directly |
| AI — Gemini | `oilylife/models/ai-gemini.php` | Never instantiate Google AI clients directly |
| AI — Grok | `oilylife/models/ai-grok.php` | Never instantiate xAI clients directly |
| AI — Config | `oilylife/models/ai-models-config.php` | AI model configuration trait |
| Custom GPTs | `oilylife/models/custom-gpts.php` | Never reimplement chatbot logic |
| E-commerce | `oilylife/models/store.php` | Never reimplement product/order/pricing logic |
| Scheduling | `oilylife/models/scheduling.php` | Never reimplement booking/calendar logic |
| CRM / Contacts | `oilylife/models/contacts.php` | Never reimplement contact management |
| Member area | `oilylife/models/member-area.php` | Never reimplement member portal logic |
| Pages | `oilylife/models/pages.php` | Never reimplement page builder logic |
| Payments | `oilylife/models/platform-payments.php` | Never reimplement billing/subscription logic |
| Push notifications | `oilylife/models/push-notifications.php` | Never create new push notification clients |
| WebSockets | `oilylife/models/web-sockets.php` | Never create new Pusher clients |
| Cloud storage | `oilylife/models/cloud-files.php` | Never create new Bunny CDN clients |
| Google Calendar | `oilylife/models/google-calendar-api.php` | Never create new Google Calendar API clients |
| Microsoft Calendar | `oilylife/models/microsoft-office-365-calendar-api.php` | Never create new Microsoft Calendar clients |
| Resource sharing | `oilylife/models/resource-sharing.php` | Never reimplement cross-account sharing |
| Hosting / DNS | `oilylife/models/hosting/` | Never reimplement domain/DNS/SSL logic |
| Encryption | `oilylife/models/traits/encryption.php` | Use the `EncryptionTrait` for token encryption |
| Tags | `oilylife/models/traits/tags.php` | Use the `TagsTrait` for tag operations |

## Third-Party Libraries
See `oilylife/composer.json` for the current dependency list. Notable libraries:
- `stripe/stripe-php` — Stripe payment processing
- `twilio/sdk` — SMS and voice
- `pusher/pusher-php-server` — real-time messaging
- `firebase/php-jwt` — JWT authentication
- `guzzlehttp/guzzle` — HTTP client
- `intervention/image` — image manipulation
- `erusev/parsedown` — Markdown parsing
- `soundasleep/html2text` — HTML to text conversion
- `parsecsv/php-parsecsv` — CSV parsing
- `league/html-to-markdown` — HTML to Markdown conversion

**Never add a new library for functionality already provided by an existing dependency.**

## Helpers
There are **120+ utility files in `oilylife/helpers/`** — always search this directory before creating new helper functions. Use `ls oilylife/helpers/` or search by keyword.
