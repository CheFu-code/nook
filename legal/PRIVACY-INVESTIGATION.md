# Privacy implementation notes

This review covers source code only. It does not establish deployed settings, provider contracts, logs/backups, data locations, or legal compliance.

## Personal information handled

CheFu Account OAuth provides the signed-in identity. Nook stores profile fields, posts, comments, stories, follows, likes, bookmarks, upload metadata, text messages, read state and deletion status in backend Firestore. Uploaded images/videos are stored in the configured Firebase Storage bucket. Profile searches send the entered query to the API. Message bodies and authored content are visible to the backend.

Native OAuth session data is stored with Expo SecureStore. Web builds use browser local storage. The app initializes Sentry and offers a feedback flow; deployed collection/payload/retention require operator verification.

## Access and retention behavior

The API requires an authenticated CheFu bearer token for Nook routes. Content routes apply ownership checks; conversation operations require participant membership. Media URL generation requires authentication but returns a five-minute signed URL that can be used by anyone holding it before expiry.

Stories stop appearing after 24 hours, but no scheduled deletion of expired story documents or storage objects is configured. Upload sessions become unpublishable after one hour, but abandoned uploaded objects are not generally scheduled for deletion. Account deletion removes Nook records and media as implemented, including both participants' conversation records, but keeps a deletion status record keyed by identity. It does not delete the CheFu identity. The synchronous cleanup scans existing records and is not load-tested.

The code does not explicitly strip EXIF metadata, scan content for malware, provide E2E message encryption, or implement export, private accounts, blocking or in-app privacy-request workflows. Firebase retention/backups and Sentry/API logs are outside app deletion.

No live user data or production telemetry was inspected. Confirm actual processing locations, retention, subprocessors, data-subject request handling, and legal bases with the operator before publication.
