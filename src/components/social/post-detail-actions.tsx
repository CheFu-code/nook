import { useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';
import { errorMessage, type SocialPost } from '@/lib/social';
import { useNookApi, useNookQuery } from '@/hooks/use-nook-api';
import { FeedIcon } from '../feed-icon';

export function DetailActions({ post, scale }: { post: SocialPost; scale: number }) {
  const saved = useNookQuery<boolean>(`/nook/posts/${encodeURIComponent(post._id)}/bookmark`);
  const request = useNookApi(); const [selected, setSelected] = useState<boolean | null>(null); const [busy, setBusy] = useState(false);
  const bookmarked = selected ?? saved.data ?? false;
  return <><Pressable accessibilityRole="button" accessibilityLabel="Share post" onPress={() => void Share.share({ message: `${post.author.username}: ${post.caption}\nnook://post/${post._id}` }).catch(e => Alert.alert('Could not share', errorMessage(e)))} style={{ padding: 7 * scale }}><FeedIcon name="send" size={23 * scale} color="#0C1239" /></Pressable><View style={{ flex: 1 }} /><Pressable accessibilityRole="button" accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark post'} accessibilityState={{ selected: bookmarked, disabled: busy || saved.data === undefined }} disabled={busy || saved.data === undefined} onPress={async () => { const next = !bookmarked; setBusy(true); try { await request(`/nook/posts/${encodeURIComponent(post._id)}/bookmark`, { method: 'POST', body: { saved: next } }); setSelected(next); } catch (e) { Alert.alert('Could not save bookmark', errorMessage(e)); } finally { setBusy(false); } }} style={{ padding: 7 * scale }}><FeedIcon name="bookmark" size={23 * scale} filled={bookmarked} color={bookmarked ? '#087EFF' : '#0C1239'} /></Pressable></>;
}
