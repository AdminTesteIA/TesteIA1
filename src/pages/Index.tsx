import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageSquare, Zap, Shield, Smartphone, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
export default function Index() {
  const {
    user
  } = useAuth();
  const features = [{
    icon: Bot,
    title: "Agentes de IA Inteligentes",
    description: "Crie agentes personalizados com prompts específicos para diferentes necessidades do seu negócio."
  }, {
    icon: MessageSquare,
    title: "Integração WhatsApp",
    description: "Conecte facilmente seus números de WhatsApp e automatize o atendimento aos clientes."
  }, {
    icon: Brain,
    title: "Base de Conhecimento",
    description: "Adicione documentos e informações para que seus agentes respondam com precisão."
  }, {
    icon: Zap,
    title: "Respostas Instantâneas",
    description: "Atendimento 24/7 com respostas rápidas e contextualizadas para seus clientes."
  }, {
    icon: Shield,
    title: "Seguro e Confiável",
    description: "Seus dados e conversas são protegidos com a mais alta segurança."
  }, {
    icon: Smartphone,
    title: "Interface Moderna",
    description: "Dashboard intuitivo e responsivo para gerenciar tudo em um só lugar."
  }];
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ReplyAgent</span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? <Button asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button> : <>
                  <Button variant="ghost" asChild>
                    <Link to="/auth">Entrar</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/auth">Começar Agora</Link>
                  </Button>
                </>}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-4 mb-8">
            <Bot className="h-16 w-16 text-blue-600" />
            <MessageSquare className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Automatize seu
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600"> WhatsApp </span>
            com IA
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Crie agentes de IA personalizados para atender seus clientes no WhatsApp 24/7. 
            Integração simples, respostas inteligentes e total controle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8 py-3">
              <Link to="/auth">Começar gratuitamente</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3">Ver como funciona</Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa para automatizar
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Uma plataforma completa para criar, gerenciar e otimizar seus agentes de IA para WhatsApp
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg">
                      <feature.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-green-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pronto para revolucionar seu atendimento?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Junte-se a milhares de empresas que já automatizaram seu WhatsApp com IA
          </p>
          <Button size="lg" variant="secondary" asChild className="text-lg px-8 py-3">
            <Link to="/auth">Criar Minha Conta Grátis</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Bot className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold">ReplyAgent</span>
          </div>
          <p className="text-gray-400">
            © 2024 ReplyAgent. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>;
}