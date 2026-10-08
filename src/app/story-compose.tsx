import { Composer } from '@/components/social/composer';
import { ProfileGate } from '@/context/social-context';

export default function StoryComposer() {
  return (
    <ProfileGate>
      <Composer story />
    </ProfileGate>
  );
}
