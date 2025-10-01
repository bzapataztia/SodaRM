import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

export default function InsurersPage() {
  const { data: insurers = [], isLoading } = useQuery({
    queryKey: ['/api/insurers'],
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
              <h1 className="text-3xl font-bold tracking-tight">Aseguradoras</h1>
              <p className="text-muted-foreground mt-1">Gestiona las aseguradoras y sus reportes</p>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email Reportes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo de Póliza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {insurers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                          No hay aseguradoras registradas
                        </td>
                      </tr>
                    ) : (
                      insurers.map((insurer: any) => (
                        <tr key={insurer.id} className="hover:bg-muted/50">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium">{insurer.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{insurer.emailReports || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{insurer.policyType || 'N/A'}</span>
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
