import { type InfiniteData, type QueryClient, type QueryKey } from "@tanstack/react-query";
import type { Message, Page } from "./social";
import {
  deleteChatHistorySnapshot,
  readChatHistorySnapshot,
  writeChatHistorySnapshot,
} from "./chat-history-store";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CONVERSATIONS = 10;
const MAX_PAGES_PER_CONVERSATION = 3;
const MAX_MESSAGES_PER_PAGE = 20;
const MESSAGE_PATH = /^\/nook\/conversations\/([^/]+)\/messages$/;

type PersistedMessageQuery = {
  queryKey: QueryKey;
  data: InfiniteData<Page<Message>, number>;
  dataUpdatedAt: number;
};
type PersistedSnapshot = {
  version: 1;
  savedAt: number;
  queries: PersistedMessageQuery[];
};

const persistenceDisabledUsers = new Set<string>();

function isMessage(value: unknown): value is Message {
  return (
    typeof value === "object" &&
    value !== null &&
    "_id" in value &&
    typeof value._id === "string" &&
    "text" in value &&
    typeof value.text === "string" &&
    "_creationTime" in value &&
    typeof value._creationTime === "number" &&
    "sequence" in value &&
    typeof value.sequence === "number" &&
    "outgoing" in value &&
    typeof value.outgoing === "boolean"
  );
}

function sanitizeMessage(value: unknown): Message | null {
  if (!isMessage(value)) return null;
  const message: Message = {
    _id: value._id,
    text: value.text,
    sequence: value.sequence,
    _creationTime: value._creationTime,
    outgoing: value.outgoing,
  };
  if (typeof value.delivered === "boolean") message.delivered = value.delivered;
  if (typeof value.requestId === "string") message.requestId = value.requestId;
  if (typeof value.edited === "boolean") message.edited = value.edited;
  if (typeof value.canDeleteForEveryone === "boolean") {
    message.canDeleteForEveryone = value.canDeleteForEveryone;
  }
  if (typeof value.deletedForMe === "boolean") message.deletedForMe = value.deletedForMe;
  if (typeof value.deletedForEveryone === "boolean") {
    message.deletedForEveryone = value.deletedForEveryone;
  }
  if (
    value.replyTo &&
    typeof value.replyTo.id === "string" &&
    typeof value.replyTo.text === "string" &&
    typeof value.replyTo.outgoing === "boolean"
  ) {
    message.replyTo = {
      id: value.replyTo.id,
      text: value.replyTo.text,
      outgoing: value.replyTo.outgoing,
    };
  }
  if (
    Array.isArray(value.reactions) &&
    value.reactions.every(
      (reaction) =>
        typeof reaction.emoji === "string" &&
        typeof reaction.count === "number" &&
        typeof reaction.reacted === "boolean",
    )
  ) {
    message.reactions = value.reactions.map(({ emoji, count, reacted }) => ({
      emoji,
      count,
      reacted,
    }));
  }
  return message;
}

function limitMessageData(value: unknown): InfiniteData<Page<Message>, number> | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("pages" in value) ||
    !Array.isArray(value.pages) ||
    !("pageParams" in value) ||
    !Array.isArray(value.pageParams)
  ) {
    return null;
  }

  const pages: Page<Message>[] = [];
  for (const page of value.pages.slice(0, MAX_PAGES_PER_CONVERSATION)) {
    if (
      typeof page !== "object" ||
      page === null ||
      !("items" in page) ||
      !Array.isArray(page.items) ||
      !("hasMore" in page) ||
      typeof page.hasMore !== "boolean" ||
      !page.items.slice(0, MAX_MESSAGES_PER_PAGE).every(isMessage)
    ) {
      return null;
    }
    pages.push({
      items: page.items
        .slice(0, MAX_MESSAGES_PER_PAGE)
        .map((item: unknown) => sanitizeMessage(item))
        .filter(
          (message: Message | null): message is Message => message !== null,
        ),
      hasMore: page.hasMore,
    });
  }
  if (!pages.length) return null;
  const pageParams = value.pageParams.slice(0, pages.length);
  if (!pageParams.every((pageParam) => typeof pageParam === "number")) {
    return null;
  }

  return {
    pages,
    pageParams,
  };
}

