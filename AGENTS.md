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
