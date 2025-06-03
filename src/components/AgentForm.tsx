
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Bot, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AgentFormData {
  name: string;
  base_prompt: string;
  knowledge_base: string;
  openai_api_key: string;
  is_active: boolean;
}

interface AgentFormProps {
  onSubmit: (formData: AgentFormData) => Promise<void>;
  loading: boolean;
}

export default function AgentForm({ onSubmit, loading }: AgentFormProps) {
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    base_prompt: '',
    knowledge_base: '',
    openai_api_key: '',
    is_active: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof AgentFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <span>Configurações do Agente</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Agente *</Label>
              <Input
                id="name"
                placeholder="Ex: Atendimento Comercial"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <span className="text-sm text-gray-600">
                  {formData.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_prompt">Prompt Base *</Label>
            <Textarea
              id="base_prompt"
              placeholder="Descreva como o agente deve se comportar, seu tom de voz, personalidade e instruções específicas..."
              value={formData.base_prompt}
              onChange={(e) => handleInputChange('base_prompt', e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="knowledge_base">Base de Conhecimento</Label>
            <Textarea
              id="knowledge_base"
              placeholder="Informações adicionais que o agente deve conhecer sobre sua empresa, produtos, serviços..."
              value={formData.knowledge_base}
              onChange={(e) => handleInputChange('knowledge_base', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openai_api_key">Chave da API OpenAI</Label>
            <Input
              id="openai_api_key"
              type="password"
              placeholder="sk-..."
              value={formData.openai_api_key}
              onChange={(e) => handleInputChange('openai_api_key', e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Opcional. Se não fornecida, será usada a chave padrão do sistema.
            </p>
          </div>

          <div className="flex space-x-4">
            <Button type="submit" disabled={loading} className="flex items-center space-x-2">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{loading ? 'Criando...' : 'Criar Agente'}</span>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/agents">Cancelar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
