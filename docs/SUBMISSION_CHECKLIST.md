# Submission Checklist

## Devpost project details

- [x] Final project story reflects the actual finished build
- [x] Built-with tags are accurate
- [x] Public repository link added: https://github.com/ATAC-Helicopter/ProofRestore
- [x] Live deployment link added: https://proofrestore.vercel.app
- [ ] Public video link added
- [ ] Image gallery uploaded
- [x] Correct category chosen: Work and Productivity
- [ ] All required OpenAI/Codex fields completed
- [x] Main Codex session ID saved: `019f725f-5164-7321-a0a9-a67dab130787`
- [ ] Submission entered before the safety deadline: Tuesday, July 21 at 23:00 CEST (official close: July 22 at 02:00 CEST / July 21 at 17:00 PDT)

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
- [x] Credentialed interpreter remains intentionally disabled on the public deployment; mocked boundary tests cover the structured Responses API handoff
- [x] Malformed imports fail safely in validation tests
- [x] Recovery Lab accepts user-selected files/folders or safe sample data
- [x] Recovery Lab exposes snapshots, virtual modification/deletion, corruption, missing objects, conflicts, and an ordered activity log
- [x] Recovery Lab exports a validated manifest and opens it in the complete workflow without sending selected names to the interpreter
- [ ] Valid and malformed imports smoke-tested in the final deployed UI

## Engineering

- [x] Formatting passes
- [x] Lint passes
- [x] Typecheck passes
- [x] Unit/integration tests pass: 66 tests
- [x] Production build passes
- [x] Chromium E2E suite passes: 8/8 tests, including the critical flow, responsive checks, partial recovery presentation, and desktop/mobile Recovery Lab testing
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
- [x] Recovery Lab setup/safety screenshot captured
- [x] Recovery Lab corruption/evidence screenshot captured
- [x] Video under required duration: 2:20 (official maximum: 3:00)
- [x] Final video demonstrates the mandatory thesis flow and hands-on Recovery Lab
- [x] Final video explicitly explains how Codex and GPT-5.6 supported development
- [x] Natural neural narration generated, normalized, and muxed as 48 kHz stereo AAC
- [x] Selectable English captions embedded in the final MP4 and retained as an SRT sidecar
- [x] High-contrast pointer and click pulses recorded for every interaction
- [ ] YouTube upload is public and exposes toggleable English CC after the SRT is attached

## Final release checks

- [x] GitHub Actions validation workflow added
- [x] Node/npm runtime metadata added
- [x] MIT public-release license selected and added
- [x] Security policy, private vulnerability reporting, secret scanning, and push protection enabled
- [x] Main branch protected from force pushes/deletion with required CI checks
- [x] CodeQL, Dependabot configuration, SHA-pinned Actions, and browser security headers added
- [x] Git remote configured and pushed
- [x] `npx playwright install chromium` completed in the verification environment
- [x] No-key demo rehearsed in a clean Chromium context
- [x] Report download verified in the deployed site
- [x] Mobile viewport smoke-tested
- [x] Keyboard-accessible labels used by the final automated flow
- [x] Deployment uses the deterministic no-key path and exposes no application secrets
- [x] Known limitations match the shipped MVP
- [ ] Submission completed before the safety deadline
