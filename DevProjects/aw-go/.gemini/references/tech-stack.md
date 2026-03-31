# Technology Stack Reference

Reference file for understanding the technology stack and platform architecture.

## Backend
- **PHP 7.2** (defined in `oilylife/composer.json` under `config.platform.php`) — all code must be compatible
- **Apache** with `mod_rewrite` (`oilylife/.htaccess` routing)
- **Custom MVC framework** — no third-party PHP framework (Laravel, Symfony, etc.)
- See `oilylife/composer.json` for the current PHP dependency list

## Frontend
- **jQuery** — primary JavaScript library
- **Bootstrap** — CSS framework and modals
- **Froala Editor** — rich text/WYSIWYG editing
- **TinyMCE** — alternative rich text editor (`oilylife/thirdparty/tinymce/`)
- **Flatpickr** — date/time picker
- **Chart.js** — charts and analytics
- **Select2** — enhanced select dropdowns
- **jQuery UI** — draggable/sortable interactions
- **SortableJS** — drag-and-drop sorting
- **Dropzone.js** — file uploads (`oilylife/thirdparty/dropzonejs/`)
- **Canva Embed SDK** — Canva design integration
- **Giphy SDK** — GIF selection
- **Pixabay SDK** — stock photo selection
- **Linkify.js** — URL auto-detection (`oilylife/thirdparty/linkifyjs/`)
- **Livestamp** — live timestamp updates (`oilylife/thirdparty/livestamp/`)

## Database
- **MySQL / MariaDB** with HA failover
- Load-balanced connections (multiple MySQL users per database)
- Separate databases for main data, analytics, cron tracking, service requests, zoom licenses, universal login
- See `oilylife/lib/db.php` for connection architecture details

## Dual Platform
- **GetOiling** and **AttractWell** run from the same codebase
- Product detected at runtime via `oilylife/helpers/get-site-type.php`
- Product-specific config in `oilylife/config/getoiling/` and `oilylife/config/attractwell/`
