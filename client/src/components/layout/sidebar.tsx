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
    <aside className="w-72 bg-card border-r border-border flex flex-col h-screen shadow-sm">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
            <i className="fas fa-building text-white text-xl"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">Rental Manager</h1>
            <p className="text-xs text-muted-foreground truncate">{tenant?.name || 'Mi Inmobiliaria'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1.5">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a
                className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                  location === item.path
                    ? 'gradient-primary text-white font-medium shadow-md'
                    : 'text-foreground hover:bg-muted hover:translate-x-1'
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  location === item.path ? 'bg-white/20' : 'bg-muted group-hover:bg-primary/10'
                }`}>
                  <i className={`fas ${item.icon} text-base ${location === item.path ? 'text-white' : 'text-primary'}`}></i>
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            </Link>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="px-3.5 mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Administración</p>
          <div className="space-y-1.5">
            {adminItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                    location === item.path
                      ? 'gradient-primary text-white font-medium shadow-md'
                      : 'text-foreground hover:bg-muted hover:translate-x-1'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    location === item.path ? 'bg-white/20' : 'bg-muted group-hover:bg-primary/10'
                  }`}>
                    <i className={`fas ${item.icon} text-base ${location === item.path ? 'text-white' : 'text-primary'}`}></i>
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </a>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="px-3.5 mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Configuración</p>
          <div className="space-y-1.5">
            {settingsItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                    location === item.path
                      ? 'gradient-primary text-white font-medium shadow-md'
                      : 'text-foreground hover:bg-muted hover:translate-x-1'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    location === item.path ? 'bg-white/20' : 'bg-muted group-hover:bg-primary/10'
                  }`}>
                    <i className={`fas ${item.icon} text-base ${location === item.path ? 'text-white' : 'text-primary'}`}></i>
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </a>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <i className="fas fa-crown text-white text-xs"></i>
                </div>
                <span className="text-sm font-bold text-foreground">Plan {tenant?.plan || 'Trial'}</span>
              </div>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                {propertiesUsage}/{maxProperties}
              </span>
            </div>
            <div className="w-full bg-background/80 rounded-full h-2.5 overflow-hidden">
              <div
                className="gradient-primary h-full rounded-full transition-all shadow-sm"
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <Link href="/settings">
              <a className="text-xs font-semibold text-primary hover:text-primary/80 mt-3 inline-flex items-center gap-1 transition-colors" data-testid="link-upgrade">
                Actualizar plan
                <i className="fas fa-arrow-right text-[10px]"></i>
              </a>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
