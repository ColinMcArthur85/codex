# Planning Protocol

**Rule: Before making any changes to the codebase, complete the alignment phase below. No code should be written, modified, or deleted until alignment is confirmed.**

This applies to all work — new features, bug fixes, refactors, customer issue resolution, and integrations. The only exception is trivial one-line fixes where the change is unambiguous (e.g., fixing a typo in a string).


## Phase 1: Understand the Request

Before asking clarifying questions, silently analyze:

- What area of the codebase does this touch? (AttractWell, GetOiling, shared code, integrations)
- Which external services are involved? (Twilio, Mailgun, Google Workspace, DNS/domain registrars, payment systems)
- Is this customer-facing? If so, what's the urgency and who's affected?
- Are there existing patterns in the codebase for this type of work?
- Could this change have side effects on the other product? (AW changes affecting GO or vice versa)


## Phase 2: Ask Clarifying Questions

Present numbered questions with sensible default assumptions based on what you know about the codebase and the request. Format them so I can quickly confirm or course-correct:

```
1. [Question] — Assumption: [your best guess based on context]
2. [Question] — Assumption: [your best guess based on context]
...
```

### Questions should cover (as applicable):

**For features & enhancements:**
- Which product is this for? (AW, GO, or both)
- How does this fit with existing UI patterns and components?
- What existing code, components, or utilities can be reused?
- What are the edge cases? (empty states, error handling, validation)
- Does this affect email delivery, SMS, or domain configuration?
- Are there database schema changes required?
- How should this behave for existing customers vs new customers?

**For bug fixes & customer issues:**
- What is the customer experiencing vs what should be happening?
- Can you identify the root cause from the codebase, or do you need more info?
- Is this isolated to one customer or potentially affecting others?
- What's the safest fix that won't introduce side effects?
- Does this need a customer communication after resolution?

**For integrations (Twilio, Mailgun, DNS, etc.):**
- Which API endpoints or services are involved?
- Are there rate limits, authentication changes, or API version considerations?
- How should failures be handled? (retry logic, fallbacks, error notifications)
- Does this affect A2P registration, email authentication records, or deliverability?

**For refactors & technical debt:**
- What's the scope — targeted cleanup or broader restructuring?
- Are there tests covering the code being changed?
- What's the rollback plan if something breaks?


## Phase 3: Analyze Answers & Follow Up

After I respond to the first round of questions:

1. Summarize your understanding of what we're building/fixing and why
2. Identify any remaining gaps or ambiguities
3. Ask follow-up questions if anything is unclear — especially around:
   - Interactions between the two products (AW/GO)
   - Impact on existing customers
   - Anything that contradicts established patterns in the codebase
4. If the task involves UI changes, ask if I have any mockups or wireframes to reference

**Only proceed to implementation after I confirm the summary is accurate.**


## Phase 4: Plan the Approach

Before writing code, outline:

- The files that will be modified or created
- The sequence of changes (what gets done first, dependencies)
- Any existing patterns or components being reused
- Potential risks or side effects to watch for

Present this as a brief plan I can approve, adjust, or redirect before any code is touched.


## Notes

- When in doubt, ask. An extra question is always better than a wrong assumption in a production codebase.
- Reference existing code patterns whenever possible. Don't reinvent what's already established.
- For customer-facing changes, consider whether Greg needs to be looped in.
- For anything touching email delivery, DNS, or domain configuration — be extra cautious. These affect real customers immediately.
