
import { useEffect } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';

interface RealtimeNotificationsProps {
  onNewMessage?: () => void;
}

export const RealtimeNotifications = ({ onNewMessage }: RealtimeNotificationsProps) => {
  const { 
    newMessagesCount, 
    lastMessageReceived, 
    clearNotifications 
  } = useRealtimeConversations();

  useEffect(() => {
    if (lastMessageReceived && onNewMessage) {
      onNewMessage();
    }
  }, [lastMessageReceived, onNewMessage]);

  if (newMessagesCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Alert className="border-blue-200 bg-blue-50">
        <MessageSquare className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-blue-800">
              {newMessagesCount} nova{newMessagesCount > 1 ? 's' : ''} mensagem{newMessagesCount > 1 ? 's' : ''}
            </span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {newMessagesCount}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearNotifications}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
