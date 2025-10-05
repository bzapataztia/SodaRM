interface KPICardProps {
  title: string;
  value: string;
  icon: string;
  trend?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export default function KPICard({ title, value, icon, trend, subtitle, variant = 'default' }: KPICardProps) {
  const variantStyles = {
    default: {
      iconBg: 'bg-primary/10',
      iconText: 'text-primary'
    },
    success: {
      iconBg: 'bg-success/10',
      iconText: 'text-success'
    },
    warning: {
      iconBg: 'bg-warning/10',
      iconText: 'text-warning'
    },
    danger: {
      iconBg: 'bg-destructive/10',
      iconText: 'text-destructive'
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={`w-10 h-10 ${styles.iconBg} rounded-full flex items-center justify-center`}>
          <i className={`fas ${icon} text-lg ${styles.iconText}`}></i>
        </div>
      </div>
      
      <p className="text-3xl font-bold text-foreground mb-3">{value}</p>
      
      {trend && (
        <div className={`flex items-center gap-1.5 text-sm`}>
          <span className={`flex items-center gap-1 font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
            <i className={`fas fa-arrow-${trend.isPositive ? 'up' : 'down'} text-xs`}></i>
            {trend.value}
          </span>
          {trend.label && (
            <span className="text-muted-foreground text-xs">{trend.label}</span>
          )}
        </div>
      )}
      
      {subtitle && !trend && (
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
