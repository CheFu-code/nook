import { Alert, Pressable, Share, View } from 'react-native';
import { errorMessage, type SocialPost } from '@/lib/social';
import { useNookQuery } from '@/hooks/use-nook-api';
import { usePostBookmarkMutation } from '@/hooks/use-social-mutations';
import { useAppTheme } from '@/lib/theme';
import { FeedIcon } from '../feed-icon';

export function DetailActions({ post, scale }: { post: SocialPost; scale: number }) {
  const theme = useAppTheme();
  const saved = useNookQuery<boolean>(`/nook/posts/${encodeURIComponent(post._id)}/bookmark`);
  const bookmarkMutation = usePostBookmarkMutation(post);
  const bookmarked = post.isBookmarked ?? saved.data ?? false;
  return <><Pressable accessibilityRole="button" accessibilityLabel="Share post" onPress={() => void Share.share({ message: `${post.author.username}: ${post.caption}\nnook://post/${post._id}` }).catch(e => Alert.alert('Could not share', errorMessage(e)))} style={{ padding: 7 * scale }}><FeedIcon name="send" size={23 * scale} color={theme.ink} /></Pressable><View style={{ flex: 1 }} /><Pressable accessibilityRole="button" accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark post'} accessibilityState={{ selected: bookmarked, disabled: bookmarkMutation.isPending || saved.data === undefined && post.isBookmarked === undefined }} disabled={bookmarkMutation.isPending || saved.data === undefined && post.isBookmarked === undefined} onPress={() => void bookmarkMutation.mutateAsync(!bookmarked).catch(e => Alert.alert('Could not save bookmark', errorMessage(e)))} style={{ padding: 7 * scale }}><FeedIcon name="bookmark" size={23 * scale} filled={bookmarked} color={bookmarked ? theme.blue : theme.ink} /></Pressable></>;
}
