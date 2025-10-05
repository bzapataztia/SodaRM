import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertInsurerSchema, type Insurer } from '@shared/schema';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, FileText, X } from 'lucide-react';
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

const formSchema = insertInsurerSchema.omit({ tenantId: true }).extend({
  name: z.string().min(1, "El nombre es requerido"),
  emailReports: z.string().optional().or(z.literal('')),
  policyType: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

function InsurerFormDialog({ 
  insurer, 
  open, 
  onOpenChange 
}: { 
  insurer?: Insurer; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: insurer?.name || '',
      emailReports: insurer?.emailReports || '',
      policyType: insurer?.policyType || '',
      notes: insurer?.notes || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = {
        ...data,
        emailReports: data.emailReports || undefined,
        policyType: data.policyType || undefined,
        notes: data.notes || undefined,
      };
      return apiRequest('POST', '/api/insurers', cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/insurers'] });
      toast({ title: 'Aseguradora creada exitosamente' });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Error al crear aseguradora', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = {
        ...data,
        emailReports: data.emailReports || undefined,
        policyType: data.policyType || undefined,
        notes: data.notes || undefined,
      };
      return apiRequest('PATCH', `/api/insurers/${insurer?.id}`, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/insurers'] });
      toast({ title: 'Aseguradora actualizada exitosamente' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error al actualizar aseguradora', variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    if (insurer) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">{insurer ? 'Editar Aseguradora' : 'Nueva Aseguradora'}</DialogTitle>
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la aseguradora" {...field} data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emailReports"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email para Reportes</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="reportes@aseguradora.com" {...field} data-testid="input-emailReports" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="policyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Póliza</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-policyType">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="collective">Colectiva</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales..." {...field} data-testid="input-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

export default function InsurersPage() {
  const { toast } = useToast();
  const { data: insurers = [], isLoading } = useQuery<Insurer[]>({
    queryKey: ['/api/insurers'],
  });

  const [editingInsurer, setEditingInsurer] = useState<Insurer | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteInsurer, setDeleteInsurer] = useState<Insurer | undefined>();
  const [reportInsurer, setReportInsurer] = useState<Insurer | undefined>();

  const { data: overdueReport = [], isLoading: isLoadingReport } = useQuery<any[]>({
    queryKey: ['/api/insurers', reportInsurer?.id, 'overdue-policies-report'],
    queryFn: () => reportInsurer 
      ? fetch(`/api/insurers/${reportInsurer.id}/overdue-policies-report`).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!reportInsurer,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/insurers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/insurers'] });
      toast({ title: 'Aseguradora eliminada exitosamente' });
      setDeleteInsurer(undefined);
    },
    onError: () => {
      toast({ title: 'Error al eliminar aseguradora', variant: 'destructive' });
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
                <h1 className="text-3xl font-bold tracking-tight">Aseguradoras</h1>
                <p className="text-muted-foreground mt-1">Gestiona las aseguradoras y sus reportes</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Aseguradora
              </Button>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email Reportes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo de Póliza</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {insurers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                          No hay aseguradoras registradas
                        </td>
                      </tr>
                    ) : (
                      insurers.map((insurer) => (
                        <tr key={insurer.id} className="hover:bg-muted/50" data-testid={`row-insurer-${insurer.id}`}>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium">{insurer.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{insurer.emailReports || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm capitalize">
                              {insurer.policyType === 'collective' ? 'Colectiva' : insurer.policyType === 'individual' ? 'Individual' : 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setReportInsurer(insurer)}
                                data-testid={`button-report-${insurer.id}`}
                                title="Ver reporte de facturas vencidas"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingInsurer(insurer)}
                                data-testid={`button-edit-${insurer.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDeleteInsurer(insurer)}
                                data-testid={`button-delete-${insurer.id}`}
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

      <InsurerFormDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
      />

      {editingInsurer && (
        <InsurerFormDialog 
          insurer={editingInsurer}
          open={!!editingInsurer} 
          onOpenChange={(open) => !open && setEditingInsurer(undefined)}
        />
      )}

      <AlertDialog open={!!deleteInsurer} onOpenChange={() => setDeleteInsurer(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la aseguradora{' '}
              <strong>{deleteInsurer?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteInsurer && deleteMutation.mutate(deleteInsurer.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!reportInsurer} onOpenChange={(open) => !open && setReportInsurer(undefined)}>
        <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">
                Reporte de Facturas Vencidas - {reportInsurer?.name}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReportInsurer(undefined)}
                className="h-6 w-6 p-0 rounded-full hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="px-6 py-6">
            {isLoadingReport ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : overdueReport.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay pólizas con facturas vencidas para esta aseguradora.
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Póliza</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Contrato</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Factura</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fecha Venc.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Pagado</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Pendiente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {overdueReport.map((item: any, index: number) => {
                        const pending = parseFloat(item.invoiceTotal) - parseFloat(item.invoiceAmountPaid);
                        return (
                          <tr key={index} className="hover:bg-muted/50" data-testid={`row-report-${index}`}>
                            <td className="px-4 py-3 text-sm">
                              <div>
                                <div className="font-medium">{item.policyNumber}</div>
                                <div className="text-xs text-muted-foreground">{item.coverageType || 'N/A'}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">{item.contractNumber}</td>
                            <td className="px-4 py-3 text-sm">{item.invoiceNumber}</td>
                            <td className="px-4 py-3 text-sm">{new Date(item.invoiceDueDate).toLocaleDateString('es-ES')}</td>
                            <td className="px-4 py-3 text-sm text-right">${parseFloat(item.invoiceTotal).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right">${parseFloat(item.invoiceAmountPaid).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-red-600">${pending.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
