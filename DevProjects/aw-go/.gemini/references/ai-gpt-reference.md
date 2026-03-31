# AI/GPT Development Reference

Reference file for AI/GPT development.

## Architecture
- **AI model classes**: `oilylife/models/ai-chatgpt.php` (OpenAI), `oilylife/models/ai-anthropic.php` (Claude), `oilylife/models/ai-gemini.php` (Gemini), `oilylife/models/ai-grok.php` (Grok)
- **AI base model**: `oilylife/models/ai.php` — common AI functionality
- **Configuration trait**: `oilylife/models/ai-models-config.php` — per-account AI model settings
- **Custom GPTs**: `oilylife/models/custom-gpts.php` — chatbot creation and management
- **GPT controller**: `oilylife/controllers/gpt.php` — public chat, streaming, embed endpoints
- **GPT admin**: `oilylife/controllers/custom-gpts.php`, `oilylife/controllers/gpt-chats.php` — admin management
- **JS core**: `oilylife/js/gpt-chat-core.js`, `oilylife/js/gpt-conversation-viewer.js` — client-side chat logic
- **Streaming helper**: `oilylife/helpers/gpt-streaming-helper.php` — Server-Sent Events for real-time responses

## Rules
1. **Never instantiate AI API clients directly** — always use the model classes in `oilylife/models/ai-*.php`
2. **Use `oilylife/models/custom-gpts.php`** for all chatbot configuration — never reimplement GPT management
3. **AI model selection** is managed via `oilylife/models/ai-models-config.php` — respect per-account model preferences
4. **Supported providers**: OpenAI (ChatGPT), Anthropic (Claude), xAI (Grok), Google (Gemini)
5. **Streaming endpoints** require SSE-specific `.htaccess` rules (`E=no-gzip:1,E=dont-vary:1`) to prevent compression
