
export interface EvolutionAPIRequest {
  action: string;
  instanceName?: string;
  agentId?: string;
  message?: string;
  to?: string;
  number?: string;
  remoteJid?: string;
}

export interface AuthHeaders {
  apikey: string;
  'Content-Type': string;
}

export interface ChatMetadata {
  id: string;
  remoteJid: string;
  pushName?: string;
  profilePicUrl?: string;
  updatedAt?: string;
  windowStart?: string;
  windowExpires?: string;
  windowActive?: boolean;
}

export interface ProcessedMessage {
  messageId?: string;
  delivery_status: string;
}
