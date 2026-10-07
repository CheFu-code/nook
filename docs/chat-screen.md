# Messaging

The live inbox, conversation start, history, read position and message send use authenticated CheFu API endpoints under `/nook/conversations` and `/nook/messages`. Conversation access is restricted to its participant identities; the client cannot choose the sender identity. Message sends include an idempotent request ID and expose a retry state if the request fails.

Open chat history is refreshed periodically because this implementation uses REST rather than a realtime connection. Inbox data reloads when the screen regains focus. Messages are text-only and are not end-to-end encrypted.

The five reference conversations are local demos. Their messages and photo attachments remain in app memory, do not contact other members and are reset with the signed-in app session. Demo identities cannot receive real messages.

Groups, calls, live attachments, presence, recipient read receipts, editing/deleting individual messages and push notifications are not implemented.
