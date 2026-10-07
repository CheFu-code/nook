export type Id<T extends string = string> = string;

export type SocialProfile = {
  _id: string;
  username: string;
  name: string;
  bio?: string;
  website?: string;
  location?: string;
  isOwn?: boolean;
  isFollowing?: boolean;
  hasAvatar?: boolean;
  avatarVersion?: number;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
};

export type SocialAuthor = SocialProfile;

export type SocialPost = {
  _id: string;
  _creationTime: number;
  caption: string;
  author: SocialAuthor;
  isOwn?: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  likesCount: number;
  commentsCount: number;
  kind?: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number;
};

export type SocialComment = {
  _id: string;
  _creationTime: number;
  text: string;
  author: SocialProfile;
  isOwn: boolean;
  isLiked: boolean;
};

export type SocialStory = {
  _id: string;
  _creationTime: number;
  expiresAt: number;
  caption: string;
  author: SocialProfile;
};

export type Conversation = {
  _id: string;
  other: SocialProfile;
  preview: string;
  lastMessageAt: number;
  unread: boolean;
};

export type Message = {
  _id: string;
  text: string;
  sequence: number;
  _creationTime: number;
  outgoing: boolean;
  requestId?: string;
};

export type Page<T> = { items: T[]; hasMore: boolean };
export const siteUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.chefu.co.za').replace(/\/$/, '');
export const palette = { ink: '#0D1529', muted: '#7C879F', blue: '#087EFF', background: '#FCFDFE', border: '#EEF1F5' };

export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Check your connection and try again.';
}

export async function requestJson<T>(
  getToken: () => Promise<string | null>,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Your session has expired. Sign in again.');
  const response = await fetch(`${siteUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-chefu-app': 'nook',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  if (!response.ok) {
    const responseText = await response.text();
    let message = `Request failed (${response.status}).`;
    try {
      const body = JSON.parse(responseText) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(' ');
      else if (body.message) message = body.message;
    } catch {
      if (responseText) message = responseText;
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  const responseText = await response.text();
  if (!responseText.trim()) {
    const endpoint = path.split('?')[0];
    if ((options.method ?? 'GET') === 'GET' &&
        (endpoint === '/nook/profile' || endpoint === '/nook/account/deletion')) {
      return null as T;
    }
    throw new Error('The API returned an empty response. Please try again.');
  }
  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error('The API returned an invalid response. Please try again.');
  }
}
