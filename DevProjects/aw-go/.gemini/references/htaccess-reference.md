# `.htaccess` Reference

Reference file for `.htaccess` modifications and URL routing.

The `oilylife/.htaccess` file is critical infrastructure. Key sections:
1. **PHP settings** — upload limits, input vars (wrapped in `<IfModule mod_mosso.c>` for Cloud Sites)
2. **Authorization header** — passthrough for API authentication
3. **IP blocklist** — known bad actors
4. **Security blocks** — protects sensitive directories and files (returns 404)
5. **Cache rules** — 10-year expiry for static assets (CSS, JS, images, fonts)
6. **SSL enforcement** — forces HTTPS on all platform domains
7. **URL routing** — maps clean URLs to PHP controllers/entry points
8. **Compression** — `mod_deflate` with exceptions for SSE streaming endpoints and images

**Never modify `.htaccess` without understanding the full routing chain.** Changes here affect every request.
