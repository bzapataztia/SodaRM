import { useQuery, useMutation } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import { queryClient } from '@/lib/queryClient';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function ContractsPage() {
  const { toast } = useToast();
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['/api/contracts'],
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.contracts.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: 'Contrato activado',
        description: 'Las facturas han sido generadas exitosamente',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
              <p className="text-muted-foreground mt-1">Gestiona los contratos de arrendamiento</p>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Número</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Propiedad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Inquilino</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Canon</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contracts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                          No hay contratos registrados
                        </td>
                      </tr>
                    ) : (
                      contracts.map((contract: any) => (
                        <tr key={contract.id} className="hover:bg-muted/50">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium font-mono">{contract.number}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium">{contract.property?.name}</p>
                              <p className="text-xs text-muted-foreground">{contract.owner?.fullName}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{contract.tenantContact?.fullName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold font-mono">
                              ${parseFloat(contract.rentAmount).toLocaleString('es-CO')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                contract.status === 'active'
                                  ? 'bg-success/10 text-success'
                                  : contract.status === 'draft'
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-warning/10 text-warning'
                              }`}
                            >
                              {contract.status === 'active' ? 'Activo' : contract.status === 'draft' ? 'Borrador' : contract.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {contract.status === 'draft' && (
                              <button
                                onClick={() => activateMutation.mutate(contract.id)}
                                disabled={activateMutation.isPending}
                                className="text-primary hover:text-primary/80"
                                data-testid={`button-activate-${contract.id}`}
                              >
                                <i className="fas fa-play"></i> Activar
                              </button>
                            )}
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
