import { useEffect, useRef } from "react";
import { FlatList, TextInput } from "react-native";
import type { ExploreLayoutProps, ExploreTile } from "@/components/explore-layout.types";

export function useExploreLayout({
  query,
  topic,
  onTopic,
}: Pick<ExploreLayoutProps, "query" | "topic" | "onTopic">) {
  const searchRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<ExploreTile>>(null);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [topic, query]);

  function onSearchPress() {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    searchRef.current?.focus();
  }

  function onChooseTopic(value: string) {
    onTopic(value);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  return { searchRef, listRef, onSearchPress, onChooseTopic };
}
