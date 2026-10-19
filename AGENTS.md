# Architecture rules

- Keep completed experiment definitions available for historical reporting, but disable assignment and experiment tags when a variant is rolled out; this prevents post-experiment traffic from contaminating results.
- Keep the home demonstration media as static public/video files and defer its source attachment until near the viewport; this preserves direct media URLs and protects initial page loading.
- Forward the Google Calendar callback through a server route to the existing OAuth function, retaining the request redirect URI in signed state; this preserves in-flight and legacy authorization flows during configuration changes.
- Represent the principal vehicle through the existing default-vehicle preference and synchronize mounted preference consumers on changes; one shared ID prevents competing principal flags and stale trip defaults.
- Pass vehicle choices and the parent's updateTrip through TripCard to TripViewSheet; this reuses trip IK calculation without per-card data or auth requests.
- Archive vehicles in an owner-scoped snapshot table and capture their identity/rate inputs on affected trips before deletion; use trip snapshots in display/exports and preserve stored IK so restoring or deleting a vehicle cannot erase historical fiscal evidence.