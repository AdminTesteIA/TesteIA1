
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CreateAgentHeader() {
  return (
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
  );
}
