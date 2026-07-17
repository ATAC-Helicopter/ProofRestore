# Submission Checklist

## Devpost project details

- [ ] Final project story reflects the actual finished build
- [ ] Built-with tags are accurate
- [ ] Public repository link added
- [ ] Live deployment link added
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
- [x] Unit/integration tests pass: 57 tests
- [x] Production build passes
- [x] Chromium E2E suite passes: 3/3 tests, including the critical flow
- [x] Clean automated Chromium flow completed
- [x] Valid and malformed imports smoke-tested locally
- [x] No-key API fallback smoke-tested locally
- [ ] README setup tested from scratch
- [x] No secrets detected in the repository review

## Media

- [ ] 3:2 project cover image
- [ ] Dashboard screenshot
- [ ] Recovery result screenshot
- [ ] Restore simulation screenshot
- [ ] Proof report screenshot
- [ ] Video under required duration
- [ ] Voice narration is clear
- [ ] Captions added if possible

## Final release checks

- [x] `npx playwright install chromium` completed in the verification environment
- [x] No-key demo rehearsed in a clean Chromium context
- [ ] Report download verified in the deployed site
- [x] Mobile viewport smoke-tested
- [x] Keyboard-accessible labels used by the final automated flow
- [ ] Deployment environment contains no exposed secrets
- [ ] Known limitations match the shipped MVP
- [ ] Submission completed before the safety deadline
