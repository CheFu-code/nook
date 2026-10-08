import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { ExploreLayout, type ExploreTile } from '../explore-layout';
import { FeedIcon } from '../feed-icon';
import { topics } from '@/lib/explore-data';
import { errorMessage, type SocialPost, type SocialProfile } from '@/lib/social';
import { useNookCursorPaginatedQuery } from '@/hooks/use-nook-api';
import { usePostLikeMutation } from '@/hooks/use-social-mutations';
import { Avatar, PostMedia, TextPostPreview } from './media';
import { FollowButton } from './post-card';
import { ConnectionStatus, LoadMore, ui } from './ui';
import { useAppTheme } from '@/lib/theme';

const topicWords: Record<string, RegExp> = {
  Travel: /travel|trip|beach|city|coast|horizon|outdoor|mountain|lake|san diego|santorini/i,
  Nature: /nature|lake|mountain|outdoor|coast|peak|hike|palm|sunset/i,
  Pets: /pet|dog|cat|puppy/i, Food: /food|coffee|cafe|latte|flat white|bakery|meal/i,
  Design: /design|architecture|city|skyline/i, Lifestyle: /lifestyle|coffee|weekend|morning|day/i,
};
export function LiveExplore() {
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions(); const s = width / 390; const v = height / 874; const router = useRouter();
  const [text, setText] = useState(''); const [search, setSearch] = useState(''); const [topic, setTopic] = useState('All');
  const [sheet, setSheet] = useState<'people' | 'topics' | null>(null);
  useEffect(() => { const timer = setTimeout(() => setSearch(text.trim()), 250); return () => clearTimeout(timer); }, [text]);
  const people = useNookCursorPaginatedQuery<SocialProfile>(
    `/nook/profiles?cursorMode=true&q=${encodeURIComponent(search)}`,
  );
  const posts = useNookCursorPaginatedQuery<SocialPost>(
    `/nook/posts?feed=explore&cursorMode=true&q=${encodeURIComponent(search)}`,
  );
  const likeMutation = usePostLikeMutation();
  const member = (id: string) => router.push({ pathname: '/member/[id]', params: { id } });
  const filtered = posts.results.filter(post =>
    topic === 'All' || topicWords[topic]?.test(post.caption),
  );
  const tiles: ExploreTile[] = filtered.map((post, index) => {
    const liked = post.isLiked ?? false;
    const open = () => router.push({ pathname: '/post/[id]', params: { id: post._id } });
    return { id: post._id, name: post.author.username, caption: post.caption.replace(/#[\p{L}\p{N}_]+/gu, '').trim(),
      media: <View pointerEvents="none">{post.kind === 'text'
        ? <TextPostPreview caption={post.caption.replace(/#[\p{L}\p{N}_]+/gu, '').trim() || post.caption} thumbnail aspectRatio={((width - 26 * s) / 3) / ((index < 3 ? 155 : 149) * v)} />
        : <PostMedia post={post} thumbnail aspectRatio={((width - 26 * s) / 3) / ((index < 3 ? 155 : 149) * v)} />}</View>,
      avatar: <Avatar profile={post.author} size={22 * s} />, likes: post.likesCount, liked, pending: likeMutation.isPending && likeMutation.variables?.postId === post._id,
      onLike: () => void likeMutation.mutateAsync({ postId: post._id, liked: !liked }).catch(error => Alert.alert('Could not update like', errorMessage(error))), onPress: open, onAuthor: () => member(post.author._id) };
  });
  return <>
    <ExploreLayout query={text} onQuery={setText} topic={topic} onTopic={setTopic} onPeople={() => setSheet('people')} onTopics={() => setSheet('topics')} onCompose={() => router.push('/compose')} notice={<ConnectionStatus />}
      people={people.results.filter(p => !p.isOwn).map((profile, index) => ({ id: profile._id, name: profile.username, topic: profile.location || profile.bio || '',
        portrait: <LinearGradient colors={index % 3 === 1 ? ['#C660FF', '#FFC979'] : ['#1687FF', '#BDD8FF']} style={{ padding: 1.2 * s, borderRadius: 30 * s }}><View style={{ padding: 1.2 * s, backgroundColor: theme.background, borderRadius: 30 * s }}><Avatar profile={profile} size={52.2 * s} /></View></LinearGradient>,
        follow: <FollowButton profile={profile} compactScale={s} />, onPress: () => member(profile._id) }))}
      posts={tiles} footer={<LoadMore status={posts.status} loadMore={posts.loadMore} />} empty={posts.status === 'LoadingFirstPage' ? <View /> : <Text style={[ui.muted, { padding: 28, textAlign: 'center', color: theme.muted }]}>{search || topic !== 'All' ? 'No matching posts found.' : 'No posts yet. Share the first moment.'}</Text>}
      onEndReached={() => { if (posts.status === 'CanLoadMore') posts.loadMore(21); }} />
    <Modal visible={sheet !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSheet(null)}><View style={[ui.screen, { backgroundColor: theme.background }]}><View style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={[ui.title, { color: theme.ink }]}>{sheet === 'people' ? 'Suggested for you' : 'Explore topics'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSheet(null)} hitSlop={12}><FeedIcon name="close" color={theme.ink} /></Pressable></View><ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
      {sheet === 'topics' ? topics.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: topic === value }} onPress={() => { setTopic(value); setSheet(null); }} style={{ padding: 16, borderRadius: 16, backgroundColor: topic === value ? theme.blueSoft : theme.subtle }}><Text style={{ color: topic === value ? theme.blue : theme.ink, fontSize: 17 }}>{value}</Text></Pressable>) : <>{people.results.filter(p => !p.isOwn).map(profile => <View key={profile._id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Pressable onPress={() => { setSheet(null); member(profile._id); }}><Avatar profile={profile} size={48} /></Pressable><Pressable style={{ flex: 1 }} onPress={() => { setSheet(null); member(profile._id); }}><Text style={{ ...ui.text, color: theme.ink, fontWeight: '600' }}>{profile.username}</Text><Text style={[ui.muted, { color: theme.muted }]}>{profile.name}</Text></Pressable><FollowButton profile={profile} /></View>)}<LoadMore status={people.status} loadMore={people.loadMore} /></>}
    </ScrollView></View></Modal>
  </>;
}
