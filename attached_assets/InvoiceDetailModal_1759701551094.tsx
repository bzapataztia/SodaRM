import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { 
  FileText, 
  Download, 
  Send, 
  Edit, 
  Eye, 
  Calendar, 
  User, 
  Building, 
  DollarSign,
  Clock,
  CheckCircle
} from "lucide-react";

interface InvoiceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: {
    number: string;
    tenant: string;
    property: string;
    amount: string;
    status: string;
    dueDate: string;
    issueDate: string;
    period: string;
    description: string;
  };
}

export function InvoiceDetailModal({ open, onOpenChange, invoice }: InvoiceDetailModalProps) {
  if (!invoice) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Pagada</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Enviada</Badge>;
      case "overdue":
        return <Badge variant="destructive">Vencida</Badge>;
      default:
        return <Badge variant="secondary">Borrador</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "sent":
        return <Send className="h-4 w-4 text-blue-600" />;
      case "overdue":
        return <Clock className="h-4 w-4 text-red-600" />;
      default:
        return <Edit className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-purple-100 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <DialogTitle>Detalle de Factura</DialogTitle>
                <DialogDescription>
                  Información completa de la factura {invoice.number}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(invoice.status)}
              {getStatusBadge(invoice.status)}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header con información principal */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>{invoice.number}</span>
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Período: {invoice.period}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{invoice.amount}</div>
                  <p className="text-sm text-gray-500">Monto Total</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Información del inquilino y propiedad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <User className="h-4 w-4" />
                  <span>Inquilino</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{invoice.tenant}</p>
                  <p className="text-sm text-gray-500">juan.gonzalez@email.com</p>
                  <p className="text-sm text-gray-500">+57 300 123 4567</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Documento</p>
                  <p className="text-sm">CC 12.345.678</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Building className="h-4 w-4" />
                  <span>Propiedad</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{invoice.property}</p>
                  <p className="text-sm text-gray-500">Calle 123 #45-67</p>
                  <p className="text-sm text-gray-500">El Poblado, Medellín</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Habitaciones</p>
                    <p>3</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Área</p>
                    <p>85 m²</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fechas importantes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Calendar className="h-4 w-4" />
                <span>Fechas Importantes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Fecha de Emisión</p>
                  <p className="font-medium">{invoice.issueDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha de Vencimiento</p>
                  <p className="font-medium">{invoice.dueDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Días para Vencimiento</p>
                  <p className="font-medium text-orange-600">5 días</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desglose de costos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <DollarSign className="h-4 w-4" />
                <span>Desglose de Costos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Alquiler mensual</span>
                  <span>$2.500.000</span>
                </div>
                <div className="flex justify-between">
                  <span>Administración</span>
                  <span>$450.000</span>
                </div>
                <div className="flex justify-between">
                  <span>Parqueadero</span>
                  <span>$150.000</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Servicios públicos (estimado)</span>
                  <span>$200.000</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{invoice.amount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Descripción adicional */}
          {invoice.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{invoice.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Historial de pagos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.status === "paid" ? (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Pago Registrado</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha de pago:</span>
                      <span>15 Dic 2024</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Método:</span>
                      <span>Transferencia bancaria</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Referencia:</span>
                      <span>TXN123456789</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay pagos registrados</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" className="flex-1 sm:flex-none">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none">
              <Send className="mr-2 h-4 w-4" />
              Reenviar
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none">
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
            <Button onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}