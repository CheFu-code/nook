# nook Privacy Policy

**Testing draft — not ready for publication until bracketed fields and reviewer issues are resolved.**

Effective date: [EFFECTIVE DATE]
Operator: [OPERATOR LEGAL NAME], established in [COUNTRY OF ESTABLISHMENT]
Applies to: nook and [APP AND SITE URLS]
Privacy contact: [PRIVACY EMAIL] · [POSTAL ADDRESS]

## 1. About this policy

nook is a testing social application for profiles, photo and video posts, image stories, social interactions and text conversations. This policy explains how its implemented features process personal information. “We” means the operator named above. Our intended testers and countries are [INTENDED TESTER AUDIENCE AND COUNTRIES].

This notice explains data processing; it is not a request for blanket consent. [CONFIRM APPLICABLE PRIVACY LAWS AND STATE PURPOSE-SPECIFIC LEGAL BASES WHERE REQUIRED, INCLUDING ANY SEPARATE CONSENT PROCESS.]

## 2. Information we receive

**Account and sign-in information.** You sign in through the CheFu Account app using its centralized OAuth service. Nook receives an account identifier and available account details such as your name, email address and profile picture, along with OAuth tokens and session information. The account app handles the sign-in methods it offers; Nook does not provide a separate password-entry flow.

**Profile information.** To create a profile, you provide a username and display name. You may add a bio, website, location text and profile image. We store profile identifiers, an authentication identifier, profile fields, avatar references, searchable name/username text and activity counts. The location field is information you enter; the implemented features do not request device GPS location.

**Content and interactions.** We process the photos and videos you upload, captions, comments, stories, likes, comment likes, follows and saved posts. Associated information includes authorship, identifiers, timestamps, media type, size, dimensions and duration where applicable, and upload/publication state. Uploaded files may include embedded information from the original file; the app has no explicit metadata-removal step. A video selected from your library can include audio.

**Messages.** We store the text of conversations, participant and sender identifiers, timestamps, message order and delivery-request identifiers. We also store inbox previews, unread status and read-position information to maintain your inbox. Real conversations currently support text. Simulated attachment, call, online-status or read-receipt features shown in demos do not establish equivalent live features.

**Requests and local state.** Searching profiles sends your search text to the backend; some post filtering happens on your device. The app does not implement a saved search history. Pending message drafts and some viewing/demo state are held in app memory. Network and provider logs may have different retention, as addressed below.

**Technical and deletion information.** Service connections expose request information, such as IP addresses and connection/request metadata, to the receiving service. The app includes Sentry crash/feedback tooling; confirm the deployed event collection, payloads and retention. Account deletion keeps a status record keyed by the CheFu account identifier to prevent an old access token from recreating the Nook profile. [CONFIRM ADDITIONAL HOSTING, SECURITY AND SUPPORT LOG DATA, PURPOSES AND RETENTION.]

## 3. How information is used

The implemented processing supports signing you in, creating and finding profiles, showing posts and stories, selecting a Home feed using follows, recording social interactions, saving posts, delivering conversations, maintaining unread state, validating and serving uploads, and processing deletion requests. Authentication and ownership checks use identifiers to control access. Retained deletion identifiers help prevent still-valid authentication tokens from recreating a deleted account.

Explore filters use ordinary matching rules; the application does not implement AI inference or send content to an AI model. The reviewed app does not implement payment collection, contact-list import, advertising targeting or a separate marketing analytics integration. [CONFIRM ANY OPERATOR PRACTICES OUTSIDE THE APP, INCLUDING SUPPORT, MARKETING, SALE OR ADVERTISING-RELATED SHARING, BEFORE PUBLICATION.]

## 4. Who receives information

**Other members.** Profiles, posts, comments, stories and exposed social relationships are available to signed-in members. Following someone changes your Home feed; it does not make their content private. The current app has no private-account or blocking control. Your saved-post collection is queried for your account rather than offered as a public collection.

