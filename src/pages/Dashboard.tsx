import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare, Phone, Plus, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  connectedNumbers: number;
}
export default function Dashboard() {
  const {
    user
  } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    activeAgents: 0,
    connectedNumbers: 0
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        // Total de agentes
        const {
          count: totalAgents
        } = await supabase.from('agents').select('*', {
          count: 'exact',
          head: true
        }).eq('user_id', user.id);

        // Agentes ativos
        const {
          count: activeAgents
        } = await supabase.from('agents').select('*', {
          count: 'exact',
          head: true
        }).eq('user_id', user.id).eq('is_active', true);

        // Números conectados
        const {
          count: connectedNumbers
        } = await supabase.from('whatsapp_numbers').select('*, agents!inner(*)', {
          count: 'exact',
          head: true
        }).eq('agents.user_id', user.id).eq('is_connected', true);
        setStats({
          totalAgents: totalAgents || 0,
          activeAgents: activeAgents || 0,
          connectedNumbers: connectedNumbers || 0
        });
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);
  const statCards = [{
    title: 'Total de Agentes',
    value: stats.totalAgents,
    icon: Bot,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  }, {
    title: 'Agentes Ativos',
    value: stats.activeAgents,
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  }, {
    title: 'Números Conectados',
    value: stats.connectedNumbers,
    icon: Phone,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }];
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>;
  }
  return <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel de controle</h1>
          <p className="text-gray-600 mt-1">Bem-vindo ao TesteIA! Gerencie seus agentes de IA para WhatsApp.</p>
        </div>
        <Button asChild>
          <Link to="/agents/new" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Criar Agente</span>
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map(stat => <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>)}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-24 flex-col space-y-2">
              <Link to="/agents/new">
                <Bot className="h-6 w-6" />
                <span>Criar Novo Agente</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-24 flex-col space-y-2">
              <Link to="/agents">
                <MessageSquare className="h-6 w-6" />
                <span>Gerenciar Agentes</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-24 flex-col space-y-2">
              <Link to="/conversations">
                <Phone className="h-6 w-6" />
                <span>Ver Conversas</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      {stats.totalAgents === 0 && <Card className="border-dashed border-2 border-gray-300">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Bot className="h-6 w-6 text-blue-600" />
              <span>Comece agora!</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Você ainda não tem nenhum agente criado. Crie seu primeiro agente de IA para WhatsApp agora mesmo!
            </p>
            <Button asChild size="lg">
              <Link to="/agents/new" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Criar Meu Primeiro Agente</span>
              </Link>
            </Button>
          </CardContent>
        </Card>}
    </div>;
}