---
description: Analyze a customer support ticket and draft a response based on the codebase and platform rules
---

Use this workflow when the user pastes a customer support ticket or asks a question on behalf of a customer. Your goal is to provide a clear, accurate, and professional response by investigating the actual system behavior in the codebase.

## Steps

### 1. Analyze the Ticket

- Read the provided customer ticket carefully to understand their core issue, question, or confusion.
- Break down the ticket into distinct questions, complaints, or technical requirements.
- Identify the likely system areas involved (e.g., campaigns, page editor, domains, vault payments, automations).

### 2. Formulate a Research Plan

- **Do not guess the answer.**
- Determine which parts of the `.gemini/ARCHITECTURE.md` or existing knowledge might be relevant.
- Plan which directories, controllers (`oilylife/controllers/`), models (`oilylife/models/`), views (`oilylife/views/`), or helper functions to investigate to understand the current system behavior accurately.

### 3. Investigate the Codebase

- Use your search and view tools to inspect the relevant source code.
- Find out exactly how the referenced feature works, what the limitations are, and if any specific behaviors apply (e.g., domain-specific menus mapping automatically instead of being selectable).
- Check the database schema (`.gemini/ARCHITECTURE.md`) or models if data-related.

### 4. Synthesize the Findings

- Compare your findings from the codebase against the customer's question.
- Note any technical constraints that the customer needs to be aware of.
- Ensure your understanding aligns with the project's business rules and architecture.

### 5. Draft the Customer Response

- Draft a professional, empathetic, and clear response to the customer.
- Explain the system behavior in accessible, non-technical terms where possible.
- Clearly explain technical limitations if necessary and offer the best available workaround.
- Provide actionable next steps or troubleshooting instructions if applicable.

### 6. Provide the Output to the User

Present your findings to the user including:
1. **Internal Technical Summary:** A brief explanation of what you found in the code and how the system actually handles the scenario.
2. **Actionable Advice (if any):** If investigating the issue revealed a potential bug, explicit data inconsistency, or missing feature, state this to the user so they can decide whether to initiate a `/create-fix` or `/create-feature`.
3. **Drafted Response:** The ready-to-send reply for the customer.
