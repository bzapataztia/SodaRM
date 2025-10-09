import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import logoPath from '@assets/logo_soda (1)_1759330032096.png';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      setLocation('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Credenciales inválidas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-12">
            <img src={logoPath} alt="Rental Manager Logo" className="h-12 w-auto" />
          </div>
          
          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl font-bold leading-tight">
              Gestiona tu cartera de arriendos con facilidad
            </h1>
            <p className="text-lg text-primary-foreground/80">
              Facturación automática, recordatorios, reportes de aseguradoras y más. Todo en una plataforma.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-file-invoice text-sm"></i>
            </div>
            <div>
              <h3 className="font-semibold">Facturación Automática</h3>
              <p className="text-sm text-primary-foreground/70">Genera facturas mensuales por contrato</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-bell text-sm"></i>
            </div>
            <div>
              <h3 className="font-semibold">Recordatorios Inteligentes</h3>
              <p className="text-sm text-primary-foreground/70">Email y WhatsApp D-3 y D+1</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
              <i className="fas fa-chart-line text-sm"></i>
            </div>
            <div>
              <h3 className="font-semibold">Reportes en PDF</h3>
              <p className="text-sm text-primary-foreground/70">Informes mensuales por aseguradora</p>
            </div>
          </div>
        </div>
        
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-primary-foreground rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary-foreground rounded-full blur-3xl"></div>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center mb-6">
              <img src={logoPath} alt="Rental Manager Logo" className="h-10 w-auto" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Iniciar sesión</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ingresa a tu cuenta para gestionar tu cartera
            </p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  className="mt-2"
                  data-testid="input-email"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <a href="#" className="text-sm text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  data-testid="input-password"
                />
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
          
          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <a href="/signup" className="font-medium text-primary hover:underline" data-testid="link-signup">
              Regístrate gratis
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
