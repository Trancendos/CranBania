🔒 [Security Fix] Authenticate /api/automation/status route

🎯 What: The `/api/automation/status` GET route was exposing automation health information without requiring any authentication.

⚠️ Risk: Unauthenticated attackers could glean information about the automation health, data versions, webhooks, and scheduler status, which could be used as a stepping stone for further attacks or to understand the internal structure of the deployment.

🛡️ Solution: Added a call to `verifyApiAuth(request)` inside the `GET` function. If the authentication check fails, the route now returns a 401 response using `authRequiredResponse("api")`, ensuring that only authorized users with the valid `CRANBANIA_API_KEY` can access this information.
