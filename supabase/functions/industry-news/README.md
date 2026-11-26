# Industry news

Read-only fixed-source RSS/Atom aggregator. No database or private user data is accessed.

Deployment uses `verify_jwt=false` because the app uses a publishable API key, not a bearer JWT. The function checks the `apikey` header against the project's public application key and environment-provided publishable keys. Secret/service-role keys are neither needed nor embedded.

Only six predefined HTTPS feeds are fetched. Redirects, oversized feeds and XML entities/DTDs are rejected. Output contains only titles, canonical publisher links, publication timestamps, source names and category/language metadata. No full article bodies or generated translations are returned.

Function cache: 10 minutes. Browser cache/automatic refresh: 30 minutes. Cached fallback is clearly marked and limited to 24 hours. Failed sources do not block the other feeds. Request fan-out is shared within an isolate.

Run regression tests with `node --test tests/*.test.*`. Feed parsing is isolated in `core.mjs`, which also runs under Node for real-feed checks.
