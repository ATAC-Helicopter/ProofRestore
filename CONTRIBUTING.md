# Contributing

Thank you for helping improve ProofRestore.

1. Open or reference an issue for material changes.
2. Create a focused branch from `main`.
3. Keep recoverability decisions deterministic; interpretation layers must never decide existence, integrity, restore safety, or verdicts.
4. Use synthetic data only. Never commit backup contents, manifests containing private paths, credentials, `.env` files, or deployment metadata.
5. Run the complete validation chain:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

6. Open a pull request and complete its security/trust-boundary checklist.

Report vulnerabilities privately through the process in [SECURITY.md](SECURITY.md), not through issues or pull requests.
