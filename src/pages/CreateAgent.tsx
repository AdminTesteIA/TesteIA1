
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Bot, Save } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function CreateAgent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    base_prompt: '',
    knowledge_base: '',
    openai_api_key: '',
    is_active: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name.trim()) {
      toast.error('Nome do agente é obrigatório');
      return;
    }

    if (!formData.base_prompt.trim()) {
      toast.error('Prompt base é obrigatório');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: formData.name,
          base_prompt: formData.base_prompt,
          knowledge_base: formData.knowledge_base || null,
          openai_api_key: formData.openai_api_key || null,
          is_active: formData.is_active,
          assistant_id: '',
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar agente:', error);
        toast.error('Erro ao criar agente');
        return;
      }

      toast.success('Agente criado com sucesso!');
      navigate('/agents');
    } catch (error) {
      console.error('Erro ao criar agente:', error);
      toast.error('Erro ao criar agente');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/agents" className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Criar Novo Agente</h1>
          <p className="text-gray-600 mt-1">Configure seu agente de IA para WhatsApp</p>
        </div>
      </div>

      {/* Form */}
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
                Opcional. Se não fornecida, será usado uma chave padrão do sistema.
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
    </div>
  );
}
