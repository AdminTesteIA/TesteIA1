
import { Bot, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const EmptyAgentsState = () => {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <Bot className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Nenhum agente encontrado</h3>
        <p className="text-muted-foreground mb-6">
          Você ainda não tem nenhum agente criado. Crie seu primeiro agente agora!
        </p>
        <Button asChild>
          <Link to="/agents/create">
            <Plus className="mr-2 h-4 w-4" />
            Criar Meu Primeiro Agente
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
