Review the changes on code-review.md

- Think through how data flows in the app. Explain new patterns if they exist and why.
- Are there any changes that could affect infrastructure?
- Error empty, loading, error, and offline states.
- Consider front-end concerns: a11y (keyboard navigation, focus management, ARIA roles, contrast)
- If APIs have changed, ensure backwards compat (or increment API version)
- Did you add any unnecessary dependencies? If there’s a heavy dependency, could it be in a more minimal form?
- Did you add quality tests? Prefer fewer, high quality tests. Prefer integration tests for user flows.
- Were there schema changes which could require a database migration?
- Consider auth flows or permissions? Run /security-review.
- If an API is set up, does this change require adding a new one?
- i18n is set up — are these strings added localized and new routes internationalized?
- Are there places we should use caching?
- Are we missing critical oily or logging on backend changes?