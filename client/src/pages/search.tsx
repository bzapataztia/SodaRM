import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import type { Property, Contact } from '@shared/schema';

export default function SearchPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const searchTerm = searchParams.get('q') || '';

  const { data: properties = [], isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const filteredProperties = properties.filter(property =>
    property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact =>
    contact.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = loadingProperties || loadingContacts;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Resultados de búsqueda para: "{searchTerm}"
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredProperties.length + filteredContacts.length} resultados encontrados
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {filteredProperties.length > 0 && (
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                      <h2 className="text-lg font-semibold text-foreground">Propiedades</h2>
                      <p className="text-sm text-muted-foreground">{filteredProperties.length} propiedades encontradas</p>
                    </div>
                    <div className="divide-y divide-border">
                      {filteredProperties.map((property) => (
                        <Link key={property.id} href="/properties">
                          <div className="px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-sm font-semibold text-foreground">{property.code}</h3>
                                <p className="text-sm text-muted-foreground">{property.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{property.address}</p>
                              </div>
                              <i className="fas fa-chevron-right text-muted-foreground"></i>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {filteredContacts.length > 0 && (
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                      <h2 className="text-lg font-semibold text-foreground">Contactos</h2>
                      <p className="text-sm text-muted-foreground">{filteredContacts.length} contactos encontrados</p>
                    </div>
                    <div className="divide-y divide-border">
                      {filteredContacts.map((contact) => (
                        <Link key={contact.id} href="/contacts">
                          <div className="px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-sm font-semibold text-foreground">{contact.fullName}</h3>
                                <div className="flex items-center gap-4 mt-1">
                                  {contact.email && (
                                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                                  )}
                                  {contact.phone && (
                                    <p className="text-xs text-muted-foreground">{contact.phone}</p>
                                  )}
                                </div>
                                {contact.roles && contact.roles.length > 0 && (
                                  <div className="flex gap-1 mt-2">
                                    {contact.roles.map((role) => (
                                      <span key={role} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                                        {role === 'tenant' ? 'Inquilino' : role === 'owner' ? 'Propietario' : role === 'guarantor' ? 'Garante' : role}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <i className="fas fa-chevron-right text-muted-foreground"></i>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {filteredProperties.length === 0 && filteredContacts.length === 0 && (
                  <div className="bg-card rounded-xl border border-border p-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <i className="fas fa-search text-2xl text-muted-foreground"></i>
                      </div>
                      <p className="text-muted-foreground font-medium">No se encontraron resultados</p>
                      <p className="text-sm text-muted-foreground text-center max-w-md">
                        Intenta buscar con otros términos o verifica la ortografía
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
