import type { ExploreLayoutProps } from "./explore-layout.types";
import { useExploreLayout } from "@/hooks/use-explore-layout";
import { ExploreLayoutUi } from "./explore-layout-ui";

export type { ExplorePerson, ExploreTile } from "./explore-layout.types";

export function ExploreLayout(props: ExploreLayoutProps) {
  const interactions = useExploreLayout(props);
  return <ExploreLayoutUi {...props} {...interactions} />;
}
