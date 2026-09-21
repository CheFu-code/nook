import { useUser } from '@/lib/chefu-auth';
import { usePathname, useRouter } from 'expo-router';
import { HomeFeed } from '@/components/home-feed';

export function HomeTab() {
  const { user } = useUser();
  const router = useRouter();
  const isPreview = usePathname().startsWith('/design-preview');
  return <HomeFeed userName={isPreview ? undefined : user?.displayName ?? user?.name ?? user?.email ?? undefined} onExplore={() => router.navigate(isPreview ? '/design-preview/explore' : '/explore')} />;
}
