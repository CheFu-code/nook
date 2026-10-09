// Web keeps chat history in TanStack Query memory and does not persist message text.
export type StoredChatHistorySnapshot = {
  payload: string;
  savedAt: number;
};

export async function readChatHistorySnapshot(
  _userId: string,
): Promise<StoredChatHistorySnapshot | null> {
  return null;
}

export async function writeChatHistorySnapshot(
  _userId: string,
  _payload: string,
  _savedAt: number,
) {
  return Promise.resolve();
}

export async function deleteChatHistorySnapshot(_userId: string) {
  return Promise.resolve();
}
