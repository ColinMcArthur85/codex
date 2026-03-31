# Twilio Integration Reference

Reference file for Twilio SMS/voice integration.

- SMS and voice via `oilylife/lib/text-message.php` and the Twilio SDK (`twilio/sdk`)
- Twilio webhook callbacks hit `/app/voice-callback` and `/app/text-callback`
- These URLs are exempt from bot-blocking rules in `.htaccess` (Twilio doesn't send User-Agent/Referer)
- The `X-Twilio-Signature` header is checked for authentication
