import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertInvoiceSchema, type Invoice, type Contract, type Contact } from '@shared/schema';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
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

const formSchema = insertInvoiceSchema.omit({ tenantId: true }).extend({
  number: z.string().min(1, "El número es requerido"),
  contractId: z.string().min(1, "El contrato es requerido"),
  tenantContactId: z.string().min(1, "El inquilino es requerido"),
  issueDate: z.string().min(1, "La fecha de emisión es requerida"),
  dueDate: z.string().min(1, "La fecha de vencimiento es requerida"),
  subtotal: z.string().min(1, "El subtotal es requerido"),
  tax: z.string().optional().or(z.literal('')),
  otherCharges: z.string().optional().or(z.literal('')),
  lateFee: z.string().optional().or(z.literal('')),
  totalAmount: z.string().min(1, "El total es requerido"),
  amountPaid: z.string().optional().or(z.literal('')),
}).refine(
  (data) => new Date(data.dueDate) >= new Date(data.issueDate),
  { message: "La fecha de vencimiento debe ser posterior a la fecha de emisión", path: ["dueDate"] }
);

type FormData = z.infer<typeof formSchema>;

function InvoiceFormDialog({ 
  invoice, 
  open, 
  onOpenChange 
}: { 
  invoice?: Invoice; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: invoice?.number || '',
      contractId: invoice?.contractId || '',
      tenantContactId: invoice?.tenantContactId || '',
      issueDate: invoice?.issueDate || '',
      dueDate: invoice?.dueDate || '',
      subtotal: invoice?.subtotal || '',
      tax: invoice?.tax || '',
      otherCharges: invoice?.otherCharges || '',
      lateFee: invoice?.lateFee || '',
      totalAmount: invoice?.totalAmount || '',
      amountPaid: invoice?.amountPaid || '',
      status: invoice?.status || 'draft',
    },
  });

  const subtotal = parseFloat(form.watch('subtotal') || '0') || 0;
  const tax = parseFloat(form.watch('tax') || '0') || 0;
  const otherCharges = parseFloat(form.watch('otherCharges') || '0') || 0;
  const lateFee = parseFloat(form.watch('lateFee') || '0') || 0;

  useEffect(() => {
    const total = subtotal + tax + otherCharges + lateFee;
    form.setValue('totalAmount', total.toString());
  }, [subtotal, tax, otherCharges, lateFee, form]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = {
        ...data,
        subtotal: Math.abs(parseFloat(data.subtotal || '0')).toString(),
        tax: Math.abs(parseFloat(data.tax || '0')).toString(),
        otherCharges: Math.abs(parseFloat(data.otherCharges || '0')).toString(),
        lateFee: Math.abs(parseFloat(data.lateFee || '0')).toString(),
        totalAmount: Math.abs(parseFloat(data.totalAmount || '0')).toString(),
        amountPaid: Math.abs(parseFloat(data.amountPaid || '0')).toString(),
      };
      return apiRequest('POST', '/api/invoices', cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: 'Factura creada exitosamente' });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Error al crear factura', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = {
        ...data,
        subtotal: Math.abs(parseFloat(data.subtotal || '0')).toString(),
        tax: Math.abs(parseFloat(data.tax || '0')).toString(),
        otherCharges: Math.abs(parseFloat(data.otherCharges || '0')).toString(),
        lateFee: Math.abs(parseFloat(data.lateFee || '0')).toString(),
        totalAmount: Math.abs(parseFloat(data.totalAmount || '0')).toString(),
        amountPaid: Math.abs(parseFloat(data.amountPaid || '0')).toString(),
      };
      return apiRequest('PATCH', `/api/invoices/${invoice?.id}`, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: 'Factura actualizada exitosamente' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error al actualizar factura', variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    if (invoice) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const tenants = contacts.filter(c => c.roles?.includes('tenant'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? 'Editar Factura' : 'Nueva Factura'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Factura *</FormLabel>
                    <FormControl>
                      <Input placeholder="FAC-001" {...field} data-testid="input-number" />
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
                        <SelectItem value="issued">Emitida</SelectItem>
                        <SelectItem value="partial">Parcial</SelectItem>
                        <SelectItem value="paid">Pagada</SelectItem>
                        <SelectItem value="overdue">Vencida</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contrato *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-contract">
                        <SelectValue placeholder="Seleccionar contrato" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.number}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Emisión *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-issueDate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Vencimiento *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-dueDate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subtotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtotal *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-subtotal" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impuesto</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-tax" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="otherCharges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Otros Cargos</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-otherCharges" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lateFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mora</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-lateFee" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} readOnly className="bg-muted" data-testid="input-totalAmount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Pagado</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-amountPaid" />
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

export default function InvoicesPage() {
  const { toast } = useToast();
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | undefined>();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: 'Factura eliminada exitosamente' });
      setDeleteInvoice(undefined);
    },
    onError: () => {
      toast({ title: 'Error al eliminar factura', variant: 'destructive' });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
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
                <h1 className="text-3xl font-bold tracking-tight">Facturas</h1>
                <p className="text-muted-foreground mt-1">Gestiona las facturas de arrendamiento</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Factura
              </Button>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Número</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Inquilino</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vencimiento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Pagado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                          No hay facturas registradas
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-muted/50" data-testid={`row-invoice-${invoice.id}`}>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium font-mono" data-testid={`text-number-${invoice.id}`}>
                              {invoice.number}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">Contacto #{invoice.tenantContactId.slice(0, 8)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{new Date(invoice.dueDate).toLocaleDateString('es-ES')}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold font-mono">
                              {formatCurrency(parseFloat(invoice.totalAmount))}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono text-success">
                              {formatCurrency(parseFloat(invoice.amountPaid))}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                invoice.status === 'paid'
                                  ? 'bg-success/10 text-success'
                                  : invoice.status === 'overdue'
                                  ? 'bg-destructive/10 text-destructive'
                                  : invoice.status === 'partial'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-warning/10 text-warning'
                              }`}
                            >
                              {invoice.status === 'paid'
                                ? 'Pagada'
                                : invoice.status === 'overdue'
                                ? 'Vencida'
                                : invoice.status === 'partial'
                                ? 'Parcial'
                                : 'Emitida'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/invoices/${invoice.id}`}>
                                <Button variant="ghost" size="sm" data-testid={`button-view-${invoice.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingInvoice(invoice)}
                                data-testid={`button-edit-${invoice.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDeleteInvoice(invoice)}
                                data-testid={`button-delete-${invoice.id}`}
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

      <InvoiceFormDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
      />

      {editingInvoice && (
        <InvoiceFormDialog 
          invoice={editingInvoice}
          open={!!editingInvoice} 
          onOpenChange={(open) => !open && setEditingInvoice(undefined)}
        />
      )}

      <AlertDialog open={!!deleteInvoice} onOpenChange={() => setDeleteInvoice(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la factura{' '}
              <strong>{deleteInvoice?.number}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteInvoice && deleteMutation.mutate(deleteInvoice.id)}
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
