import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function Topbar() {
  const { user } = useAuth();

  const userName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.email || 'Usuario';

  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        <button className="lg:hidden text-foreground" data-testid="button-menu">
          <i className="fas fa-bars text-xl"></i>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative text-foreground hover:text-primary" data-testid="button-notifications">
          <i className="fas fa-bell text-xl"></i>
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
            5
          </span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">{user?.role}</p>
          </div>
          <div className="relative group">
            <button
              className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold"
              data-testid="button-user-menu"
            >
              {userInitials}
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => window.location.href = '/api/logout'}
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
