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
import { Plus, Pencil, Trash2, Download, Upload, X, Image } from 'lucide-react';
import { ObjectUploader } from '@/components/ObjectUploader';
import type { PropertyPhoto } from '@shared/schema';
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">{property ? 'Editar Propiedad' : 'Nueva Propiedad'}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 p-0 rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-6 space-y-5">
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

            <div className="flex justify-end space-x-3 pt-4">
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

function PhotoGalleryDialog({ 
  property, 
  open, 
  onOpenChange 
}: { 
  property?: Property; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const { data: photos = [], isLoading } = useQuery<PropertyPhoto[]>({
    queryKey: ['/api/properties', property?.id, 'photos'],
    enabled: !!property?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => apiRequest('DELETE', `/api/property-photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property?.id, 'photos'] });
      toast({ title: 'Foto eliminada exitosamente' });
    },
    onError: () => {
      toast({ title: 'Error al eliminar foto', variant: 'destructive' });
    },
  });

  const handleUploadComplete = async (objectPath: string) => {
    try {
      setIsUploading(true);
      await apiRequest('POST', `/api/properties/${property?.id}/photos`, {
        objectPath,
        caption: null,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property?.id, 'photos'] });
      toast({ title: 'Foto subida exitosamente' });
    } catch (error) {
      toast({ 
        title: error instanceof Error ? error.message : 'Error al subir foto', 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fotos de {property?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {photos.length < 10 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Subir Nueva Foto</h3>
              <ObjectUploader 
                onUploadComplete={handleUploadComplete}
                onUploadError={(error) => {
                  toast({ title: 'Error al subir foto', description: error.message, variant: 'destructive' });
                }}
              />
              {isUploading && (
                <div className="mt-2 text-sm text-muted-foreground">Guardando...</div>
              )}
            </div>
          )}

          {photos.length >= 10 && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Se ha alcanzado el límite máximo de 10 fotos por propiedad
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium mb-3">Galería ({photos.length}/10)</h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay fotos</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img 
                      src={photo.objectPath} 
                      alt={photo.caption || 'Foto de propiedad'} 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMutation.mutate(photo.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
  const [photoGalleryProperty, setPhotoGalleryProperty] = useState<Property | undefined>();

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

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      return apiRequest('POST', '/api/import/properties', { csvContent: text });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      if (response.errors.length > 0) {
        const errorList = response.errors.map((err: any) => 
          `Fila ${err.row}: ${err.error}`
        ).join('\n');
        toast({ 
          title: `Importación parcial: ${response.success}/${response.total} propiedades importadas`,
          description: errorList,
          variant: 'destructive',
        });
      } else {
        toast({ 
          title: `Importación exitosa: ${response.success} propiedades importadas`,
        });
      }
    },
    onError: () => {
      toast({ title: 'Error al importar CSV', variant: 'destructive' });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      e.target.value = '';
    }
  };

  const downloadTemplate = () => {
    window.location.href = '/api/templates/properties.csv';
  };

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
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadTemplate} data-testid="button-download-template">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla
                </Button>
                <Button variant="outline" onClick={() => document.getElementById('csv-upload-properties')?.click()} disabled={importMutation.isPending} data-testid="button-import-csv">
                  <Upload className="w-4 h-4 mr-2" />
                  {importMutation.isPending ? 'Importando...' : 'Importar CSV'}
                </Button>
                <input
                  id="csv-upload-properties"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Propiedad
                </Button>
              </div>
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
                          onClick={() => setPhotoGalleryProperty(property)}
                          data-testid={`button-photos-${property.id}`}
                        >
                          <Image className="w-4 h-4 mr-1" />
                          Fotos
                        </Button>
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

      {photoGalleryProperty && (
        <PhotoGalleryDialog 
          property={photoGalleryProperty}
          open={!!photoGalleryProperty} 
          onOpenChange={(open) => !open && setPhotoGalleryProperty(undefined)}
        />
      )}
    </div>
  );
}
