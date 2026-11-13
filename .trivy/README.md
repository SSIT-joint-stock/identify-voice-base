# Trivy repository scanning

CI scans the repository for dependency vulnerabilities, secrets and
infrastructure misconfigurations.

Enforcement policy:

- Findings at every severity are included in the SARIF report.
- HIGH vulnerabilities are reported but do not block CI.
- Fixable CRITICAL vulnerabilities block CI.
- HIGH and CRITICAL secrets or misconfigurations block CI.
- The SARIF artifact is retained for 30 days.

Set repository variable ENABLE_GITHUB_CODE_SCANNING=true to upload SARIF to
GitHub Code Scanning. Leave it unset when GitHub Code Security is unavailable;
the workflow artifact is still retained.

The ignore file uses JSON-compatible YAML so CI can validate it without
installing dependencies. Every exception must contain an id, statement and UTC
expired_at date using YYYY-MM-DD. Use paths or purls to narrow its scope.

Run the policy checks locally without Trivy or Docker:

```bash
node .github/scripts/validate-trivy-ignores.mjs
node --test .github/scripts/tests/*.test.mjs
```
