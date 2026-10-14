CLOUD AI — FIXED LOCAL PACKAGE
==============================

CONTENTS
- index.html: Cloud AI interface, animated login, account-local chats and background picker
- server.js: Node server, Google OAuth callback, local Ollama chat and health checks
- start.bat: starts Ollama if needed and launches the local website
- install_model.bat: downloads qwen2.5:3b using Ollama
- google.env.example: template for Google OAuth configuration

QUICK START
1. Extract this whole folder to a normal folder such as Downloads\CloudAI_Local.
2. Install Node.js and Ollama if you have not already done so.
3. Double-click install_model.bat once to download qwen2.5:3b.
4. Double-click start.bat. Keep the black server window open.
5. Open http://127.0.0.1:3030 if it does not open automatically.

GOOGLE SIGN-IN SETUP
1. In this folder, create a text file named .env OR use google.env (both are supported).
   IMPORTANT: Windows must not append .txt. In Notepad, Save as type = All files.
2. Add these lines and replace the placeholders with the values from Google Cloud:
   GOOGLE_CLIENT_ID=YOUR_REAL_CLIENT_ID
   GOOGLE_CLIENT_SECRET=YOUR_REAL_CLIENT_SECRET
   GOOGLE_REDIRECT_URI=http://127.0.0.1:3030/auth/google/callback
   OLLAMA_MODEL=qwen2.5:3b
3. In Google Cloud Console > APIs & Services > Credentials, create an OAuth Client ID of type Web application.
4. Add this exact Authorised redirect URI:
   http://127.0.0.1:3030/auth/google/callback
5. If the OAuth consent screen is in Testing mode, add your Google account as a test user.
6. Stop Cloud AI with Ctrl+C and run start.bat again after editing environment values.
7. Click Continue with Google. Credentials stay in the server-side env file; the client secret is not put in the HTML.

TROUBLESHOOTING
- If /auth/google says credentials are missing, ensure .env or google.env is beside server.js, values are real, and you restarted the server.
- If Google says redirect_uri_mismatch, the Google Cloud redirect URI and GOOGLE_REDIRECT_URI must match exactly.
- If chat says model missing, run install_model.bat and then start.bat again.
- /api/health shows whether Ollama and the selected model are available.

SAFETY / SCOPE
- This package intentionally binds to 127.0.0.1, so it is only available on this PC by default.
- Do not expose this development server directly to the public internet. Public deployment needs HTTPS, durable session storage, rate limiting and production security review.
- Local username/password accounts and their chat history remain in this browser's local storage. Google login is validated by the server and uses a server-side session cookie.
- Never share or commit your Google Client Secret.
