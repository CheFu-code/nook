import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { ExploreLayout, type ExploreTile } from '../explore-layout';
import { FeedIcon } from '../feed-icon';
import { topics } from '@/lib/explore-data';
import { errorMessage, type SocialPost, type SocialProfile } from '@/lib/social';
import { useNookApi, useNookPaginatedQuery } from '@/hooks/use-nook-api';
import { Avatar, PostMedia } from './media';
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
  const [busyLikes, setBusyLikes] = useState<Record<string, boolean>>({});
  const [likedOverrides, setLikedOverrides] = useState<Record<string, boolean>>({});
  useEffect(() => { const timer = setTimeout(() => setSearch(text.trim()), 250); return () => clearTimeout(timer); }, [text]);
  const people = useNookPaginatedQuery<SocialProfile>(`/nook/profiles?q=${encodeURIComponent(search)}`);
  const posts = useNookPaginatedQuery<SocialPost>('/nook/posts?feed=explore');
  const request = useNookApi();
  const member = (id: string) => router.push({ pathname: '/member/[id]', params: { id } });
  async function like(post: SocialPost) {
    if (busyLikes[post._id]) return;
    const liked = !(likedOverrides[post._id] ?? post.isLiked); setBusyLikes(current => ({ ...current, [post._id]: true }));
    try { await request(`/nook/posts/${encodeURIComponent(post._id)}/like`, { method: 'POST', body: { liked } }); setLikedOverrides(current => ({ ...current, [post._id]: liked })); }
    catch (error) { Alert.alert('Could not update like', errorMessage(error)); }
    finally { setBusyLikes(current => { const next = { ...current }; delete next[post._id]; return next; }); }
  }
  const needle = search.toLowerCase().replace(/^#/, '');
  const filtered = posts.results.filter(post => {
    const content = `${post.author.username} ${post.author.name} ${post.caption}`;
    return content.toLowerCase().includes(needle) && (topic === 'All' || topicWords[topic]?.test(post.caption));
  });
  const tiles: ExploreTile[] = filtered.map((post, index) => {
    const liked = likedOverrides[post._id] ?? post.isLiked;
    const open = () => router.push({ pathname: '/post/[id]', params: { id: post._id } });
    return { id: post._id, name: post.author.username, caption: post.caption.replace(/#[\p{L}\p{N}_]+/gu, '').trim(),
      media: <View pointerEvents="none"><PostMedia post={post} thumbnail aspectRatio={((width - 26 * s) / 3) / ((index < 3 ? 155 : 149) * v)} /></View>,
      avatar: <Avatar profile={post.author} size={22 * s} />, likes: Math.max(0, post.likesCount + (liked === post.isLiked ? 0 : liked ? 1 : -1)), liked, pending: !!busyLikes[post._id],
      onLike: () => void like(post), onPress: open, onAuthor: () => member(post.author._id) };
  });
  return <>
    <ExploreLayout query={text} onQuery={setText} topic={topic} onTopic={setTopic} onPeople={() => setSheet('people')} onTopics={() => setSheet('topics')} onCompose={() => router.push('/compose')} notice={<ConnectionStatus />}
      people={people.results.filter(p => !p.isOwn).map((profile, index) => ({ id: profile._id, name: profile.username, topic: profile.location || profile.bio || '',
        portrait: <LinearGradient colors={index % 3 === 1 ? ['#C660FF', '#FFC979'] : ['#1687FF', '#BDD8FF']} style={{ padding: 1.2 * s, borderRadius: 30 * s }}><View style={{ padding: 1.2 * s, backgroundColor: theme.background, borderRadius: 30 * s }}><Avatar profile={profile} size={52.2 * s} /></View></LinearGradient>,
        follow: <FollowButton profile={profile} compactScale={s} />, onPress: () => member(profile._id) }))}
      posts={tiles} footer={<LoadMore status={posts.status} loadMore={posts.loadMore} />} empty={posts.status === 'LoadingFirstPage' ? <View /> : <Text style={[ui.muted, { padding: 28, textAlign: 'center', color: theme.muted }]}>{search || topic !== 'All' ? 'No matching posts loaded. Try another search or topic, or load more.' : 'No posts yet. Share the first moment.'}</Text>}
      onEndReached={() => { if (!search && topic === 'All' && posts.status === 'CanLoadMore') posts.loadMore(21); }} />
    <Modal visible={sheet !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSheet(null)}><View style={[ui.screen, { backgroundColor: theme.background }]}><View style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={[ui.title, { color: theme.ink }]}>{sheet === 'people' ? 'Suggested for you' : 'Explore topics'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSheet(null)} hitSlop={12}><FeedIcon name="close" color={theme.ink} /></Pressable></View><ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
      {sheet === 'topics' ? topics.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: topic === value }} onPress={() => { setTopic(value); setSheet(null); }} style={{ padding: 16, borderRadius: 16, backgroundColor: topic === value ? theme.blueSoft : theme.subtle }}><Text style={{ color: topic === value ? theme.blue : theme.ink, fontSize: 17 }}>{value}</Text></Pressable>) : <>{people.results.filter(p => !p.isOwn).map(profile => <View key={profile._id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Pressable onPress={() => { setSheet(null); member(profile._id); }}><Avatar profile={profile} size={48} /></Pressable><Pressable style={{ flex: 1 }} onPress={() => { setSheet(null); member(profile._id); }}><Text style={{ ...ui.text, color: theme.ink, fontWeight: '600' }}>{profile.username}</Text><Text style={[ui.muted, { color: theme.muted }]}>{profile.name}</Text></Pressable><FollowButton profile={profile} /></View>)}<LoadMore status={people.status} loadMore={people.loadMore} /></>}
    </ScrollView></View></Modal>
  </>;
}
