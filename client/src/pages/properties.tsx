import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

export default function PropertiesPage() {
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['/api/properties'],
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
              <h1 className="text-3xl font-bold tracking-tight">Propiedades</h1>
              <p className="text-muted-foreground mt-1">Administra tu portafolio de propiedades</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No hay propiedades registradas</p>
                </div>
              ) : (
                properties.map((property: any) => (
                  <div key={property.id} className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-200">
                      <div className="absolute top-3 right-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            property.status === 'rented'
                              ? 'bg-success text-success-foreground'
                              : property.status === 'available'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-warning text-warning-foreground'
                          }`}
                        >
                          {property.status === 'rented'
                            ? 'Arrendada'
                            : property.status === 'available'
                            ? 'Disponible'
                            : property.status}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold">
                          {property.code}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold text-lg mb-1">{property.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{property.address}</p>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Canon mensual</span>
                          <span className="font-semibold">
                            ${parseFloat(property.listRent || 0).toLocaleString('es-CO')}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Propietario</span>
                          <span>{property.owner?.fullName || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
