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
import { insertPaymentSchema, type Payment, type Invoice } from '@shared/schema';
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

const formSchema = insertPaymentSchema.omit({ tenantId: true }).extend({
  invoiceId: z.string().min(1, "La factura es requerida"),
  amount: z.string().min(1, "El monto es requerido"),
  paymentDate: z.string().min(1, "La fecha de pago es requerida"),
  method: z.string().min(1, "El método de pago es requerido"),
  receiptUrl: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

function PaymentFormDialog({ 
  payment, 
  open, 
  onOpenChange 
}: { 
  payment?: Payment; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceId: payment?.invoiceId || '',
      amount: payment?.amount || '',
      paymentDate: payment?.paymentDate || '',
      method: payment?.method || '',
      receiptUrl: payment?.receiptUrl || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = {
        ...data,
        receiptUrl: data.receiptUrl || undefined,
      };
      return apiRequest('POST', '/api/payments', cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: 'Pago registrado exitosamente' });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Error al registrar pago', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = {
        ...data,
        receiptUrl: data.receiptUrl || undefined,
      };
      return apiRequest('PATCH', `/api/payments/${payment?.id}`, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: 'Pago actualizado exitosamente' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error al actualizar pago', variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    if (payment) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{payment ? 'Editar Pago' : 'Registrar Pago'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="invoiceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Factura *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-invoice">
                        <SelectValue placeholder="Seleccionar factura" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.number} - ${parseFloat(invoice.totalAmount).toLocaleString('es-CO')}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Pago *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-paymentDate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pago *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-method">
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Recibo (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} data-testid="input-receiptUrl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

export default function PaymentsPage() {
  const { toast } = useToast();
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ['/api/payments'],
  });

  const [editingPayment, setEditingPayment] = useState<Payment | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletePayment, setDeletePayment] = useState<Payment | undefined>();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: 'Pago eliminado exitosamente' });
      setDeletePayment(undefined);
    },
    onError: () => {
      toast({ title: 'Error al eliminar pago', variant: 'destructive' });
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
                <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>
                <p className="text-muted-foreground mt-1">Historial de pagos recibidos</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create">
                <Plus className="w-4 h-4 mr-2" />
                Registrar Pago
              </Button>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Factura</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Método</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Monto</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          No hay pagos registrados
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-muted/50" data-testid={`row-payment-${payment.id}`}>
                          <td className="px-6 py-4">
                            <span className="text-sm">{new Date(payment.paymentDate).toLocaleDateString('es-ES')}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono">Factura #{payment.invoiceId.slice(0, 8)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm capitalize">{payment.method}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-success font-mono">
                              {formatCurrency(parseFloat(payment.amount))}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingPayment(payment)}
                                data-testid={`button-edit-${payment.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDeletePayment(payment)}
                                data-testid={`button-delete-${payment.id}`}
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

      <PaymentFormDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
      />

      {editingPayment && (
        <PaymentFormDialog 
          payment={editingPayment}
          open={!!editingPayment} 
          onOpenChange={(open) => !open && setEditingPayment(undefined)}
        />
      )}

      <AlertDialog open={!!deletePayment} onOpenChange={() => setDeletePayment(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el pago de{' '}
              <strong>${parseFloat(deletePayment?.amount || '0').toLocaleString('es-CO')}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePayment && deleteMutation.mutate(deletePayment.id)}
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
