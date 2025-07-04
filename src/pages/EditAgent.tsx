import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Bot, Save, Upload, FileText, Trash2, QrCode, Smartphone, Plus, Brain } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WhatsAppConnection } from '@/components/WhatsAppConnection';
import { useOpenAIAssistant } from '@/hooks/useOpenAIAssistant';
import { Agent } from '@/types/agent';

interface KnowledgeFile {
  id: string;
  filename: string;
  file_type: string;
  created_at: string;
}

interface WhatsAppNumber {
  id: string;
  phone_number: string;
  is_connected: boolean;
  qr_code: string | null;
}

export default function EditAgent() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState<WhatsAppNumber | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    base_prompt: '',
    knowledge_base: '',
    openai_api_key: '',
    is_active: true
  });

  const { createAssistant, loading: assistantLoading } = useOpenAIAssistant();

  useEffect(() => {
    if (id) {
      fetchAgent();
      fetchKnowledgeFiles();
      fetchWhatsAppNumber();
    }
  }, [id, user]);

  const fetchAgent = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Erro ao carregar agente:', error);
        toast.error('Agente não encontrado');
        navigate('/agents');
        return;
      }

      setAgent(data);
      setFormData({
        name: data.name,
        base_prompt: data.base_prompt,
        knowledge_base: data.knowledge_base || '',
        openai_api_key: data.openai_api_key || '',
        is_active: data.is_active
      });
    } catch (error) {
      console.error('Erro ao carregar agente:', error);
      toast.error('Erro ao carregar agente');
    } finally {
      setLoading(false);
    }
  };

  const fetchKnowledgeFiles = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('knowledge_files')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar arquivos:', error);
        return;
      }

      setKnowledgeFiles(data || []);
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error);
    }
  };

  const fetchWhatsAppNumber = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('agent_id', id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar número WhatsApp:', error);
        return;
      }

      setWhatsappNumber(data);
    } catch (error) {
      console.error('Erro ao carregar número WhatsApp:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    if (!formData.name.trim()) {
      toast.error('Nome do agente é obrigatório');
      return;
    }

    if (!formData.base_prompt.trim()) {
      toast.error('Prompt base é obrigatório');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('agents')
        .update({
          name: formData.name,
          base_prompt: formData.base_prompt,
          knowledge_base: formData.knowledge_base || null,
          openai_api_key: formData.openai_api_key || null,
          is_active: formData.is_active
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar agente:', error);
        toast.error('Erro ao atualizar agente');
        return;
      }

      toast.success('Agente atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar agente:', error);
      toast.error('Erro ao atualizar agente');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Arquivo muito grande. Limite de 10MB.');
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;

        const { error } = await supabase
          .from('knowledge_files')
          .insert({
            agent_id: id,
            filename: file.name,
            file_type: file.type,
            file_path: '', // Para upload simples, vamos usar o conteúdo diretamente
            content: content
          });

        if (error) {
          console.error('Erro ao fazer upload:', error);
          toast.error('Erro ao fazer upload do arquivo');
          return;
        }

        toast.success('Arquivo enviado com sucesso!');
        fetchKnowledgeFiles();
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;

    try {
      const { error } = await supabase
        .from('knowledge_files')
        .delete()
        .eq('id', fileId);

      if (error) {
        console.error('Erro ao excluir arquivo:', error);
        toast.error('Erro ao excluir arquivo');
        return;
      }

      toast.success('Arquivo excluído com sucesso!');
      fetchKnowledgeFiles();
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error);
      toast.error('Erro ao excluir arquivo');
    }
  };

  const addWhatsAppNumber = async () => {
    const phoneNumber = prompt('Digite o número do WhatsApp (apenas números):');
    if (!phoneNumber || !id) return;

    // Validar formato do número
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      toast.error('Número inválido');
      return;
    }

    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .insert({
          agent_id: id,
          phone_number: cleanNumber,
          is_connected: false
        });

      if (error) {
        console.error('Erro ao adicionar número:', error);
        toast.error('Erro ao adicionar número WhatsApp');
        return;
      }

      toast.success('Número WhatsApp adicionado com sucesso!');
      fetchWhatsAppNumber();
    } catch (error) {
      console.error('Erro ao adicionar número:', error);
      toast.error('Erro ao adicionar número WhatsApp');
    }
  };

  const generateQRCode = async (numberId: string) => {
    try {
      // Simular geração de QR Code (em produção, isso seria feito via backend)
      const qrCodeData = `https://wa.me/qr/${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({ qr_code: qrCodeData })
        .eq('id', numberId);

      if (error) {
        console.error('Erro ao gerar QR Code:', error);
        toast.error('Erro ao gerar QR Code');
        return;
      }

      toast.success('QR Code gerado! (Simulação)');
      fetchWhatsAppNumber();
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error('Erro ao gerar QR Code');
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateAssistant = async () => {
    if (!id) return;

    try {
      await createAssistant(id);
      // Refresh agent data to get the updated assistant_id
      fetchAgent();
    } catch (error) {
      console.error('Error creating assistant:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Agente não encontrado</p>
        <Button asChild className="mt-4">
          <Link to="/agents">Voltar para Agentes</Link>
        </Button>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Editar Agente</h1>
          <p className="text-gray-600 mt-1">{agent.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="knowledge">Base de Conhecimento</TabsTrigger>
          <TabsTrigger value="assistant">Assistant OpenAI</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
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
                    placeholder="Descreva como o agente deve se comportar..."
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
                    placeholder="Informações adicionais..."
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
                </div>

                <Button type="submit" disabled={saving} className="flex items-center space-x-2">
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>Arquivos de Conhecimento</span>
                </div>
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".txt,.pdf,.doc,.docx"
                    disabled={uploading}
                  />
                  <Button
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                    className="flex items-center space-x-2"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span>{uploading ? 'Enviando...' : 'Upload'}</span>
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {knowledgeFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum arquivo enviado ainda</p>
                  <p className="text-sm">Envie documentos para enriquecer a base de conhecimento</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {knowledgeFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{file.filename}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(file.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFile(file.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assistant">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <span>Assistant OpenAI</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {agent.assistant_id ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-green-700">Assistant Criado</span>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      <strong>Assistant ID:</strong> {agent.assistant_id}
                    </p>
                    <p className="text-sm text-green-600 mt-2">
                      Seu Assistant OpenAI foi criado com sucesso e está pronto para uso!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                    <span className="text-sm font-medium text-gray-700">Assistant Não Criado</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Criar Assistant OpenAI</h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Crie um Assistant na OpenAI baseado nas configurações deste agente. 
                      Isso permitirá que o agente use a API de Assistants da OpenAI para conversas mais avançadas.
                    </p>
                    <ul className="text-sm text-blue-600 mb-4 space-y-1">
                      <li>• Nome: {agent.name.replace(/\s+/g, '_')}_{user?.email}</li>
                      <li>• Modelo: gpt-4o-mini</li>
                      <li>• Ferramentas: file_search</li>
                    </ul>
                    <Button 
                      onClick={handleCreateAssistant}
                      disabled={assistantLoading}
                      className="flex items-center space-x-2"
                    >
                      {assistantLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Brain className="h-4 w-4" />
                      )}
                      <span>{assistantLoading ? 'Criando...' : 'Criar Assistant'}</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppConnection 
            agent={agent}
            whatsappNumber={whatsappNumber}
            onConnectionUpdate={fetchWhatsAppNumber}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
