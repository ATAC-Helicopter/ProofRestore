# Security policy

## Reporting a vulnerability

Please use GitHub's **Report a vulnerability** action in the Security tab to submit a private vulnerability report. Do not open a public issue for suspected security problems.

Include the affected commit or deployment, reproduction steps, impact, and any suggested mitigation. Do not attach real backup manifests, private file names, API keys, credentials, or user data; use a minimal synthetic example.

The maintainer will acknowledge a complete report as soon as practical, investigate it privately, and coordinate disclosure after a fix is available.

## Supported version

Security fixes target the current `main` branch and the public deployment. Older commits and downloaded demo artifacts are not maintained as separate release lines.

## Operational boundary

ProofRestore's public deployment keeps credentialed OpenAI interpretation disabled. If that feature is enabled elsewhere, operators must add authentication, rate limiting, spend controls, and abuse monitoring before exposing it publicly.