Conversation access through the app is restricted to participants. Messages are stored on the backend and are not end-to-end encrypted. Member-facing access restrictions do not prevent the backend from processing message text.

**Service providers.** CheFu Account provides centralized sign-in and the CheFu API provides Nook's authenticated application endpoints. The backend uses its configured Firebase services for database records and uploaded media. These services receive information necessary for their respective flows, including technical request information. Media links are short-lived signed URLs. [CONFIRM PROVIDER ENTITIES, CONTRACTUAL ROLES, SUBPROCESSORS AND ANY ADDITIONAL OPERATIONAL RECIPIENTS.]

**Sharing you choose.** Using the device share sheet can send a post author's username, caption and app link to the destination you select. Other people can also retain screenshots or copies. We cannot recall those external copies through an app deletion action. Visiting a profile website or another external destination subjects that interaction to the destination's own practices.

## 5. Authentication storage and app diagnostics

On native devices, Nook stores its OAuth session using Expo SecureStore. Web builds use browser local storage. Sign-in opens the CheFu Account authorization flow in the system authentication browser. This is not a requirement to authenticate biometrically every time the app uses a token.

The app initializes Sentry for crash/error reporting and provides an optional feedback flow. The Sentry configuration disables default PII, but event payloads, operational metadata, destinations and retention must be confirmed for the distributed build. The app has no user-facing diagnostics switch. [CONFIRM ACTIVE DIAGNOSTICS, DATA FIELDS, PURPOSES, RETENTION AND REQUIRED CHOICES FOR THE DISTRIBUTED BUILD.]

The standalone preview/legal page supplied with this project adds no analytics, forms, cookies or browser-storage code. Its web host can still receive ordinary request information; [IDENTIFY WEBSITE HOST AND ITS LOGGING/RETENTION PRACTICES].

## 6. Device permissions

The app uses the operating system's camera and photo-selection interfaces so you can choose media to upload. You can decline access or change permissions in your device settings, although the corresponding feature may then be unavailable. Revoking a permission does not delete files already uploaded. The configured app does not request microphone access for recording, but an existing library video can contain sound.

A device permission choice is separate from any legal consent that may be required for processing. Selecting media is also separate from publishing it: upload processing can create temporary files before publication succeeds.

## 7. Storage and security

Profile, content, social, messaging and deletion records are stored by the CheFu backend in its configured Firebase database and storage services; CheFu Account handles OAuth identity and session issuance. Configured backend connections use HTTPS. The API checks authenticated identity, ownership for relevant changes, and conversation participation. Media URLs are short-lived signed links and can be used by anyone holding the link until expiry. These measures do not erase screenshots, all operating-system caches or copies held by recipients.

These are specific implementation measures, not a promise that information can never be accessed improperly or lost. The app has no end-to-end message encryption. [CONFIRM ACTUAL STORAGE/PROCESSING COUNTRIES, OPERATOR ACCESS CONTROLS AND ANY REQUIRED INTERNATIONAL-TRANSFER SAFEGUARDS.] A regional development endpoint does not establish where all authentication data, logs, backups or support access reside.

## 8. Retention and deletion

