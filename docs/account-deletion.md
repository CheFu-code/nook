# Nook account deletion

Settings → Delete Account confirms before sending an authenticated `POST /nook/account/deletion`. The API derives the account identity from the CheFu access token; clients do not submit a user ID.

The backend records the request, blocks further profile creation while deletion is pending, then removes the Nook profile, posts and their interactions, stories, uploaded files, bookmarks, follows, comments authored by the member, and conversations/messages for both participants. It retains a minimal deletion-status record keyed by the CheFu identity to prevent old access tokens from recreating the Nook profile.

Deletion does **not** delete or disable the user's CheFu Account. After the Nook cleanup succeeds, the app signs out locally. If cleanup fails, the API marks the request failed and the signed-in user can retry from the deletion screen. Completed deletion cannot be undone through the app.

The synchronous cleanup has not yet been load-tested with large accounts. Firebase Storage lifecycle policies, Firestore backups, API/security logs, and third-party retention are outside this cleanup operation. Validate deletion in a disposable development account before release.
