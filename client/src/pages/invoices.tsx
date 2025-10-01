import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

export default function InvoicesPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['/api/invoices'],
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
              <h1 className="text-3xl font-bold tracking-tight">Facturas</h1>
              <p className="text-muted-foreground mt-1">Gestiona las facturas de arrendamiento</p>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Número</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Inquilino</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vencimiento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Pagado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                          No hay facturas registradas
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice: any) => (
                        <tr key={invoice.id} className="hover:bg-muted/50">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium font-mono">{invoice.number}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{invoice.tenantContact?.fullName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{new Date(invoice.dueDate).toLocaleDateString('es-ES')}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold font-mono">
                              {formatCurrency(parseFloat(invoice.totalAmount))}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono text-success">
                              {formatCurrency(parseFloat(invoice.amountPaid))}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                invoice.status === 'paid'
                                  ? 'bg-success/10 text-success'
                                  : invoice.status === 'overdue'
                                  ? 'bg-destructive/10 text-destructive'
                                  : invoice.status === 'partial'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-warning/10 text-warning'
                              }`}
                            >
                              {invoice.status === 'paid'
                                ? 'Pagada'
                                : invoice.status === 'overdue'
                                ? 'Vencida'
                                : invoice.status === 'partial'
                                ? 'Parcial'
                                : 'Emitida'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/invoices/${invoice.id}`}>
                              <a className="text-primary hover:text-primary/80" data-testid={`link-invoice-${invoice.id}`}>
                                <i className="fas fa-eye"></i>
                              </a>
                            </Link>
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
