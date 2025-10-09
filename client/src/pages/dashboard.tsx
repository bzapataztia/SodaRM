import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import KPICard from '@/components/kpi-card';
import type { Tenant, Invoice, Contact } from '@shared/schema';

interface DashboardStats {
  issued: number;
  overdue: number;
  collected: number;
  recovery: number;
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ['/api/tenants/current'],
  });

  const recentInvoices = invoices.slice(0, 5);

  const getContactName = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact?.fullName || 'N/A';
  };

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

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">Pagada</span>;
    } else if (status === 'overdue') {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Vencida</span>;
    } else if (status === 'partial') {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">Parcial</span>;
    } else {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">Enviada</span>;
    }
  };

  const quickActions = [
    { 
      label: 'Nueva Factura', 
      description: 'Crear factura de alquiler', 
      icon: 'fa-file-invoice',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      href: '/invoices'
    },
    { 
      label: 'Agregar Propiedad', 
      description: 'Registrar nueva propiedad', 
      icon: 'fa-home',
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-500',
      href: '/properties'
    },
    { 
      label: 'Nuevo Inquilino', 
      description: 'Registrar nuevo contacto', 
      icon: 'fa-user-plus',
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
      href: '/contacts'
    },
    { 
      label: 'Registrar Pago', 
      description: 'Marcar pago recibido', 
      icon: 'fa-money-bill',
      bgColor: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      href: '/payments'
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Vista general de tu cartera de arriendos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div data-testid="kpi-emitido">
                <KPICard
                  title="Emitido Este Mes"
                  value={formatCurrency(stats?.issued || 0)}
                  icon="fa-file-invoice"
                  trend={{ value: '+12.5%', isPositive: true, label: 'vs mes anterior' }}
                  variant="default"
                />
              </div>
              <div data-testid="kpi-vencido">
                <KPICard
                  title="Vencido"
                  value={formatCurrency(stats?.overdue || 0)}
                  icon="fa-exclamation-triangle"
                  subtitle={`${invoices.filter(inv => inv.status === 'overdue').length} facturas vencidas`}
                  variant="danger"
                />
              </div>
              <div data-testid="kpi-cobrado">
                <KPICard
                  title="Cobrado Este Mes"
                  value={formatCurrency(stats?.collected || 0)}
                  icon="fa-check-circle"
                  trend={{ value: '+8.3%', isPositive: true, label: 'vs mes anterior' }}
                  variant="success"
                />
              </div>
              <div data-testid="kpi-recuperacion">
                <KPICard
                  title="% Recuperación"
                  value={`${stats?.recovery || 0}%`}
                  icon="fa-chart-line"
                  trend={{ value: '-2.1%', isPositive: false, label: 'vs mes anterior' }}
                  variant="warning"
                />
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Acciones Rápidas</h2>
              <p className="text-sm text-muted-foreground mb-4">Tareas más frecuentes de tu día a día</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <Link key={action.label} href={action.href}>
                    <div 
                      className="flex flex-col items-center text-center p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                      data-testid={`card-quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className={`w-14 h-14 ${action.bgColor} rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <i className={`fas ${action.icon} text-xl ${action.iconColor}`}></i>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">{action.label}</h3>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Facturas Recientes</h2>
                  <p className="text-sm text-muted-foreground">Últimas facturas emitidas en el sistema</p>
                </div>
                <Link href="/invoices">
                  <div className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer" data-testid="link-view-all">
                    Ver todas
                  </div>
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                        Número
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                        Inquilino
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                        Vencimiento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              <i className="fas fa-inbox text-xl text-muted-foreground"></i>
                            </div>
                            <p className="text-sm text-muted-foreground">No hay facturas registradas</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      recentInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-invoice-${invoice.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <i className="fas fa-file-alt text-muted-foreground text-sm"></i>
                              <span className="text-sm font-medium text-foreground" data-testid={`text-invoice-number-${invoice.id}`}>
                                {invoice.number}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-foreground" data-testid={`text-tenant-${invoice.id}`}>
                              {getContactName(invoice.tenantContactId)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-foreground" data-testid={`text-total-${invoice.id}`}>
                              {formatCurrency(parseFloat(invoice.totalAmount))}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div data-testid={`status-${invoice.id}`}>
                              {getStatusBadge(invoice.status)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-foreground" data-testid={`text-due-date-${invoice.id}`}>
                              {new Date(invoice.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              data-testid={`button-actions-${invoice.id}`}
                            >
                              <i className="fas fa-ellipsis-h"></i>
                            </button>
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
