import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import type { Invoice, Tenant } from '@shared/schema';

export default function Sidebar() {
  const [location] = useLocation();
  const { tenant: authTenant } = useAuth();

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ['/api/tenants/current'],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const pendingInvoicesCount = invoices.filter(inv => 
    inv.status === 'issued' || inv.status === 'partial' || inv.status === 'overdue'
  ).length;

  const navItems = [
    { path: '/', icon: 'fa-chart-line', label: 'Dashboard' },
    { path: '/contracts', icon: 'fa-file-contract', label: 'Contratos' },
    { path: '/invoices', icon: 'fa-file-invoice-dollar', label: 'Facturas', badge: pendingInvoicesCount > 0 ? pendingInvoicesCount : undefined },
    { path: '/payments', icon: 'fa-money-bill-wave', label: 'Pagos' },
    { path: '/properties', icon: 'fa-home', label: 'Propiedades' },
    { path: '/contacts', icon: 'fa-users', label: 'Contactos' },
  ];

  const adminItems = [
    { path: '/insurers', icon: 'fa-shield-halved', label: 'Asignaciones' },
    { path: '/policies', icon: 'fa-file-shield', label: 'Pólizas' },
  ];

  const settingsItems = [
    { path: '/settings', icon: 'fa-cog', label: 'Ajustes' },
  ];

  const propertiesUsage = authTenant?.propertiesCount || 0;
  const maxProperties = tenant?.maxProperties || authTenant?.maxProperties || 10;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen">
      <div className="p-6 border-b border-border">
        <div className="mb-4">
          {tenant?.logo ? (
            <img 
              src={tenant.logo} 
              alt={tenant.name || 'Logo'} 
              className="h-10 object-contain"
              data-testid="img-sidebar-logo"
            />
          ) : (
            <h1 className="text-2xl font-black text-foreground">soda</h1>
          )}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Rental Manager</h2>
          <p className="text-xs text-muted-foreground">{tenant?.name || 'Inmobiliaria SAS'}</p>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                  location === item.path
                    ? 'bg-primary text-white'
                    : 'text-foreground hover:bg-muted'
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <i className={`fas ${item.icon} text-base w-5`}></i>
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    location === item.path ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Administración</p>
          <div className="space-y-0.5">
            {adminItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                    location === item.path
                      ? 'bg-primary text-white'
                      : 'text-foreground hover:bg-muted'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <i className={`fas ${item.icon} text-base w-5`}></i>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Configuración</p>
          <div className="space-y-0.5">
            {settingsItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                    location === item.path
                      ? 'bg-primary text-white'
                      : 'text-foreground hover:bg-muted'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <i className={`fas ${item.icon} text-base w-5`}></i>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Plan {tenant?.plan || 'Trial'}</span>
            <span className="text-xs font-bold text-foreground">
              {propertiesUsage}/{maxProperties}
            </span>
          </div>
          <Link href="/settings">
            <div className="text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer" data-testid="link-upgrade">
              Actualizar plan
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
