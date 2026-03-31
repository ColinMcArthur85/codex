# Feature-Specific Evaluation Checklists

Domain-specific evaluation checklists. Consult when working on these feature areas.

## Contact/CRM Feature
- [ ] Uses `oilylife/models/contacts.php` for contact operations
- [ ] Respects contact permissions and ownership
- [ ] Handles both GetOiling and AttractWell contexts

## Store/E-commerce Feature
- [ ] Uses `oilylife/models/store.php` for product/order logic
- [ ] Handles product variants and pricing tiers
- [ ] Integrates with `oilylife/models/platform-payments.php` for transactions
- [ ] Tests with both Stripe and Braintree payment gateways

## Scheduling/Calendar Feature
- [ ] Uses `oilylife/models/scheduling.php` for booking logic
- [ ] Integrates with `oilylife/models/google-calendar-api.php` and/or `oilylife/models/microsoft-office-365-calendar-api.php` if calendar sync is needed
- [ ] Respects plan-based limits and overrides
- [ ] Handles timezone conversion via `oilylife/helpers/daylight-savings-time-helper.php`

## AI/GPT Feature
- [ ] Uses existing AI model classes (`oilylife/models/ai-chatgpt.php`, `ai-anthropic.php`, `ai-gemini.php`, `ai-grok.php`)
- [ ] Never instantiates API clients directly — use the model classes
- [ ] Custom GPT configuration via `oilylife/models/custom-gpts.php`
- [ ] AI model settings managed through `oilylife/models/ai-models-config.php` trait
- [ ] Streaming endpoints use SSE flags (see `oilylife/.htaccess` GPT stream rules)

## Video Conferencing Feature
- [ ] Uses existing conferencing infrastructure
- [ ] Zoom license management via shared `zoom_license` database
- [ ] Respects plan-based conferencing limits

## Member Area Feature
- [ ] Uses `oilylife/models/member-area.php` for all member portal logic
- [ ] Routes through `oilylife/controllers/members.php`
- [ ] Handles class/lesson/vault/discussion structures
- [ ] Respects member access permissions
