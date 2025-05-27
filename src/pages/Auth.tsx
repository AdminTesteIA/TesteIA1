import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Bot, MessageSquare, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    signIn,
    signUp,
    user
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();
  const from = location.state?.from?.pathname || '/dashboard';
  if (user) {
    navigate(from, {
      replace: true
    });
    return null;
  }
  const getErrorMessage = (error: any) => {
    console.log('Auth error:', error);
    if (!error) return null;
    const errorMessage = error.message || error.error_description || String(error);

    // Mapear erros específicos para mensagens em português
    if (errorMessage.includes('Email signups are disabled') || errorMessage.includes('email_provider_disabled')) {
      return 'O cadastro por email está temporariamente desabilitado. Entre em contato com o suporte.';
    }
    if (errorMessage.includes('Email logins are disabled')) {
      return 'O login por email está temporariamente desabilitado. Entre em contato com o suporte.';
    }
    if (errorMessage.includes('Invalid login credentials')) {
      return 'Email ou senha incorretos. Verifique suas credenciais.';
    }
    if (errorMessage.includes('User already registered')) {
      return 'Este email já está cadastrado. Tente fazer login.';
    }
    if (errorMessage.includes('Password should be at least')) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (errorMessage.includes('Invalid email')) {
      return 'Por favor, insira um email válido.';
    }

    // Erro genérico
    return 'Erro de autenticação. Tente novamente em alguns instantes.';
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    console.log('Tentando fazer login com:', {
      email
    });
    const {
      error
    } = await signIn(email, password);
    if (error) {
      console.error('Erro no login:', error);
      const errorMsg = getErrorMessage(error);
      setAuthError(errorMsg);
      toast({
        title: "Erro no login",
        description: errorMsg,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta ao ReplyAgent"
      });
      navigate(from, {
        replace: true
      });
    }
    setLoading(false);
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    // Validações básicas
    if (!fullName.trim()) {
      setAuthError('Por favor, insira seu nome completo.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setAuthError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }
    console.log('Tentando criar conta com:', {
      email,
      fullName
    });
    const {
      error
    } = await signUp(email, password, fullName);
    if (error) {
      console.error('Erro no cadastro:', error);
      const errorMsg = getErrorMessage(error);
      setAuthError(errorMsg);
      toast({
        title: "Erro no cadastro",
        description: errorMsg,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Conta criada com sucesso!",
        description: "Você pode fazer login agora"
      });
      // Limpar formulário após sucesso
      setEmail('');
      setPassword('');
      setFullName('');
    }
    setLoading(false);
  };
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Bot className="h-8 w-8 text-blue-600" />
            <MessageSquare className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nick</h1>
          <p className="text-gray-600">Sistema de IA para WhatsApp</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Acesse sua conta</CardTitle>
            <CardDescription className="text-center">
              Entre ou crie uma nova conta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authError && <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>}
            
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" onClick={() => setAuthError(null)}>Entrar</TabsTrigger>
                <TabsTrigger value="signup" onClick={() => setAuthError(null)}>Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
                    <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input id="signup-name" type="text" placeholder="Seu nome completo" value={fullName} onChange={e => setFullName(e.target.value)} required disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} minLength={6} />
                    <p className="text-sm text-gray-500">Mínimo de 6 caracteres</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Criando conta...' : 'Criar conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>;
}