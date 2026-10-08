import type { ReactElement, ReactNode } from "react";

export function getExploreGridMetrics(screenWidth: number) {
  const contentWidth = Math.min(screenWidth, 960);
  const scale = Math.min(contentWidth / 390, 1.15);
  const columns = contentWidth < 360 ? 2 : contentWidth >= 720 ? 4 : 3;
  const horizontalPadding = 7 * scale;
  const columnGap = 6 * scale;
  const tileWidth =
    (contentWidth -
      horizontalPadding * 2 -
      columnGap * (columns - 1)) /
    columns;
  return {
    contentWidth,
    columns,
    horizontalPadding,
    columnGap,
    tileWidth,
    tileHeight: tileWidth * 1.25,
  };
}

export type ExplorePerson = {
  id: string;
  name: string;
  topic: string;
  portrait: ReactNode;
  follow: ReactNode;
  onPress: () => void;
};

export type ExploreTile = {
  id: string;
  name: string;
  caption: string;
  media: ReactNode;
  avatar: ReactNode;
  likes: number;
  liked: boolean;
  pending?: boolean;
  onLike: () => void;
  onPress: () => void;
  onAuthor: () => void;
};

export type ExploreLayoutProps = {
  people: ExplorePerson[];
  posts: ExploreTile[];
  query: string;
  onQuery: (value: string) => void;
  topic: string;
  onTopic: (value: string) => void;
  onPeople: () => void;
  onTopics: () => void;
  onCompose: () => void;
  notice?: ReactNode;
  footer?: ReactElement;
  empty?: ReactElement;
  onEndReached?: () => void;
};
