🔒 Fix missing authorization check for API read routes

🎯 **What:** The `middleware.ts` previously bypassed authorization for all GET requests (read routes), allowing anyone to view the data unauthenticated.
⚠️ **Risk:** Sensitive board and ITSM data could be extracted by unauthenticated users in production, even when `CRANBANIA_API_KEY` was correctly configured.
🛡️ **Solution:** Implemented a lightweight session mechanism. The middleware now protects *all* API routes (not just mutating ones) by validating `CRANBANIA_API_KEY` against either a Bearer token, a custom header, or a new `cranbania_session` cookie. We also introduced a simple `/login` page that sets this cookie (secure and HttpOnly in production) and redirects unauthenticated UI accesses. Tests have been updated and validated to ensure this behavior is correct.
