# Architecture rules

- Keep completed experiment definitions available for historical reporting, but disable assignment and experiment tags when a variant is rolled out; this prevents post-experiment traffic from contaminating results.
- Keep the home demonstration media as static public/video files and defer its source attachment until near the viewport; this preserves direct media URLs and protects initial page loading.
- Forward the Google Calendar callback through a server route to the existing OAuth function, retaining the request redirect URI in signed state; this preserves in-flight and legacy authorization flows during configuration changes.
- Represent the principal vehicle through the existing default-vehicle preference and synchronize mounted preference consumers on changes; one shared ID prevents competing principal flags and stale trip defaults.