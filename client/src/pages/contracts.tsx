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
import { insertContractSchema, type Contract, type Contact, type Property, type Policy } from '@shared/schema';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Play, Download, Upload } from 'lucide-react';
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

const formSchema = insertContractSchema.omit({ tenantId: true }).extend({
  number: z.string().min(1, "El número es requerido"),
  propertyId: z.string().min(1, "La propiedad es requerida"),
  ownerContactId: z.string().min(1, "El propietario es requerido"),
  tenantContactId: z.string().min(1, "El inquilino es requerido"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
  rentAmount: z.string().min(1, "El monto de renta es requerido"),
  paymentDay: z.number().min(1).max(30),
  lateFeeValue: z.string().optional().or(z.literal('')),
  policyId: z.string().optional().or(z.literal('')),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: "La fecha de fin debe ser posterior a la fecha de inicio", path: ["endDate"] }
);

type FormData = z.infer<typeof formSchema>;

function ContractFormDialog({ 
  contract, 
  open, 
  onOpenChange 
}: { 
  contract?: Contract; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const { data: policies = [] } = useQuery<Policy[]>({
    queryKey: ['/api/policies'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: contract?.number || '',
      propertyId: contract?.propertyId || '',
      ownerContactId: contract?.ownerContactId || '',
      tenantContactId: contract?.tenantContactId || '',
      startDate: contract?.startDate || '',
      endDate: contract?.endDate || '',
      rentAmount: contract?.rentAmount || '',
      paymentDay: contract?.paymentDay || 1,
      lateFeeType: contract?.lateFeeType || 'none',
      lateFeeValue: contract?.lateFeeValue || '',
      status: contract?.status || 'draft',
      policyId: contract?.policyId || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest('POST', '/api/contracts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({ title: 'Contrato creado exitosamente' });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Error al crear contrato', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest('PATCH', `/api/contracts/${contract?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({ title: 'Contrato actualizado exitosamente' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error al actualizar contrato', variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    const cleanData = {
      ...data,
      policyId: data.policyId || undefined,
      lateFeeValue: data.lateFeeType === 'none' || !data.lateFeeValue ? undefined : data.lateFeeValue,
    };
    
    if (contract) {
      updateMutation.mutate(cleanData);
    } else {
      createMutation.mutate(cleanData);
    }
  };

  const owners = contacts.filter(c => c.roles?.includes('owner'));
  const tenants = contacts.filter(c => c.roles?.includes('tenant'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract ? 'Editar Contrato' : 'Nuevo Contrato'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Contrato *</FormLabel>
                    <FormControl>
                      <Input placeholder="CNT-001" {...field} data-testid="input-number" />
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
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="signed">Firmado</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="expiring">Por Vencer</SelectItem>
                        <SelectItem value="expired">Vencido</SelectItem>
                        <SelectItem value="closed">Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propiedad *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-property">
                        <SelectValue placeholder="Seleccionar propiedad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id}>
                          {prop.code} - {prop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ownerContactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propietario *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-owner">
                          <SelectValue placeholder="Seleccionar propietario" />
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

              <FormField
                control={form.control}
                name="tenantContactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inquilino *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tenant">
                          <SelectValue placeholder="Seleccionar inquilino" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="policyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Póliza de Seguro (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-policy">
                        <SelectValue placeholder="Sin póliza" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {policies.map((policy) => (
                        <SelectItem key={policy.id} value={policy.id}>
                          {policy.policyNumber} - {policy.status === 'active' ? 'Activa' : 'Expirada'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-startDate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Fin *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-endDate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto de Renta *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-rentAmount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Día de Pago *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="30" 
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                        data-testid="input-paymentDay" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lateFeeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Mora</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lateFeeType">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Ninguno</SelectItem>
                        <SelectItem value="percent">Porcentaje</SelectItem>
                        <SelectItem value="fixed">Fijo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lateFeeValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor de Mora</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-lateFeeValue" />
                    </FormControl>
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

export default function ContractsPage() {
  const { toast } = useToast();
  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
  });

  const [editingContract, setEditingContract] = useState<Contract | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteContract, setDeleteContract] = useState<Contract | undefined>();

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/contracts/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: 'Contrato activado',
        description: 'Las facturas han sido generadas exitosamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({ title: 'Contrato eliminado exitosamente' });
      setDeleteContract(undefined);
    },
    onError: () => {
      toast({ title: 'Error al eliminar contrato', variant: 'destructive' });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      return apiRequest('POST', '/api/import/contracts', { csvContent: text });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      if (response.errors.length > 0) {
        const errorList = response.errors.map((err: any) => 
          `Fila ${err.row}: ${err.error}`
        ).join('\n');
        toast({ 
          title: `Importación parcial: ${response.success}/${response.total} contratos importados`,
          description: errorList,
          variant: 'destructive',
        });
      } else {
        toast({ 
          title: `Importación exitosa: ${response.success} contratos importados`,
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
    window.location.href = '/api/templates/contracts.csv';
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
                <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
                <p className="text-muted-foreground mt-1">Gestiona los contratos de arrendamiento</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadTemplate} data-testid="button-download-template">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla
                </Button>
                <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()} disabled={importMutation.isPending} data-testid="button-import-csv">
                  <Upload className="w-4 h-4 mr-2" />
                  {importMutation.isPending ? 'Importando...' : 'Importar CSV'}
                </Button>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Contrato
                </Button>
              </div>
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
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Acciones</th>
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
                      contracts.map((contract) => (
                        <tr key={contract.id} className="hover:bg-muted/50" data-testid={`row-contract-${contract.id}`}>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium font-mono" data-testid={`text-number-${contract.id}`}>
                              {contract.number}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">Propiedad #{contract.propertyId.slice(0, 8)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">Contacto #{contract.tenantContactId.slice(0, 8)}</span>
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
                            <div className="flex items-center justify-end gap-2">
                              {contract.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => activateMutation.mutate(contract.id)}
                                  disabled={activateMutation.isPending}
                                  data-testid={`button-activate-${contract.id}`}
                                >
                                  <Play className="w-4 h-4 mr-1" />
                                  Activar
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingContract(contract)}
                                data-testid={`button-edit-${contract.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDeleteContract(contract)}
                                data-testid={`button-delete-${contract.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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

      <ContractFormDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
      />

      {editingContract && (
        <ContractFormDialog 
          contract={editingContract}
          open={!!editingContract} 
          onOpenChange={(open) => !open && setEditingContract(undefined)}
        />
      )}

      <AlertDialog open={!!deleteContract} onOpenChange={() => setDeleteContract(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el contrato{' '}
              <strong>{deleteContract?.number}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContract && deleteMutation.mutate(deleteContract.id)}
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
