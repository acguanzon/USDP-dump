# Admin Dashboard Performance Optimizations

## Root Causes Identified
- Excessive DOM elements when rendering full tables.
- Unoptimized JavaScript re-rendering entire lists for small actions.
- Inefficient data fetching without limits.
- Potential memory leaks from repeated event bindings.
- Animation/transition costs during initial paint.

## Fixes Implemented
- Server-side pagination for users and discounts (`limit/page`).
- Concurrent data fetching and single-frame rendering.
- Event delegation with in-place cache updates.
- Virtualized table rendering with windowed rows and spacer padding.
- Throttled scroll handlers (16ms) to maintain 60fps.
- Motion optimization and reduced heavy transitions.

## Techniques
- Use `requestAnimationFrame` for batch rendering.
- Avoid re-binding listeners; delegate to table containers.
- Render only visible window of rows; use top/bottom spacers.
- Throttle scroll and rapid interactions.
- Log render timings with `performance.now()`.

## Expected Performance
- Initial load < 500ms with 20 items per list.
- Interactions sub-100ms with in-place updates.
- Scrolling maintains ~60fps via windowed rendering.