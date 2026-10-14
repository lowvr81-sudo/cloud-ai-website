CLOUD AI V2 — EASY SETUP

FILES
- index.html: the website
- supabase.js: public Supabase browser configuration
- supabase-setup.sql: database table and Row Level Security setup

STEP 1 — DATABASE
1. Open https://supabase.com/dashboard/project/kzozxrhtzzhlmwiiglsi/sql/new
2. Open supabase-setup.sql, copy all its contents into the SQL Editor, and click Run.
   It creates public.cloudai_user_data and user-only Row Level Security policies.

STEP 2 — CONFIGURATION
The included supabase.js has the project URL and public anon key filled in.
If you need to change them, edit the url and anonKey fields in that file. Use only
a public sb_publishable_ key or legacy anon key. Never put an sb_secret_ key,
service_role key, database password, or Google client secret in a public file.

STEP 3 — PUBLISH
1. Open https://github.com/lowvr81-sudo/cloud-ai-website
2. Upload/replace BOTH index.html and supabase.js in the repository root.
3. Commit the changes and wait for GitHub Pages to deploy.
4. Open https://lowvr81-sudo.github.io/cloud-ai-website/ and press Ctrl+Shift+R.

STEP 4 — TEST EMAIL LOGIN
Choose Create account and use your email plus a password of at least 8 characters.
If email confirmation is enabled, confirm the email before signing in.

GOOGLE LOGIN (OPTIONAL)
1. Supabase Dashboard > Authentication > Sign In / Providers > Google: enable it.
2. Add your Google OAuth Client ID and Client Secret to Supabase's Google provider settings.
3. Supabase Authentication > URL Configuration: allow
   https://lowvr81-sudo.github.io/cloud-ai-website/
4. In Google Cloud Console, set the Authorized redirect URI to the exact callback
   URL Supabase displays (usually https://kzozxrhtzzhlmwiiglsi.supabase.co/auth/v1/callback).
5. Save and test Continue with Google. Never put the Google client secret in this website.

NOTES
- The publishable/anon key is public by design; Row Level Security protects user data.
- If the SQL was run previously, it is safe to run again: the script recreates its own policies.
- Cloud chats/settings save only after authentication and successful database access.
- Guest chats stay in the current browser.
- The AI model downloads from the internet on first use and needs a compatible browser/WebGPU.
- GitHub Pages is static hosting and cannot run Ollama locally.


V3 FASTER AI NOTE
This version uses the smaller onnx-community/SmolLM2-135M-Instruct model instead of Qwen2.5-0.5B to reduce download and startup time. It cannot guarantee loading in 5 seconds: first-time model downloads depend on internet speed, browser cache, and hardware. After it has cached, later loads should be quicker. It may be less capable than the larger model.
