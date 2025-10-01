import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { signup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyName: '',
    acceptTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.acceptTerms) {
      toast({
        title: 'Error',
        description: 'Debes aceptar los términos y condiciones',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        companyName: formData.companyName,
      });
      setLocation('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al crear la cuenta',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4 shadow-lg">
            <i className="fas fa-building text-white text-2xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crea tu cuenta</h1>
          <p className="text-gray-600">Comienza a gestionar tus propiedades en minutos</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Juan Pérez"
                className="mt-2"
                data-testid="input-fullname"
              />
            </div>

            <div>
              <Label htmlFor="companyName">Nombre de la empresa</Label>
              <Input
                id="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Mi Inmobiliaria S.A."
                className="mt-2"
                data-testid="input-company"
              />
            </div>

            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="tu@empresa.com"
                className="mt-2"
                data-testid="input-email"
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
                className="mt-2"
                data-testid="input-password"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Repite tu contraseña"
                className="mt-2"
                data-testid="input-confirm-password"
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: checked as boolean })}
                data-testid="checkbox-terms"
              />
              <label htmlFor="terms" className="text-sm text-gray-600 leading-tight">
                Acepto los términos y condiciones y la política de privacidad
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-signup"
            >
              {isLoading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <a href="/login" className="text-primary font-medium hover:underline" data-testid="link-login">
                Inicia sesión
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
