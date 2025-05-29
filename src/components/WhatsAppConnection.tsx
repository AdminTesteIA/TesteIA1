import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QrCode, Smartphone, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useEvolutionAPI } from '@/hooks/useEvolutionAPI';
import { toast } from 'sonner';

interface WhatsAppConnectionProps {
  agent: {
    id: string;
    name: string;
    openai_api_key?: string;
  };
  whatsappNumber?: {
    id: string;
    phone_number: string;
    is_connected: boolean;
    qr_code?: string;
  } | null;
  onConnectionUpdate?: () => void;
}

export const WhatsAppConnection = ({ 
  agent, 
  whatsappNumber, 
  onConnectionUpdate 
}: WhatsAppConnectionProps) => {
  const [instanceName, setInstanceName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [qrCode, setQrCode] = useState(whatsappNumber?.qr_code || '');
  const [isConnected, setIsConnected] = useState(whatsappNumber?.is_connected || false);
  const [showQR, setShowQR] = useState(false);
  
  const { 
    loading, 
    createInstance, 
    getQRCode, 
    getInstanceStatus 
  } = useEvolutionAPI();

  useEffect(() => {
    if (whatsappNumber) {
      setInstanceName(whatsappNumber.phone_number);
      setPhoneNumber(whatsappNumber.phone_number);
      setQrCode(whatsappNumber.qr_code || '');
      setIsConnected(whatsappNumber.is_connected);
    }
  }, [whatsappNumber]);

  const handleCreateInstance = async () => {
    if (!instanceName.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }

    if (!phoneNumber.trim()) {
      toast.error('Digite o número do WhatsApp');
      return;
    }

    if (!agent.openai_api_key) {
      toast.error('Configure a chave da OpenAI no agente primeiro');
      return;
    }

    try {
      console.log('Creating instance with name:', instanceName, 'and number:', phoneNumber);
      
      // Criar instância na Evolution API v2
      await createInstance(instanceName, agent.id, phoneNumber);
      toast.success('Instância WhatsApp criada com sucesso!');

      if (onConnectionUpdate) {
        onConnectionUpdate();
      }

    } catch (error) {
      console.error('Error creating instance:', error);
      toast.error('Erro ao criar instância do WhatsApp');
    }
  };

  const handleGetQRCode = async () => {
    if (!instanceName) return;

    try {
      const result = await getQRCode(instanceName);
      if (result.qrcode) {
        setQrCode(result.qrcode);
        setShowQR(true);
        toast.success('QR Code atualizado!');
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
      toast.error('Erro ao obter QR Code');
    }
  };

  const handleCheckStatus = async () => {
    if (!instanceName) return;

    try {
      const result = await getInstanceStatus(instanceName);
      if (result[0]?.instance?.state) {
        const connected = result[0].instance.state === 'open';
        setIsConnected(connected);
        
        if (connected) {
          toast.success('WhatsApp conectado!');
          setShowQR(false);
        } else {
          toast.warning('WhatsApp não está conectado');
        }

        if (onConnectionUpdate) {
          onConnectionUpdate();
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Erro ao verificar status');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5 text-green-600" />
          <span>Conexão WhatsApp</span>
          <Badge variant={isConnected ? "default" : "secondary"} className="ml-auto">
            {isConnected ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Conectado</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Desconectado</>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!whatsappNumber ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nome da Instância
              </label>
              <Input
                placeholder="Ex: meu-whatsapp-bot"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use apenas letras, números e hífens
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Número do WhatsApp
              </label>
              <Input
                placeholder="Ex: 5511999999999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Número com código do país (ex: 5511999999999)
              </p>
            </div>
            
            <Button 
              onClick={handleCreateInstance} 
              disabled={loading || !agent.openai_api_key}
              className="w-full"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</>
              ) : (
                <><Smartphone className="h-4 w-4 mr-2" /> Criar Instância WhatsApp</>
              )}
            </Button>

            {!agent.openai_api_key && (
              <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                Configure a chave da OpenAI no agente antes de criar a instância do WhatsApp.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Instância:</label>
              <p className="text-sm text-gray-600">{whatsappNumber.phone_number}</p>
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={handleGetQRCode} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                Gerar QR Code
              </Button>

              <Button 
                onClick={handleCheckStatus} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Verificar Status
              </Button>
            </div>

            {showQR && qrCode && (
              <div className="border rounded-lg p-4 text-center">
                <h3 className="font-medium mb-2">Escaneie com seu WhatsApp</h3>
                <div className="flex justify-center">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="max-w-64 max-h-64"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Abra o WhatsApp → Aparelhos conectados → Conectar novo aparelho
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
