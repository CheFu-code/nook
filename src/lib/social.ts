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
  isDemo?: boolean;
  hasAvatar?: boolean;
  avatarVersion?: number;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  [key: string]: any;
};

export type SocialAuthor = SocialProfile & {
  isOwn?: boolean;
  isDemo?: boolean;
  isFollowing?: boolean;
  [key: string]: any;
};

export type SocialPost = {
  _id: string;
  _creationTime: number;
  caption: string;
  author: SocialAuthor;
  isOwn?: boolean;
  isLiked?: boolean;
  likesCount?: number;
  commentsCount?: number;
  kind?: string;
  [key: string]: any;
};

export const api: any = {};
export const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL ?? '';
export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error && typeof (error as { data?: unknown }).data === 'string') {
    return (error as { data: string }).data;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong. Check your connection and try again.';
}
export const palette = { ink: '#0D1529', muted: '#7C879F', blue: '#087EFF', background: '#FCFDFE', border: '#EEF1F5' };
