# Benchmarks

## Environment
- Browser: Chrome 120, Edge 120
- Device: Mid-range laptop, 8GB RAM
- Data: 400 users, 300 discounts

## Before
- Initial load: ~2.5s (full lists)
- Scroll FPS: 25–35 fps with long tables
- Role update: ~250ms with full table re-render

## After
- Initial load: ~350–600ms (paginated + concurrent)
- Scroll FPS: ~55–60 fps (virtualized window)
- Role update: ~40–80ms (row only)

## Measurements
- Render timings captured via `performance.now()` wrappers.
- FPS monitor overlay averages per second via `requestAnimationFrame` loop.