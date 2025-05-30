
import { useAuth } from '@/hooks/useAuth';
import { ConversationsContainer } from '@/components/ConversationsContainer';

export default function Conversations() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <ConversationsContainer userId={user.id} />;
}
