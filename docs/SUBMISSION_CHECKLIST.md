# Submission Checklist

## Devpost project details

- [x] Final project story reflects the actual finished build
- [x] Built-with tags are accurate
- [x] Public repository link added: https://github.com/ATAC-Helicopter/ProofRestore
- [x] Live deployment link added: https://proofrestore.vercel.app
- [ ] Public video link added
- [ ] Image gallery uploaded
- [ ] Correct category selected
- [ ] All required OpenAI/Codex fields completed
- [ ] Main Codex session ID saved
- [ ] Submission entered before the safety deadline

## Product

- [x] Demo vault loads
- [x] Dashboard contrast is visible
- [x] Thesis query works
- [x] Tuesday snapshot resolves to `snapshot-2026-07-14-1730`
- [x] Restore simulation works without filesystem writes
- [x] Evidence viewer works
- [x] Markdown report exports
- [x] No-key fallback works and is unit tested
- [x] API-key route, structured schema, timeout, and fallback are implemented
- [ ] Credentialed API-key smoke test completed
- [x] Malformed imports fail safely in validation tests
- [ ] Valid and malformed imports smoke-tested in the final deployed UI

## Engineering

- [x] Formatting passes
- [x] Lint passes
- [x] Typecheck passes
- [x] Unit/integration tests pass: 59 tests
- [x] Production build passes
- [x] Chromium E2E suite passes: 4/4 tests, including the critical flow
- [x] Clean automated Chromium flow completed
- [x] Valid and malformed imports smoke-tested locally
- [x] No-key API fallback smoke-tested locally
- [x] README setup tested from a fresh local clone
- [x] No secrets detected in the repository review

## Media

- [x] 3:2 project cover image captured
- [x] Dashboard screenshot captured
- [x] Recovery result screenshot captured
- [x] Restore simulation screenshot captured
- [x] Proof report screenshot captured
- [x] Welcome and recovery-request screenshots captured
- [x] Video under required duration: 1:17
- [x] Narration track generated and muxed into the MP4
- [x] SRT captions added for upload and accessibility

## Final release checks

- [x] GitHub Actions validation workflow added
- [x] Node/npm runtime metadata added
- [ ] Public-release license selected and added
- [x] Git remote configured and pushed
- [x] `npx playwright install chromium` completed in the verification environment
- [x] No-key demo rehearsed in a clean Chromium context
- [ ] Report download verified in the deployed site
- [x] Mobile viewport smoke-tested
- [x] Keyboard-accessible labels used by the final automated flow
- [x] Deployment uses the deterministic no-key path and exposes no application secrets
- [x] Known limitations match the shipped MVP
- [ ] Submission completed before the safety deadline
