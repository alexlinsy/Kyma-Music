## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Kyma Music Design System & Color Palette
ALWAYS use the following custom Tailwind CSS variables instead of hard-coding raw colors (like `text-white` or `bg-black`). This ensures perfect dual-theme compatibility.

## Tailwind Semantic Colors:
- **Primary / Accent**: `text-kyma-primary` / `bg-kyma-primary`
- **Main Background**: `bg-kyma-bg`
- **Typographic Text**: `text-kyma-text`
- **Modals / Cards / Inputs**: `bg-kyma-panel`

## Dark Mode Mapping (Default Root):
- Primary: `#0075de` (Electric Blue)
- Background: `#0f0f0f` (Deep OLED Black)
- Text: `#f6f5f4` (Off-White)
- Panel: `#181818` (Frosted Dark Gray)

## Light Mode Mapping (`.light` Root):
- Primary: `#f17c78` (Warm Coral / Soft Red)
- Background: `#fff8ef` (Cream / Warm Off-White)
- Text: `#2e333d` (Deep Slate)
- Panel: `#ffffff` (Pure White)

**CRITICAL RULE**: Whenever adding new UI elements, always pair elements with alpha channels instead of opaque grays. E.g. Border lines should be `border-kyma-text/10` rather than `border-zinc-800`. Background hovers should be `hover:bg-kyma-text/5`.

