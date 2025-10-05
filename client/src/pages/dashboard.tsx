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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-5">
              {tenant?.logo && (
                <div className="flex-shrink-0">
                  <img 
                    src={tenant.logo} 
                    alt={tenant.name || 'Logo'} 
                    className="h-20 w-20 object-contain rounded-xl border-2 border-border shadow-sm"
                    data-testid="img-tenant-logo"
                  />
                </div>
              )}
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Cartera Hoy
                </h1>
                <p className="text-muted-foreground mt-2 text-base">Vista general de tu cartera de arriendos</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-background to-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Facturas Recientes</h2>
                    <p className="text-sm text-muted-foreground mt-1">Últimas facturas emitidas en el sistema</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <i className="fas fa-file-invoice text-primary"></i>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Número
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Inquilino
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {recentInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                              <i className="fas fa-inbox text-2xl text-muted-foreground"></i>
                            </div>
                            <p className="text-muted-foreground font-medium">No hay facturas registradas</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      recentInvoices.map((invoice: any) => (
                        <tr key={invoice.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="text-sm font-bold font-mono text-foreground">{invoice.number}</span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="text-sm font-medium text-foreground">{invoice.tenantContact?.fullName}</span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="text-sm font-bold font-mono text-foreground">
                              {formatCurrency(parseFloat(invoice.totalAmount))}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${
                                invoice.status === 'paid'
                                  ? 'bg-success/15 text-success border border-success/20'
                                  : invoice.status === 'overdue'
                                  ? 'bg-destructive/15 text-destructive border border-destructive/20'
                                  : 'bg-warning/15 text-warning border border-warning/20'
                              }`}
                            >
                              {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'overdue' ? 'Vencida' : 'Emitida'}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <a
                              href={`/invoices/${invoice.id}`}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
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
