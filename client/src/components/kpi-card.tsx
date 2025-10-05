interface KPICardProps {
  title: string;
  value: string;
  icon: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export default function KPICard({ title, value, icon, trend, subtitle, variant = 'default' }: KPICardProps) {
  const variantStyles = {
    default: {
      gradient: 'gradient-primary',
      bgLight: 'bg-primary/5',
      border: 'border-primary/20',
      iconBg: 'bg-primary/10',
      iconText: 'text-primary'
    },
    success: {
      gradient: 'gradient-success',
      bgLight: 'bg-success/5',
      border: 'border-success/20',
      iconBg: 'bg-success/10',
      iconText: 'text-success'
    },
    warning: {
      gradient: 'gradient-warning',
      bgLight: 'bg-warning/5',
      border: 'border-warning/20',
      iconBg: 'bg-warning/10',
      iconText: 'text-warning'
    },
    danger: {
      gradient: 'gradient-danger',
      bgLight: 'bg-destructive/5',
      border: 'border-destructive/20',
      iconBg: 'bg-destructive/10',
      iconText: 'text-destructive'
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`relative bg-card rounded-xl border ${styles.border} p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${styles.bgLight}`}>
      <div className="absolute top-0 right-0 w-32 h-32 ${styles.gradient} opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 ${styles.iconBg} rounded-xl flex items-center justify-center shadow-sm`}>
            <i className={`fas ${icon} text-2xl ${styles.iconText}`}></i>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${trend.isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              <i className={`fas fa-arrow-${trend.isPositive ? 'up' : 'down'} text-[10px]`}></i>
              <span className="text-xs font-semibold">{trend.value}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{title}</h3>
          <p className="text-3xl font-bold text-foreground font-mono tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
