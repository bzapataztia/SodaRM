import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

export default function ContactsPage() {
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['/api/contacts'],
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
              <h1 className="text-3xl font-bold tracking-tight">Contactos</h1>
              <p className="text-muted-foreground mt-1">Gestiona propietarios, inquilinos y garantes</p>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Teléfono</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Roles</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Documento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contacts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          No hay contactos registrados
                        </td>
                      </tr>
                    ) : (
                      contacts.map((contact: any) => (
                        <tr key={contact.id} className="hover:bg-muted/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-semibold text-primary">
                                {contact.fullName
                                  .split(' ')
                                  .map((n: string) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </div>
                              <span className="text-sm font-medium">{contact.fullName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{contact.email || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{contact.phone || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {contact.roles?.map((role: string) => (
                                <span
                                  key={role}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono">
                              {contact.docType} {contact.docNumber}
                            </span>
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
