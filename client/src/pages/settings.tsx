import { useMutation } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();

  const checkoutMutation = useMutation({
    mutationFn: (plan: string) => api.billing.createCheckout(plan),
    onSuccess: async (response) => {
      const data = await response.json();
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.billing.customerPortal(),
    onSuccess: async (response) => {
      const data = await response.json();
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$49,000',
      properties: 10,
      features: ['10 propiedades', 'Facturación automática', 'Recordatorios D-3 y D+1', 'Email support'],
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '$149,000',
      properties: 50,
      features: ['50 propiedades', 'Todo en Starter', 'OCR de documentos', 'Reportes de aseguradoras', 'WhatsApp Bot'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$349,000',
      properties: 999,
      features: ['Propiedades ilimitadas', 'Todo en Growth', 'API access', 'Priority support', 'Custom features'],
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
              <p className="text-muted-foreground mt-1">Administra tu suscripción y configuración</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">Plan Actual</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{tenant?.plan || 'Trial'}</p>
                  <p className="text-sm text-muted-foreground">
                    {tenant?.propertiesCount || 0} de {tenant?.maxProperties || 10} propiedades
                  </p>
                </div>
                {tenant?.stripeCustomerId && (
                  <Button
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    data-testid="button-manage-billing"
                  >
                    Administrar suscripción
                  </Button>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Planes disponibles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`bg-card rounded-lg border ${
                      tenant?.plan === plan.id ? 'border-primary' : 'border-border'
                    } p-6`}
                  >
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-3xl font-bold mb-4">
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground">/mes</span>
                    </p>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center text-sm">
                          <i className="fas fa-check text-success mr-2"></i>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={tenant?.plan === plan.id ? 'outline' : 'default'}
                      disabled={tenant?.plan === plan.id || checkoutMutation.isPending}
                      onClick={() => checkoutMutation.mutate(plan.id)}
                      data-testid={`button-select-${plan.id}`}
                    >
                      {tenant?.plan === plan.id ? 'Plan Actual' : 'Seleccionar'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6 mt-8">
              <h2 className="text-lg font-semibold mb-4">Cerrar sesión</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Sal de tu cuenta actual de forma segura
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/api/logout'}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
