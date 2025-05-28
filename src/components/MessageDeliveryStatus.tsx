
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

interface MessageDeliveryStatusProps {
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  isFromContact?: boolean;
}

export const MessageDeliveryStatus = ({ 
  status = 'sent', 
  timestamp, 
  isFromContact = false 
}: MessageDeliveryStatusProps) => {
  const getStatusIcon = () => {
    if (isFromContact) return null;

    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400 animate-pulse" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-500" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Check className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (isFromContact) return 'text-gray-500';

    switch (status) {
      case 'sending':
        return 'text-gray-400';
      case 'sent':
        return 'text-gray-400';
      case 'delivered':
        return 'text-gray-500';
      case 'read':
        return 'text-blue-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Enviando...';
      case 'sent':
        return 'Enviado';
      case 'delivered':
        return 'Entregue';
      case 'read':
        return 'Lido';
      case 'failed':
        return 'Falhou';
      default:
        return 'Enviado';
    }
  };

  return (
    <div className={`flex items-center space-x-1 text-xs ${getStatusColor()}`}>
      {getStatusIcon()}
      <span>
        {new Date(timestamp).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </span>
      {!isFromContact && (
        <span className="text-xs opacity-75">
          • {getStatusText()}
        </span>
      )}
    </div>
  );
};
