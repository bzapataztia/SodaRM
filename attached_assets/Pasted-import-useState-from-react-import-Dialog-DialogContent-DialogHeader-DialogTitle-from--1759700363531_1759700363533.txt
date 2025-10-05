import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { X } from "lucide-react";

interface RegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterPaymentModal({ open, onOpenChange }: RegisterPaymentModalProps) {
  const [formData, setFormData] = useState({
    invoice: "",
    amount: "",
    paymentMethod: "",
    paymentDate: "",
    transactionRef: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Registering payment:", formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      invoice: "",
      amount: "",
      paymentMethod: "",
      paymentDate: "",
      transactionRef: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Registrar Pago</DialogTitle>
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

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="invoice" className="text-sm text-gray-700">
              Factura *
            </Label>
            <Select value={formData.invoice} onValueChange={(value) => setFormData(prev => ({ ...prev, invoice: value }))}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0">
                <SelectValue placeholder="Seleccionar factura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fac-802">FAC-802 - $7.600.000</SelectItem>
                <SelectItem value="cnt-001-698877">CNT-001-OCR-698877 - $4.423.243</SelectItem>
                <SelectItem value="cnt-001-218968">CNT-001-OCR-218968 - $4.423.243</SelectItem>
                <SelectItem value="cnt-001-001">CNT-001-001 - $5.600.000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm text-gray-700">
              Monto Recibido *
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="7,600,000"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod" className="text-sm text-gray-700">
              Método de Pago *
            </Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0">
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transferencia Bancaria</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="card">Tarjeta de Crédito/Débito</SelectItem>
                <SelectItem value="pse">PSE</SelectItem>
                <SelectItem value="nequi">Nequi</SelectItem>
                <SelectItem value="daviplata">Daviplata</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate" className="text-sm text-gray-700">
              Fecha de Pago *
            </Label>
            <Input
              id="paymentDate"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionRef" className="text-sm text-gray-700">
              Referencia de Transacción
            </Label>
            <Input
              id="transactionRef"
              placeholder="TXN123456789"
              value={formData.transactionRef}
              onChange={(e) => setFormData(prev => ({ ...prev, transactionRef: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="px-6"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              className="px-6 bg-blue-600 hover:bg-blue-700"
            >
              Registrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}