Ordinary accounts, profiles, posts, messages and social records have no general automatic age or inactivity expiry in the current implementation. They remain until the applicable deletion action or cleanup. [SET AND DISCLOSE THE OPERATOR'S RETENTION PERIODS OR CRITERIA, INCLUDING INACTIVE ACCOUNTS.]

Stories stop appearing in the app 24 hours after publication; automated physical deletion of expired story records/files is not configured. Pending upload sessions become unusable after one hour, but automated removal of every abandoned uploaded file is not configured. Cancellation and account deletion attempt to remove the corresponding files. These periods are not guarantees about copies outside active application storage.

You can delete your own posts and comments. Post deletion removes its uploaded media and associated interactions. [CONFIRM AND IMPLEMENT CLEANUP OF REPLACED PROFILE IMAGES AND ABANDONED UPLOAD METADATA.]

Choosing Delete Account in Settings removes your Nook profile, posts, media, stories, social interactions and entire conversations/messages for both participants, including messages written by the other participant. Cleanup is attempted synchronously; a failure leaves a retryable status. Deleting Nook data does not delete or disable your CheFu Account.

After completion, a deletion-status record keyed by your CheFu account identifier remains. There is no automatic purge schedule for this record. It helps prevent account recreation using still-valid tokens. [CONFIRM AND IMPLEMENT AN APPROPRIATE RETENTION PERIOD FOR THIS IDENTIFIABLE RECORD AND FAILED JOBS.]

The app cleanup does not establish deletion periods for provider logs, backups, authentication-provider records retained independently, device caches or copies kept by others. [SPECIFY VERIFIED PROVIDER/BACKUP RETENTION AND DELETION PROPAGATION.] Uninstalling or signing out is not the same as requesting account deletion.

## 9. Your choices and privacy requests

You can edit profile information, replace a profile image, manage follows, likes and bookmarks, delete your own posts/comments, sign out, change device permissions and request account deletion as described above. The current Privacy, Blocked Accounts and notification settings do not implement additional controls. There is no in-app data-export feature or privacy-request portal.

Depending on applicable law, you may have rights concerning access, correction, deletion, portability, restriction, objection, withdrawal of consent where processing relies on it, or complaints to a regulator. The lack of an app button does not remove a right that applies to you. [CONFIRM APPLICABLE RIGHTS, EXCEPTIONS, RESPONSE PERIODS, COMPLAINT AUTHORITY AND A WORKING REQUEST/IDENTITY-VERIFICATION PROCESS.]

Contact [PRIVACY EMAIL] to make a privacy request or raise a concern. [CONFIRM THAT THIS CHANNEL IS MONITORED AND CAN FULFIL REQUESTS BEFORE PUBLICATION.] Withdrawal of device permission alone does not submit a data-deletion request.

## 10. Intended audience

nook is currently for testing. The intended audience and minimum age are [INTENDED TESTER AUDIENCE AND MINIMUM AGE]. The current app does not verify age or provide a parental-consent flow. [CONFIRM WHETHER CHILDREN MAY USE THE SERVICE, ANY REQUIRED ELIGIBILITY CONTROLS, AND THE PROCEDURE FOR HANDLING CHILDREN'S INFORMATION BEFORE DISTRIBUTION.]

## 11. Changes and contact

[CONFIRM HOW UPDATED NOTICES WILL BE PUBLISHED AND HOW MATERIAL CHANGES WILL BE COMMUNICATED, INCLUDING ANY CONSENT REQUIRED BY LAW.] The current app's privacy links display placeholder alerts, so a functioning notice location must be connected before this policy is published as effective.

Operator: [OPERATOR LEGAL NAME]
Postal address: [POSTAL ADDRESS]
Privacy email: [PRIVACY EMAIL]
Policy location: [PRIVACY POLICY URL]
[DPO OR LOCAL REPRESENTATIVE DETAILS, ONLY IF APPLICABLE]

## Reviewer notes — remove from the published notice

This draft follows the source inventory in PRIVACY-INVESTIGATION.md and the unresolved decisions in PRIVACY-OPEN-QUESTIONS.md. The owner confirmed testing use and requested placeholders. No jurisdiction, legal basis, minimum age, fixed general retention period, complete provider deletion, exclusive regional hosting or operational request process has been assumed.

Before publication, resolve all bracketed fields, verify deployed SDK/network and browser-storage behavior, reconcile native/store privacy disclosures with actual collection, assess retention of identifiable deletion records, complete provider/transfer review, and provide functioning policy links and a monitored request channel. No claim of legal compliance follows from this source audit. A qualified attorney should review the completed policy before publication.
