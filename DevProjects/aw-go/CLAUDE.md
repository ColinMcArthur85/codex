# Agent Directives

## Planning Protocol — MANDATORY

Before making any changes to the codebase, you MUST follow the planning protocol defined in `.claude/planning-protocol.md`. Read it and follow all phases (Understand → Clarify → Analyze → Plan) before writing any code.

The only exception is trivial one-line fixes where the change is unambiguous (e.g., fixing a typo in a string).

## Token Efficiency — MANDATORY
Be proactive about conserving usage limits. Batch tool calls, minimize unnecessary narration, and recommend fresh chats for new objectives as per `.claude/rules.md`.

## Context Loading — Read Before Every Task

Before responding to any task, read these files in this order:

1. **`.claude/ARCHITECTURE.md`** — System architecture, request flow, directory structure, database patterns
2. **`.claude/rules.md`** — Coding standards, conventions, agent behavior rules, submission checklist
3. **`.claude/planning-protocol.md`** — The full planning and alignment protocol

Then consult the relevant reference files based on the task:

| Task involves... | Read this file |
|-----------------|----------------|
| Twilio, SMS, voice, text messaging | `.claude/references/twilio-reference.md` |
| AI, GPT, chatbots, streaming, AI model classes | `.claude/references/ai-gpt-reference.md` |
| Checking if functionality already exists | `.claude/references/core-libraries.md` |
| Feature-specific work (CRM, Store, Scheduling, etc.) | `.claude/references/feature-checklists.md` |
| Understanding the tech stack or platform architecture | `.claude/references/tech-stack.md` |
| Modifying `.htaccess` or URL routing | `.claude/references/htaccess-reference.md` |

If the task is general PHP/JS development, the first three files are sufficient.
