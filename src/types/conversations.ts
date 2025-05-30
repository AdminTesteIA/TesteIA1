
export interface WhatsAppNumber {
  id: string;
  phone_number: string;
  is_connected: boolean;
  agent: {
    id: string;
    name: string;
  };
}

export interface Conversation {
  id: string;
  contact_name: string | null;
  contact_number: string; // Agora armazena o remoteJid completo
  contact_id: string | null; // ID do contato (sem @s.whatsapp.net)
  last_message_at: string;
  whatsapp_number: {
    id: string;
    phone_number: string;
    is_connected: boolean;
    agent: {
      id: string;
      name: string;
    };
  };
  metadata?: {
    id?: string;
    remoteJid?: string;
    pushName?: string;
    profilePicUrl?: string;
    updatedAt?: string;
    windowStart?: string;
    windowExpires?: string;
    windowActive?: boolean;
    [key: string]: any;
  };
  _count?: {
    messages: number;
  };
}

export interface MessageMetadata {
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  [key: string]: any;
}

export interface Message {
  id: string;
  content: string;
  is_from_contact: boolean;
  created_at: string;
  message_type: string;
  conversation_id: string;
  metadata?: MessageMetadata;
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}