function getConversationId(queryKey: QueryKey, userId: string) {
  if (
    queryKey.length !== 4 ||
    queryKey[0] !== "nook" ||
    queryKey[1] !== userId ||
    queryKey[2] !== "api" ||
    typeof queryKey[3] !== "string"
  ) {
    return null;
  }
  return MESSAGE_PATH.exec(queryKey[3])?.[1] ?? null;
}

export async function restoreChatHistoryCache(
  queryClient: QueryClient,
  userId: string,
) {
  persistenceDisabledUsers.delete(userId);
  const stored = await readChatHistorySnapshot(userId);
  if (!stored) return;

  if (
    !Number.isFinite(stored.savedAt) ||
    stored.savedAt <= 0 ||
    Date.now() - stored.savedAt > CACHE_TTL_MS
  ) {
    await deleteChatHistorySnapshot(userId);
    return;
  }

  let snapshot: unknown;
  try {
    snapshot = JSON.parse(stored.payload);
  } catch {
    await deleteChatHistorySnapshot(userId);
    return;
  }
  if (
    typeof snapshot !== "object" ||
    snapshot === null ||
    !("version" in snapshot) ||
    snapshot.version !== 1 ||
    !("queries" in snapshot) ||
    !Array.isArray(snapshot.queries)
  ) {
    await deleteChatHistorySnapshot(userId);
    return;
  }

  let restoredCount = 0;
  for (const item of snapshot.queries) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("queryKey" in item) ||
      !Array.isArray(item.queryKey) ||
      getConversationId(item.queryKey, userId) === null ||
      !("data" in item) ||
      !("dataUpdatedAt" in item) ||
      typeof item.dataUpdatedAt !== "number" ||
      !Number.isFinite(item.dataUpdatedAt) ||
      item.dataUpdatedAt <= 0 ||
      Date.now() - item.dataUpdatedAt > CACHE_TTL_MS
    ) {
      continue;
    }
    const data = limitMessageData(item.data);
    if (data) {
      queryClient.setQueryData(item.queryKey, data, { updatedAt: 0 });
      restoredCount += 1;
    }
  }
  if (!restoredCount) await deleteChatHistorySnapshot(userId);
}

function createSnapshot(queryClient: QueryClient, userId: string): PersistedSnapshot {
  const queries = queryClient
    .getQueryCache()
    .getAll()
    .filter((query) =>
      getConversationId(query.queryKey, userId) !== null &&
      query.state.status === "success" &&
      !query.state.isInvalidated,
    )
    .sort((left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt)
    .slice(0, MAX_CONVERSATIONS)
    .flatMap((query) => {
      const data = limitMessageData(query.state.data);
      return data
        ? [{
            queryKey: query.queryKey,
            data,
            dataUpdatedAt: query.state.dataUpdatedAt,
          }]
        : [];
    });

  return { version: 1, savedAt: Date.now(), queries };
}

export function startChatHistoryPersistence(
  queryClient: QueryClient,
  userId: string,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writeInFlight = Promise.resolve();
  const persist = () => {
    if (persistenceDisabledUsers.has(userId)) return;
    const snapshot = createSnapshot(queryClient, userId);
    const payload = JSON.stringify(snapshot);
    const savedAt = snapshot.savedAt;
    writeInFlight = writeInFlight
      .then(async () => {
        if (!persistenceDisabledUsers.has(userId)) {
          await writeChatHistorySnapshot(userId, payload, savedAt);
        }
      })
      .catch((error: unknown) => {
        console.error("Unable to persist encrypted chat history cache.", error);
      });
  };
  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(persist, 300);
  });

  return () => {
    unsubscribe();
    if (timer) clearTimeout(timer);
  };
}

export async function clearPersistedChatHistory(userId: string | undefined) {
  if (!userId) return;
  persistenceDisabledUsers.add(userId);
  await deleteChatHistorySnapshot(userId);
}
