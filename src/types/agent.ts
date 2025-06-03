
export interface Agent {
  id: string;
  name: string;
  base_prompt: string;
  is_active: boolean;
  knowledge_base: string | null;
  openai_api_key: string | null;
  assistant_id: string | null;
  created_at: string;
  whatsapp_numbers?: {
    id: string;
    phone_number: string;
    is_connected: boolean;
    instance_name?: string;
    evolution_status?: string;
  };
  knowledge_files?: Array<{
    id: string;
    filename: string;
  }>;
}
