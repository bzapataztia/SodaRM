import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

export default function PaymentsPage() {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['/api/payments'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>
              <p className="text-muted-foreground mt-1">Historial de pagos recibidos</p>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Factura</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Inquilino</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Método</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          No hay pagos registrados
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-muted/50">
                          <td className="px-6 py-4">
                            <span className="text-sm">{new Date(payment.paymentDate).toLocaleDateString('es-ES')}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono">{payment.invoice?.number}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{payment.invoice?.tenantContact?.fullName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{payment.method}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-success font-mono">
                              {formatCurrency(parseFloat(payment.amount))}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
