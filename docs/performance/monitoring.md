# Monitoring Setup

## Overlay
- A lightweight performance monitor overlay is embedded in `frontend/js/admin.js`.
- Displays current FPS and last render duration.
- Turns red if FPS < 50.

## Alerts
- Console warnings emitted when a render exceeds 100ms.
- Use browser DevTools Performance panel for deeper traces.

## Usage
- Open admin dashboard; monitor appears bottom-right.
- Scroll tables and perform actions; watch FPS and render times.