# Current implementation notes

Reviewed with the Nook social API migration in progress. This records repository behavior, not a deployment or legal compliance certification.

## Sign-in and account identity

The app opens CheFu Account's OAuth authorization-code flow using PKCE and the registered `nook-mobile` client. The CheFu API receives bearer tokens and `x-chefu-app: nook`; social controllers use the backend `AuthGuard` identity, not a client-supplied owner ID.

## Application data and media

The Nook API stores profile, post, story, follow, interaction, bookmark, upload and deletion records in Firestore collections prefixed `nookSocial`. Conversations and message documents use `nookConversations` and its `messages` subcollection. Uploaded media is stored under `nook/{uid}/` in the configured Firebase Storage bucket. Media URLs are signed for five minutes after an authenticated URL request.

Profiles, posts, comments, stories and social relationships are available to authenticated members. Conversation routes check participant membership. Messages are not end-to-end encrypted. Explore's topic/search filtering includes client-side filtering of loaded posts. The app currently offers no saved-post gallery despite storing bookmarks.

## Deletion, expiry and limitations

The Nook deletion endpoint attempts to delete the profile, authored posts and stories, interactions, bookmarks, follows, uploads/media and conversations/messages for both participants. It retains a status record keyed by the CheFu identity. It does not delete the CheFu Account. Cleanup currently scans social records and has not been load-tested for large accounts.

Stories are hidden after 24 hours, but no automated physical cleanup for expired stories is configured. Upload session expiration prevents publication after one hour; no general automated orphan-file cleanup is configured.

These API changes are not yet deployment-verified. Existing social records from any previous data service have not been imported by this repository change. No live OAuth/API request, real-user deletion or connected-device social round trip was performed as part of this source review.
