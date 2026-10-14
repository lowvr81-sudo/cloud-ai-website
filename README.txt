CLOUD AI V5 — MODEL LOADING FIX

WHAT CHANGED
- Corrected the model repository to the Transformers.js-compatible ONNX version:
  onnx-community/SmolLM2-135M-Instruct-ONNX
- Kept GPU loading with a WASM/CPU fallback and a Retry AI loading button.
- Includes the current Cloud AI HTML, Supabase browser config, and SQL setup.

INSTALL
1. Extract this ZIP.
2. In your GitHub repository, replace index.html and supabase.js in the repository root.
3. Commit the changes and wait for GitHub Pages to deploy.
4. Open https://lowvr81-sudo.github.io/cloud-ai-website/ and press Ctrl+Shift+R.

SUPABASE
- The included supabase.js uses your project's URL and browser public key.
- Never put an sb_secret_ key, service_role key, database password, or Google OAuth client secret in public HTML/JS.
- If you have not set up the database, run supabase-setup.sql in your Supabase SQL Editor.
- Google sign-in requires Google to be enabled and configured in Supabase Authentication.

MODEL NOTES
The AI model downloads from Hugging Face on first use. A first load cannot be guaranteed to finish in five seconds. Later loads may be faster because of browser caching. If it fails, press Retry AI loading and inspect the browser console for the reported error.
