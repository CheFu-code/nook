import type { ReactElement, ReactNode } from "react";

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
