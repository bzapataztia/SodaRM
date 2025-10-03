import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

export default function Sidebar() {
  const [location] = useLocation();
  const { tenant } = useAuth();

  const navItems = [
    { path: '/', icon: 'fa-chart-line', label: 'Dashboard' },
    { path: '/contracts', icon: 'fa-file-contract', label: 'Contratos' },
    { path: '/invoices', icon: 'fa-file-invoice-dollar', label: 'Facturas' },
    { path: '/payments', icon: 'fa-money-bill-wave', label: 'Pagos' },
    { path: '/properties', icon: 'fa-home', label: 'Propiedades' },
    { path: '/contacts', icon: 'fa-users', label: 'Contactos' },
  ];

  const adminItems = [
    { path: '/insurers', icon: 'fa-shield-halved', label: 'Aseguradoras' },
    { path: '/policies', icon: 'fa-file-shield', label: 'Pólizas' },
  ];

  const settingsItems = [
    { path: '/settings', icon: 'fa-cog', label: 'Ajustes' },
  ];

  const propertiesUsage = tenant?.propertiesCount || 0;
  const maxProperties = tenant?.maxProperties || 10;
  const usagePercentage = (propertiesUsage / maxProperties) * 100;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-building text-primary-foreground text-xl"></i>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Rental Manager</h1>
            <p className="text-xs text-muted-foreground">{tenant?.name || 'Mi Inmobiliaria'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a
                className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                  location === item.path
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-foreground hover:bg-muted'
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <i className={`fas ${item.icon} w-5`}></i>
                <span>{item.label}</span>
              </a>
            </Link>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase">Administración</p>
          <div className="space-y-1">
            {adminItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    location === item.path
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-muted'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <i className={`fas ${item.icon} w-5`}></i>
                  <span>{item.label}</span>
                </a>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase">Configuración</p>
          <div className="space-y-1">
            {settingsItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    location === item.path
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-muted'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <i className={`fas ${item.icon} w-5`}></i>
                  <span>{item.label}</span>
                </a>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="bg-muted rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">Plan {tenant?.plan || 'Trial'}</span>
            <span className="text-xs text-muted-foreground">
              {propertiesUsage}/{maxProperties}
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div
              className="bg-accent h-full rounded-full transition-all"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <Link href="/settings">
            <a className="text-xs text-primary hover:underline mt-2 inline-block" data-testid="link-upgrade">
              Actualizar plan →
            </a>
          </Link>
        </div>
      </div>
    </aside>
  );
}
