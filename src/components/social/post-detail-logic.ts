import type { SocialComment } from "@/lib/social";

export type Comment = SocialComment;
export type NestedComment = Comment & {
  depth: number;
  parentUsername?: string;
};
export type DialogAction = {
  label: string;
  tone?: "default" | "destructive";
  onPress?: () => void;
};
export type Dialog = {
  title: string;
  message?: string;
  actions: DialogAction[];
};

export function nestComments(
  items: Comment[],
  order: "asc" | "desc",
): NestedComment[] {
  const byId = new Map(items.map((item) => [item._id, item]));
  const children = new Map<string, Comment[]>();
  const roots: Comment[] = [];
  for (const item of items) {
    if (item.parentId && byId.has(item.parentId) && item.parentId !== item._id) {
      const siblings = children.get(item.parentId) ?? [];
      siblings.push(item);
      children.set(item.parentId, siblings);
    } else {
      roots.push(item);
    }
  }
  const sort = (a: Comment, b: Comment) =>
    (a._creationTime - b._creationTime) * (order === "asc" ? 1 : -1);
  roots.sort(sort);
  for (const replies of children.values()) replies.sort(sort);
  const nested: NestedComment[] = [];
  const visited = new Set<string>();
  function append(item: Comment, depth: number) {
    if (visited.has(item._id)) return;
    visited.add(item._id);
    nested.push({
      ...item,
      depth,
      parentUsername: item.parentId
        ? byId.get(item.parentId)?.author.username
        : undefined,
    });
    for (const reply of children.get(item._id) ?? []) append(reply, depth + 1);
  }
  roots.forEach((item) => append(item, 0));
  for (const item of items) append(item, 0);
  return nested;
}

export function relativeTime(timestamp: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
