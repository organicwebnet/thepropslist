## Gen2 function startup probe failing for `publicContainerInfo`

Context
- Project: `props-bible-app-1c1cb`
- Function: `publicContainerInfo` (Gen2, Node 20, HTTPS)
- Symptom: Cloud Run revision fails health check. Logs show: "The user-provided container failed to start and listen on the port provided by the PORT=8080 environment variable within the allocated timeout."
- Impact: Marketing page’s primary backend endpoint unavailable. We currently use a REST fallback against Firestore for public boxes flagged `publicReadable: true`.

What we tried
- Enabled required APIs (Run, Build, Artifact Registry, Eventarc, Logging).
- Granted IAM (run.admin to user, service agents present).
- Cleaned previous service; redeployed.
- Set `minInstances: 1` to keep a warm instance (deploy requires `--force`).
- Reduced cold start footprint (lazy-loaded Stripe SDK; no material change).
- Added a Gen1-style fallback `publicContainerInfoV1` (also surfaces as Gen2 under the hood and hit the same probe failure).

Why this happens (likely)
- Gen2 Functions are packaged as Cloud Run services; if the Node process throws/aborts on module init or never reaches the HTTP handler bootstrap, the container never binds to `PORT` → startup probe fails.
- Common root causes:
  - Crash on top-level import (ESM/CJS or missing secret/env)
  - Async init throwing before handler (e.g., network call)
  - Incorrect export or mixed v1/v2 usage causing no handler
  - Extremely slow init beyond health check window

Immediate workaround (live now)
- Marketing page falls back to Firestore REST for `packingBoxes` with `publicReadable: true`, querying by `code | shortCode | id | name`, and renders `publicProps` + children.

Recommended remediation plan
1) Inspect Cloud Run revision logs for the latest failing revision
   - Console: https://console.cloud.google.com/logs/viewer?project=props-bible-app-1c1cb&resource=cloud_run_revision
   - Filter by service `publiccontainerinfo`, Severity = Error, Time = last 30 min
   - Capture the first stack trace/error line during startup

2) Add defensive init and isolate optional integrations
   - Keep all optional SDKs lazy-loaded inside handlers (Stripe already changed)
   - Move any top-level network or env-dependent code inside handlers
   - Ensure only one Functions flavor per export (v2 for `publicContainerInfo`; v1 only for explicitly named fallbacks)

3) Test locally and via emulator
   - Local import sanity:
     - `node -e "import('./functions/lib/src/index.js').then(()=>console.log('ok')).catch(e=>console.error(e))"`
   - Firebase emulator (if practical) to catch runtime import errors before deploy

4) Redeploy with gentle settings
   - Keep `timeoutSeconds: 120`, `memory: 512MiB`, `minInstances: 1` (requires `--force`).
   - Deploy only the target function to shorten cycles:
     - `npx firebase-tools deploy --only functions:publicContainerInfo --project props-bible-app-1c1cb --non-interactive --debug --force`

5) If still failing, use a small express wrapper to guarantee binding
   - Wrap the v2 onRequest handler with minimal work before the first `res.*` call.
   - Alternative: publish a tiny dedicated service in Cloud Run (manual Docker) that calls Firestore/Admin; point marketing to that URL.

6) Option B (short-term): precompute `publicProps`
   - Run an admin script that scans `packingBoxes` and writes `publicProps` with the first image (already prototyped) so the marketing page doesn’t need the function. Rerun as needed or cron.

Baseline commands and roles
- APIs to enable (once per project):
  - `gcloud services enable run.googleapis.com`
  - `gcloud services enable cloudbuild.googleapis.com`
  - `gcloud services enable artifactregistry.googleapis.com`
  - `gcloud services enable eventarc.googleapis.com`
  - `gcloud services enable logging.googleapis.com`

- Helpful IAM (principals may already have these via Firebase setup):
  - User (deployer): `roles/run.admin`
  - Service Agents present: `run.serviceAgent`, `cloudbuild.serviceAgent`, `artifactregistry.serviceAgent`, etc.

Notes on code
- `functions/src/index.ts` exports `publicContainerInfo` (v2) and `publicContainerInfoV1` (explicit v1). Admin SDK is initialized once at top; keep it.
- Stripe is lazy-loaded inside billing endpoints to minimize cold-start.

Acceptance criteria for closure
- A new revision of `publiccontainerinfo` starts and serves 200 on `/publicContainerInfo`.
- First request latency < 2s on a warm instance; cold-start < health check window.
- Marketing page primary path uses the function; REST fallback remains as safety net.

Owner / Follow-up
- Capture the startup error line from Cloud Run logs and patch accordingly.
- If the error points to an ESM/CJS module mismatch, switch the import style (default vs named) or move import inside handler.

