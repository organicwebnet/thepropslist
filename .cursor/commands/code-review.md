Review the changes on code-review.md
quality of code is more important than completeingthat task quickly so please take your time to complete the task i dont mind if you take longer to come up with a better quality product. i do mind if you rush through the task and dont complete it to a satisfactory standard becauces your trying to reduce the time on task. take your time do your research and product the best quality code you can quality is king!!
- did you truly fix the issue?
- is there any redundat code or files in the codebase?
- is the code well written?
- Think through how data flows in the app. Explain new patterns if they exist and why.
- have you added an infinat loop into the code?

- Is the code readable and consistent with best practice and coding conventions?
- Are functions/classes appropriately sized and named?
- Are comments clear, necessary, and not excessive?

- Does the code do what it claims to do?
- Are edge cases handled?
- what effect dose the code have on the rest on the codebase?it it working with the current code base.
- is the front end optimised? 
- is the css in a style sheets that is reuse across the project? 
- do we have any white on white or black on black issues.
- check there is enought contrast between the font colour and he background, including form emelents.
-is the styles thar are no longer used?
- when writing html keep it samantic and valid.
- use proper html form structures.
- is the html valid html.
- is the ui responcive, will display on moblie and tablets
- is the code DRY and meet wit hgood codeing standards?

- have you considered the positioning of the elements on the page consider there relavance and how they should be weighted on the page  from a ux ui point of view and reapply them. 
is the js comon or ES as firestore dosent work well with ES yet?

- Are inputs validated and sanitized?
- Are secrets, credentials, or sensitive data exposed?
- Is error handling robust and user-friendly?
- are there any other concerns with this feature is the ui and ux functional and actully working ?
- Are tests meaningful and isolated?
- Do they fail for the right reasons?
- Is mocking/stubbing used appropriately?

-use uk engglish not us english check for typos and follow the writing rules in the writng.mdc file.


- Are there any changes that could affect infrastructure?
- Error empty, loading, error, and offline states.
- Consider front-end concerns: a11y (keyboard navigation, focus management, ARIA roles, contrast)
- If APIs have changed, ensure backwards compat (or increment API version)
- Did you add any unnecessary dependencies? If there’s a heavy dependency, could it be in a more minimal form?
- Did you add quality tests? Prefer fewer, high quality tests. Prefer integration tests for user flows.
- Were there schema changes which could require a database migration?
- Consider auth flows or permissions? Run /security-review.
- If an API is set up, does this change require adding a new one?
- If i18n is set up — are these strings added localized and new routes internationalized?
- Are there places we should use caching?
- Are we missing critical o11y or logging on backend changes?