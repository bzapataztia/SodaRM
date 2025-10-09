import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSidebar } from '@/contexts/SidebarContext';
import { useState } from 'react';
import { useLocation } from 'wouter';

export default function Topbar() {
  const { user } = useAuth();
  const { toggle } = useSidebar();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  const userName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.email || 'Usuario';

  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button
          onClick={toggle}
          className="lg:hidden w-10 h-10 rounded-lg hover:bg-muted text-foreground transition-all flex items-center justify-center"
          data-testid="button-menu-toggle"
        >
          <i className="fas fa-bars text-lg"></i>
        </button>
        <form onSubmit={handleSearch} className="relative flex-1">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"></i>
          <Input 
            type="text" 
            placeholder="Buscar propiedades, inquilinos..." 
            className="pl-10 bg-muted/50 border-0 h-10"
            data-testid="input-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative w-10 h-10 rounded-lg hover:bg-muted text-foreground transition-all flex items-center justify-center" data-testid="button-notifications">
          <i className="fas fa-bell text-lg"></i>
          <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            1
          </span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="relative group">
            <button
              className="flex items-center gap-2 hover:bg-muted px-2 py-1.5 rounded-lg transition-colors"
              data-testid="button-user-menu"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold">
                {userInitials}
              </div>
              <span className="text-sm font-semibold text-foreground">{userName}</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all overflow-hidden z-50">
              <div className="p-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-destructive/10 hover:text-destructive rounded-md text-sm"
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-logout"
                >
                  <i className="fas fa-sign-out-alt mr-2 text-sm"></i>
                  <span>Cerrar sesión</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
