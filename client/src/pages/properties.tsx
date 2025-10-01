import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertPropertySchema, type Property, type Contact } from '@shared/schema';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formSchema = insertPropertySchema.omit({ tenantId: true }).extend({
  code: z.string().min(1, "El código es requerido"),
  name: z.string().min(1, "El nombre es requerido"),
  address: z.string().optional().or(z.literal('')),
  type: z.string().optional().or(z.literal('')),
  listRent: z.string().optional().or(z.literal('')),
  ownerContactId: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

function PropertyFormDialog({ 
  property, 
  open, 
  onOpenChange 
}: { 
  property?: Property; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const owners = contacts.filter(c => c.roles?.includes('owner'));

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: property?.code || '',
      name: property?.name || '',
      address: property?.address || '',
      stratum: property?.stratum || undefined,
      type: property?.type || '',
      status: property?.status || 'available',
      ownerContactId: property?.ownerContactId || '',
      listRent: property?.listRent || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = {
        ...data,
        address: data.address || undefined,
        type: data.type || undefined,
        listRent: data.listRent || undefined,
        ownerContactId: data.ownerContactId || undefined,
      };
      return apiRequest('POST', '/api/properties', cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({ title: 'Propiedad creada exitosamente' });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: error.message.includes('limit') ? 'Límite de propiedades alcanzado' : 'Error al crear propiedad',
        description: error.message.includes('limit') ? 'Actualiza tu plan para agregar más propiedades' : undefined,
        variant: 'destructive' 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = {
        ...data,
        address: data.address || undefined,
        type: data.type || undefined,
        listRent: data.listRent || undefined,
        ownerContactId: data.ownerContactId || undefined,
      };
      return apiRequest('PATCH', `/api/properties/${property?.id}`, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({ title: 'Propiedad actualizada exitosamente' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error al actualizar propiedad', variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    if (property) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{property ? 'Editar Propiedad' : 'Nueva Propiedad'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input placeholder="P-001" {...field} data-testid="input-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="rented">Arrendada</SelectItem>
                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                        <SelectItem value="reserved">Reservada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stratum"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estrato</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-stratum"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Input placeholder="Apartamento, Casa, etc." {...field} data-testid="input-type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="listRent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canon Mensual</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-listRent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerContactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propietario</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-owner">
                          <SelectValue placeholder="Seleccionar propietario (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {owners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function PropertiesPage() {
  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });
  const { toast } = useToast();
  const [editingProperty, setEditingProperty] = useState<Property | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteProperty, setDeleteProperty] = useState<Property | undefined>();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({ title: 'Propiedad eliminada exitosamente' });
      setDeleteProperty(undefined);
    },
    onError: () => {
      toast({ title: 'Error al eliminar propiedad', variant: 'destructive' });
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
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Propiedades</h1>
                <p className="text-muted-foreground mt-1">Administra tu portafolio de propiedades</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Propiedad
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No hay propiedades registradas</p>
                </div>
              ) : (
                properties.map((property) => (
                  <div 
                    key={property.id} 
                    className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    data-testid={`card-property-${property.id}`}
                  >
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
                      <h3 className="font-semibold text-lg mb-1" data-testid={`text-name-${property.id}`}>{property.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{property.address}</p>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Canon mensual</span>
                          <span className="font-semibold">
                            ${parseFloat(property.listRent || '0').toLocaleString('es-CO')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingProperty(property)}
                          data-testid={`button-edit-${property.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setDeleteProperty(property)}
                          data-testid={`button-delete-${property.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      <PropertyFormDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
      />

      {editingProperty && (
        <PropertyFormDialog 
          property={editingProperty}
          open={!!editingProperty} 
          onOpenChange={(open) => !open && setEditingProperty(undefined)}
        />
      )}

      <AlertDialog open={!!deleteProperty} onOpenChange={() => setDeleteProperty(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la propiedad{' '}
              <strong>{deleteProperty?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProperty && deleteMutation.mutate(deleteProperty.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
