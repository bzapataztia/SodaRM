import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function InvoiceDetailPage() {
  const [, params] = useRoute('/invoices/:id');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const invoiceId = params?.id;

  const { data: invoice, isLoading } = useQuery({
    queryKey: [`/api/invoices/${invoiceId}`],
    enabled: !!invoiceId,
  });

  const remindMutation = useMutation({
    mutationFn: () => api.invoices.remind(invoiceId!),
    onSuccess: () => {
      toast({
        title: 'Recordatorio enviado',
        description: 'El recordatorio ha sido enviado exitosamente',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Factura no encontrada</h2>
          <Button onClick={() => setLocation('/invoices')}>Volver a facturas</Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const balance = parseFloat(invoice.totalAmount) - parseFloat(invoice.amountPaid);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <Button variant="ghost" onClick={() => setLocation('/invoices')} className="mb-4" data-testid="button-back">
                <i className="fas fa-arrow-left mr-2"></i>
                Volver a facturas
              </Button>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{invoice.number}</h1>
                  <p className="text-muted-foreground">Factura de arrendamiento</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(`/api/invoices/${invoiceId}/pdf`, '_blank')}
                    data-testid="button-download"
                  >
                    <i className="fas fa-download mr-2"></i>
                    Descargar PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => remindMutation.mutate()}
                    disabled={remindMutation.isPending}
                    data-testid="button-remind"
                  >
                    <i className="fas fa-paper-plane mr-2"></i>
                    Enviar recordatorio
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-sm font-semibold mb-3">Información de la factura</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Inquilino</p>
                      <p className="font-medium">{invoice.tenantContact?.fullName}</p>
                      <p className="text-sm text-muted-foreground">{invoice.tenantContact?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Propiedad</p>
                      <p className="font-medium">{invoice.contract?.property?.name}</p>
                      <p className="text-sm text-muted-foreground">{invoice.contract?.property?.address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Fecha de emisión</p>
                      <p className="font-semibold">{new Date(invoice.issueDate).toLocaleDateString('es-ES')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Fecha de vencimiento</p>
                      <p className="font-semibold">{new Date(invoice.dueDate).toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-sm font-semibold mb-3">Conceptos facturados</h3>
                  <div className="space-y-3">
                    {invoice.charges?.map((charge: any) => (
                      <div key={charge.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{charge.description}</p>
                        </div>
                        <p className="font-mono font-semibold">{formatCurrency(parseFloat(charge.amount))}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-border space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-muted-foreground">Subtotal</p>
                      <p className="font-mono">{formatCurrency(parseFloat(invoice.subtotal))}</p>
                    </div>
                    {parseFloat(invoice.lateFee) > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-destructive">Mora</p>
                        <p className="font-mono text-destructive">{formatCurrency(parseFloat(invoice.lateFee))}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-lg font-bold pt-3 border-t border-border">
                      <p>Total</p>
                      <p className="font-mono">{formatCurrency(parseFloat(invoice.totalAmount))}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="font-semibold mb-4">Estado de pago</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total facturado</p>
                      <p className="text-2xl font-bold font-mono">{formatCurrency(parseFloat(invoice.totalAmount))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total pagado</p>
                      <p className="text-2xl font-bold font-mono text-success">
                        {formatCurrency(parseFloat(invoice.amountPaid))}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-1">Saldo pendiente</p>
                      <p className="text-3xl font-bold font-mono text-destructive">{formatCurrency(balance)}</p>
                    </div>
                  </div>
                </div>

                {invoice.status === 'overdue' && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <i className="fas fa-exclamation-triangle text-destructive text-xl mt-1"></i>
                      <div>
                        <h4 className="font-semibold mb-1">Factura vencida</h4>
                        <p className="text-sm text-muted-foreground mb-3">Esta factura está vencida</p>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => remindMutation.mutate()}
                          disabled={remindMutation.isPending}
                          data-testid="button-remind-overdue"
                        >
                          <i className="fas fa-paper-plane mr-2"></i>
                          Enviar recordatorio D+1
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
