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
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${variantStyles[variant]} rounded-lg flex items-center justify-center`}>
          <i className={`fas ${icon} text-xl`}></i>
        </div>
        {trend && (
          <span className={`text-xs flex items-center gap-1 ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
            <i className={`fas fa-arrow-${trend.isPositive ? 'up' : 'down'} text-xs`}></i>
            {trend.value}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
      <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
    </div>
  );
}
