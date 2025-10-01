import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import KPICard from '@/components/kpi-card';
import { api } from '@/lib/api';
import type { Tenant } from '@shared/schema';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: invoices } = useQuery({
    queryKey: ['/api/invoices'],
  });

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ['/api/tenants/current'],
  });

  const recentInvoices = invoices?.slice(0, 5) || [];

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
            <div className="mb-8 flex items-center gap-4">
              {tenant?.logo && (
                <img 
                  src={tenant.logo} 
                  alt={tenant.name || 'Logo'} 
                  className="h-16 w-16 object-contain"
                  data-testid="img-tenant-logo"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Cartera Hoy</h1>
                <p className="text-muted-foreground mt-1">Vista general de tu cartera de arriendos</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KPICard
                title="Emitido Este Mes"
                value={formatCurrency(stats?.issued || 0)}
                icon="fa-file-invoice"
                trend={{ value: '12.5%', isPositive: true }}
                variant="default"
              />
              <KPICard
                title="Vencido"
                value={formatCurrency(stats?.overdue || 0)}
                icon="fa-exclamation-triangle"
                variant="danger"
              />
              <KPICard
                title="Cobrado Este Mes"
                value={formatCurrency(stats?.collected || 0)}
                icon="fa-check-circle"
                trend={{ value: '8.3%', isPositive: true }}
                variant="success"
              />
              <KPICard
                title="% Recuperación"
                value={`${stats?.recovery || 0}%`}
                icon="fa-percentage"
                variant="warning"
              />
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold">Facturas Recientes</h2>
                <p className="text-sm text-muted-foreground mt-1">Últimas facturas emitidas</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Número
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Inquilino
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          No hay facturas registradas
                        </td>
                      </tr>
                    ) : (
                      recentInvoices.map((invoice: any) => (
                        <tr key={invoice.id} className="hover:bg-muted/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium font-mono">{invoice.number}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm">{invoice.tenantContact?.fullName}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold font-mono">
                              {formatCurrency(parseFloat(invoice.totalAmount))}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                invoice.status === 'paid'
                                  ? 'bg-success/10 text-success'
                                  : invoice.status === 'overdue'
                                  ? 'bg-destructive/10 text-destructive'
                                  : 'bg-warning/10 text-warning'
                              }`}
                            >
                              {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'overdue' ? 'Vencida' : 'Emitida'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a
                              href={`/invoices/${invoice.id}`}
                              className="text-primary hover:text-primary/80"
                              data-testid={`link-invoice-${invoice.id}`}
                            >
                              <i className="fas fa-eye"></i>
                            </a>
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
