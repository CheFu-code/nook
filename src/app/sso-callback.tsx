import { useAuth } from '@/lib/chefu-auth';
import { Redirect } from 'expo-router';

export default function SSOCallback() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return <Redirect href={isSignedIn ? '/home' : '/'} />;
}
