---
name: ui-accessibility-check
description: Lightweight accessibility checks for Spillwave UI surfaces. Runs as part of adversarial review.
---

# Accessibility Check (Lightweight)

## Scope

This is a practical, low-friction a11y pass suitable for agentic review — not a full WCAG audit.

## Checks to Perform

1. **Accessible names**
   - Buttons, links, and inputs have visible text or `aria-label` / associated `<label>`.

2. **Headings & structure**
   - Main regions have sensible headings.
   - Landmark roles (or equivalent) exist for major layout areas when helpful.

3. **Keyboard / focus (best-effort)**
   - Interactive elements are reachable and do not trap focus in obvious ways.

4. **Color / contrast (heuristic)**
   - Critical text is not extremely low contrast against its background.
   - Status (error/success) is not conveyed by color alone if possible.

5. **Images & icons**
   - Decorative images are marked appropriately; meaningful images have alt text.

## Output

Report findings under the adversarial review as:

```markdown
## Accessibility Notes
- PASS / ISSUES FOUND
- List concrete problems with selectors or descriptions
```

Do not block a review solely on minor a11y notes unless the wireframe itself listed them as acceptance criteria.
