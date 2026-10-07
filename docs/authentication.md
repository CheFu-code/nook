# Authentication

Nook uses the Chefu Account app as its centralized sign-in experience. The sign-in screen opens the account app's OAuth authorization flow; the account app handles credentials, passkeys, MFA, email verification, and backend session creation. Nook completes the authorization-code flow with PKCE and stores a Nook-scoped OAuth token.

## Local development

1. Set `EXPO_PUBLIC_API_BASE_URL` to the Chefu API base URL in `.env` (the production default is `https://api.chefu.co.za`).
2. Run `npm run ios` or `npm run android` to build and launch a native app. On subsequent runs use `npx expo start --dev-client`.

The app scheme is `nook`; the bundle/package identifier is `com.burakorkmez.nook`.

## Session behavior

- Nook uses the registered `nook-mobile` OAuth client, the `nook://sso-callback` redirect URI, PKCE, state, and nonce validation.
- Nook exchanges the authorization code at `/oauth/token` and loads the account from `/oauth/userinfo`.
- OAuth access and refresh tokens are stored with Expo SecureStore on native platforms. Web builds use local storage.
- Nook requests refreshed OAuth access tokens when needed and sends `x-chefu-app: nook` with authenticated Nook API requests.
- The centralized account app enforces account verification and MFA policies.
- Signed-out users see the sign-in screen; signed-in users see protected routes.
- Sign-out clears the local Nook session and asks the backend to clear its session cookies.

Account creation, password recovery, passkeys, and MFA challenges are handled by the Chefu Account app.

## Manual acceptance check

1. Start sign-in and confirm the Chefu Account login opens in the system authentication browser.
2. Sign in with a Chefu account, including an MFA-enabled account, and confirm that protected routes open.
3. Terminate and relaunch the app; the stored session should be restored.
4. Leave the app signed in until the access token expires; the refresh token should obtain a new ID token without prompting for credentials.
5. Sign out and confirm that protected routes return to the sign-in screen.
