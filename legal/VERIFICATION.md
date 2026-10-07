# Verification

Current implementation checks are tracked with the source change:

- CheFu backend TypeScript build and type-check are required for API changes.
- Nook app TypeScript check is required after client API changes.
- `python legal/build.py` regenerates the HTML legal pages from canonical Markdown.

No live backend deployment, Firestore/Storage integration test, real-account deletion, import of existing social records, or connected-device end-to-end test is claimed. Resolve these acceptance gaps before release.
