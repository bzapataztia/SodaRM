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
    <header className="h-20 bg-card border-b border-border flex items-center justify-between px-8 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <button className="lg:hidden w-10 h-10 rounded-lg bg-muted hover:bg-primary/10 text-foreground hover:text-primary transition-colors flex items-center justify-center" data-testid="button-menu">
          <i className="fas fa-bars text-lg"></i>
        </button>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative w-11 h-11 rounded-xl bg-muted hover:bg-primary/10 text-foreground hover:text-primary transition-all flex items-center justify-center group" data-testid="button-notifications">
          <i className="fas fa-bell text-lg group-hover:animate-pulse"></i>
          <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
            5
          </span>
        </button>

        <div className="flex items-center gap-4 pl-6 border-l border-border">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role || 'Usuario'}</p>
          </div>
          <div className="relative group">
            <button
              className="w-11 h-11 gradient-primary rounded-xl flex items-center justify-center text-white font-bold shadow-md hover:shadow-lg transition-all hover:scale-105"
              data-testid="button-user-menu"
            >
              {userInitials}
            </button>
            <div className="absolute right-0 top-full mt-3 w-56 bg-card border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all overflow-hidden">
              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-destructive/10 hover:text-destructive rounded-lg"
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-logout"
                >
                  <i className="fas fa-sign-out-alt mr-3 text-base"></i>
                  <span className="font-medium">Cerrar sesión</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
