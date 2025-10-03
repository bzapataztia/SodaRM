import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertPolicySchema, type Policy, type Insurer } from '@shared/schema';
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
import { format } from 'date-fns';

const formSchema = insertPolicySchema.omit({ tenantId: true, contractId: true }).extend({
  policyNumber: z.string().min(1, "El número de póliza es requerido"),
  insurerId: z.string().min(1, "La aseguradora es requerida"),
  coverageType: z.string().optional().or(z.literal('')),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
  status: z.enum(['active', 'expired']),
});

type FormData = z.infer<typeof formSchema>;

interface PolicyWithInsurer extends Policy {
  insurer?: Insurer;
}

function PolicyFormDialog({ 
  policy, 
  open, 
  onOpenChange 
}: { 
  policy?: Policy; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { data: insurers = [] } = useQuery<Insurer[]>({
    queryKey: ['/api/insurers'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      policyNumber: policy?.policyNumber || '',
      insurerId: policy?.insurerId || '',
      coverageType: policy?.coverageType || '',
      startDate: policy?.startDate || '',
      endDate: policy?.endDate || '',
      status: policy?.status || 'active',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        policyNumber: policy?.policyNumber || '',
        insurerId: policy?.insurerId || '',
        coverageType: policy?.coverageType || '',
        startDate: policy?.startDate || '',
        endDate: policy?.endDate || '',
        status: policy?.status || 'active',
      });
    }
  }, [policy, open, form]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = {
        ...data,
        coverageType: data.coverageType || undefined,
      };
      return apiRequest('POST', '/api/policies', cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/policies'] });
      toast({ title: 'Póliza creada exitosamente' });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Error al crear póliza', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = {
        ...data,
        coverageType: data.coverageType || undefined,
      };
      return apiRequest('PATCH', `/api/policies/${policy?.id}`, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/policies'] });
      toast({ title: 'Póliza actualizada exitosamente' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error al actualizar póliza', variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    if (policy) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{policy ? 'Editar Póliza' : 'Nueva Póliza'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="policyNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Póliza *</FormLabel>
                  <FormControl>
                    <Input placeholder="POL-12345" {...field} data-testid="input-policyNumber" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="insurerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aseguradora *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-insurerId">
                        <SelectValue placeholder="Seleccionar aseguradora" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {insurers.map((insurer) => (
                        <SelectItem key={insurer.id} value={insurer.id}>
                          {insurer.name}
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
              name="coverageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Cobertura</FormLabel>
                  <FormControl>
                    <Input placeholder="Todo riesgo, incendio, etc." {...field} data-testid="input-coverageType" />
                  </FormControl>
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="expired">Expirada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending || updateMutation.isPending 
                  ? 'Guardando...' 
                  : policy ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function PoliciesPage() {
  const { toast } = useToast();
  const { data: policies = [], isLoading } = useQuery<PolicyWithInsurer[]>({
    queryKey: ['/api/policies'],
  });

  const { data: insurers = [] } = useQuery<Insurer[]>({
    queryKey: ['/api/insurers'],
  });

  const [editingPolicy, setEditingPolicy] = useState<Policy | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletePolicy, setDeletePolicy] = useState<Policy | undefined>();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/policies'] });
      toast({ title: 'Póliza eliminada exitosamente' });
      setDeletePolicy(undefined);
    },
    onError: () => {
      toast({ title: 'Error al eliminar póliza', variant: 'destructive' });
    },
  });

  const policiesWithInsurer = policies.map(policy => ({
    ...policy,
    insurer: insurers.find(i => i.id === policy.insurerId),
  }));

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
                <h1 className="text-3xl font-bold tracking-tight">Pólizas</h1>
                <p className="text-muted-foreground mt-1">Gestiona las pólizas de seguro</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Póliza
              </Button>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Número</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Aseguradora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo de Cobertura</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vigencia</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {policiesWithInsurer.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                          No hay pólizas registradas. Crea una nueva póliza para comenzar.
                        </td>
                      </tr>
                    ) : (
                      policiesWithInsurer.map((policy) => (
                        <tr key={policy.id} className="hover:bg-muted/50" data-testid={`row-policy-${policy.id}`}>
                          <td className="px-6 py-4 text-sm font-medium" data-testid={`text-policyNumber-${policy.id}`}>
                            {policy.policyNumber}
                          </td>
                          <td className="px-6 py-4 text-sm" data-testid={`text-insurer-${policy.id}`}>
                            {policy.insurer?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm" data-testid={`text-coverageType-${policy.id}`}>
                            {policy.coverageType || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm" data-testid={`text-validity-${policy.id}`}>
                            {format(new Date(policy.startDate), 'dd/MM/yyyy')} - {format(new Date(policy.endDate), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span 
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                policy.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                              data-testid={`badge-status-${policy.id}`}
                            >
                              {policy.status === 'active' ? 'Activa' : 'Expirada'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingPolicy(policy)}
                              data-testid={`button-edit-${policy.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletePolicy(policy)}
                              data-testid={`button-delete-${policy.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
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

      <PolicyFormDialog 
        policy={editingPolicy} 
        open={!!editingPolicy || isCreateOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingPolicy(undefined);
            setIsCreateOpen(false);
          }
        }} 
      />

      <AlertDialog open={!!deletePolicy} onOpenChange={() => setDeletePolicy(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar póliza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La póliza será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePolicy && deleteMutation.mutate(deletePolicy.id)}
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
