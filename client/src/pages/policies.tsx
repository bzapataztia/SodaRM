import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertPolicySchema, type Policy, type Insurer } from '@shared/schema';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
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

const formSchema = insertPolicySchema.omit({ tenantId: true }).extend({
  policyNumber: z.string().min(1, "El número de póliza es requerido"),
  insurerId: z.string().min(1, "La aseguradora es requerida"),
  coverageType: z.string().optional().or(z.literal('')),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
});

type FormData = z.infer<typeof formSchema>;

function PolicyFormDialog({ 
  policy, 
  open, 
  onOpenChange,
  insurers = []
}: { 
  policy?: Policy; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  insurers: Insurer[];
}) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      policyNumber: policy?.policyNumber || '',
      insurerId: policy?.insurerId || '',
      coverageType: policy?.coverageType || '',
      startDate: policy?.startDate || '',
      endDate: policy?.endDate || '',
    },
  });

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
                    <Input placeholder="Ej: POL-2025-001" {...field} data-testid="input-policyNumber" />
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
                    <Input placeholder="Ej: Responsabilidad Civil, Todo Riesgo" {...field} data-testid="input-coverageType" />
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

function getStatusBadge(policy: Policy) {
  const today = new Date();
  const endDate = parseISO(policy.endDate);
  const daysUntilExpiration = differenceInDays(endDate, today);

  if (daysUntilExpiration < 0) {
    return <Badge variant="destructive" data-testid={`badge-status-${policy.id}`}>Expirada</Badge>;
  } else if (daysUntilExpiration < 30) {
    return <Badge className="bg-yellow-500 hover:bg-yellow-600" data-testid={`badge-status-${policy.id}`}>Por Vencer ({daysUntilExpiration}d)</Badge>;
  } else {
    return <Badge className="bg-green-500 hover:bg-green-600" data-testid={`badge-status-${policy.id}`}>Activa</Badge>;
  }
}

export default function PoliciesPage() {
  const { toast } = useToast();
  const { data: policies = [], isLoading: isLoadingPolicies } = useQuery<Policy[]>({
    queryKey: ['/api/policies'],
  });

  const { data: insurers = [], isLoading: isLoadingInsurers } = useQuery<Insurer[]>({
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

  const getInsurerName = (insurerId: string) => {
    const insurer = insurers.find(i => i.id === insurerId);
    return insurer?.name || 'N/A';
  };

  if (isLoadingPolicies || isLoadingInsurers) {
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Número de Póliza</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Aseguradora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo de Cobertura</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Período</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {policies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                          No hay pólizas registradas
                        </td>
                      </tr>
                    ) : (
                      policies.map((policy) => (
                        <tr key={policy.id} className="hover:bg-muted/50" data-testid={`row-policy-${policy.id}`}>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium" data-testid={`text-policyNumber-${policy.id}`}>
                              {policy.policyNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm" data-testid={`text-insurerName-${policy.id}`}>
                              {getInsurerName(policy.insurerId)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm" data-testid={`text-coverageType-${policy.id}`}>
                              {policy.coverageType || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm" data-testid={`text-period-${policy.id}`}>
                              {format(parseISO(policy.startDate), 'dd/MM/yyyy')} - {format(parseISO(policy.endDate), 'dd/MM/yyyy')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(policy)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingPolicy(policy)}
                                data-testid={`button-edit-${policy.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDeletePolicy(policy)}
                                data-testid={`button-delete-${policy.id}`}
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

      <PolicyFormDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        insurers={insurers}
      />

      {editingPolicy && (
        <PolicyFormDialog 
          policy={editingPolicy}
          open={!!editingPolicy} 
          onOpenChange={(open) => !open && setEditingPolicy(undefined)}
          insurers={insurers}
        />
      )}

      <AlertDialog open={!!deletePolicy} onOpenChange={() => setDeletePolicy(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la póliza{' '}
              <strong>{deletePolicy?.policyNumber}</strong>.
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
