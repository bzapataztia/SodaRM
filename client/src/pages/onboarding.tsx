import { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest, queryClient } from '@/lib/queryClient';
import logoPath from '@assets/logo_soda (1)_1759330032096.png';

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName }),
      });

      // Invalidate user query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: '¡Bienvenido!',
        description: 'Tu cuenta ha sido configurada exitosamente',
      });
      
      setLocation('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al configurar la cuenta',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src={logoPath} alt="Rental Manager Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configura tu cuenta</h1>
          <p className="text-gray-600">Solo un paso más para comenzar</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="companyName">Nombre de tu empresa u organización</Label>
              <Input
                id="companyName"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Mi Inmobiliaria S.A."
                className="mt-2"
                data-testid="input-company"
              />
              <p className="text-sm text-gray-500 mt-2">
                Este será el nombre de tu organización en el sistema
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-onboard"
            >
              {isLoading ? 'Configurando...' : 'Continuar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
