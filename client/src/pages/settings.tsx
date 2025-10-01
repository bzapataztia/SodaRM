import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { LogOut, Upload, X, Building2 } from 'lucide-react';

export default function SettingsPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { data: tenantData } = useQuery({
    queryKey: ['/api/tenants/current'],
  });

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

  const updateTenantMutation = useMutation({
    mutationFn: (data: { name?: string; logo?: string }) => 
      apiRequest('PATCH', '/api/tenants/current', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: 'Configuración actualizada exitosamente' });
      setLogoFile(null);
      setLogoPreview(null);
    },
    onError: () => {
      toast({ title: 'Error al actualizar configuración', variant: 'destructive' });
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ 
        title: 'Archivo muy grande', 
        description: 'El logo debe ser menor a 2MB',
        variant: 'destructive' 
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({ 
        title: 'Formato no válido', 
        description: 'Solo se permiten imágenes',
        variant: 'destructive' 
      });
      return;
    }

    setLogoFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSaveLogo = () => {
    if (!logoPreview) return;
    updateTenantMutation.mutate({ logo: logoPreview });
  };

  const handleRemoveCurrentLogo = () => {
    updateTenantMutation.mutate({ logo: '' });
  };

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
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Logo de la Empresa</h2>
              </div>
              
              {(tenantData?.logo || logoPreview) && (
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <img 
                      src={logoPreview || tenantData?.logo} 
                      alt="Logo" 
                      className="h-24 w-24 object-contain rounded-lg border bg-white p-2"
                      data-testid="img-logo-preview"
                    />
                    {logoPreview && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleRemoveLogo}
                        data-testid="button-remove-preview"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {tenantData?.logo && !logoPreview && (
                    <Button
                      variant="outline"
                      onClick={handleRemoveCurrentLogo}
                      disabled={updateTenantMutation.isPending}
                      data-testid="button-remove-logo"
                    >
                      Eliminar Logo
                    </Button>
                  )}
                </div>
              )}

              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="logo-upload" className="mb-2 block">Subir Logo</Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="cursor-pointer"
                    data-testid="input-logo"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG o GIF. Máximo 2MB.
                  </p>
                </div>
                {logoPreview && (
                  <Button
                    onClick={handleSaveLogo}
                    disabled={updateTenantMutation.isPending}
                    data-testid="button-save-logo"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Guardar Logo
                  </Button>
                )}
              </div>
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
