# Nook social features

Nook signs users in through CheFu Account OAuth. Its social data and media requests use authenticated REST endpoints on the CheFu API; the app does not use a separate social-data provider.

## Development

- Set `EXPO_PUBLIC_API_BASE_URL` if using a non-production CheFu API. The default is `https://api.chefu.co.za`.
- Build a native development client for Expo SDK 57 before testing native media selection or playback.
- Social endpoints are under `/nook` and authenticate the OAuth access token with `x-chefu-app: nook`.
- The backend uses Firestore collections prefixed `nookSocial` and the configured Firebase Storage bucket for uploaded media.

## Live behavior

- Profile onboarding and editing; unique lowercase usernames, display name, bio, website, location and avatar.
- Home, Explore and member-profile feeds; profile search and follower/following lists.
- Photo/video posts, photo stories, likes, comments, comment likes, follows and bookmarks.
- Private one-to-one text messaging, inbox unread filtering and retryable sends.
- Upload sessions are authenticated and bound to their owner. Uploads accept supported image formats up to 10 MiB, videos up to 50 MiB and 30 seconds, and avatars up to 5 MiB.
- Media delivery uses short-lived signed Firebase Storage URLs returned only after an authenticated API request. These URLs remain usable until they expire.
- Social mutations check the authenticated CheFu identity and enforce content ownership or conversation participation.
- Account deletion removes Nook profile/content/media and conversations; it does not delete the user's CheFu Account.

The app uses REST refreshes rather than realtime subscriptions. Screens refresh on focus; the open chat refreshes message history periodically. Search filtering, demo previews and sample demo conversations are local UI behavior.

## Known limitations

- Saved-post state is recorded, but the app does not offer a saved-post gallery.
- Stories stop appearing after their 24-hour expiry. Automated physical removal of expired story files is not yet configured.
- Account deletion is processed synchronously by the API and can fail for retry. The deletion status record is retained to prevent a deleted Nook profile from being recreated with the same active identity.
- Backend pagination and profile lookup are bounded to a modest testing population; load/performance testing is still required before broad release.
- No connected-device end-to-end acceptance test has yet covered OAuth, publishing, social interactions, media playback and messaging together.

## Validation

Run `npm run typecheck` in this project and `npm run build` in `chefu-inc-backend`. Check REST calls against an authenticated development account before publishing a build.
