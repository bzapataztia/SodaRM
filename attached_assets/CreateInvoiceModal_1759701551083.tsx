import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { X } from "lucide-react";

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInvoiceModal({ open, onOpenChange }: CreateInvoiceModalProps) {
  const [formData, setFormData] = useState({
    tenant: "",
    property: "",
    period: "",
    amount: "",
    dueDate: "",
    description: "",
    type: "rent"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para crear la factura
    console.log("Creating invoice:", formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      tenant: "",
      property: "",
      period: "",
      amount: "",
      dueDate: "",
      description: "",
      type: "rent"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Nueva Factura</DialogTitle>
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
            <Label htmlFor="tenant" className="text-sm text-gray-700">
              Inquilino *
            </Label>
            <Select value={formData.tenant} onValueChange={(value) => setFormData(prev => ({ ...prev, tenant: value }))}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0">
                <SelectValue placeholder="Seleccionar inquilino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ismael">Ismael González</SelectItem>
                <SelectItem value="antonio">Antonio José</SelectItem>
                <SelectItem value="maria">María Rodriguez</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="property" className="text-sm text-gray-700">
              Propiedad *
            </Label>
            <Select value={formData.property} onValueChange={(value) => setFormData(prev => ({ ...prev, property: value }))}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0">
                <SelectValue placeholder="Seleccionar propiedad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apt101">Apartamento 101 - Zona Rosa</SelectItem>
                <SelectItem value="apt202">Apartamento 202 - El Poblado</SelectItem>
                <SelectItem value="house301">Casa 301 - Laureles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm text-gray-700">
              Tipo de Factura *
            </Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">Alquiler Mensual</SelectItem>
                <SelectItem value="utilities">Servicios Públicos</SelectItem>
                <SelectItem value="maintenance">Mantenimiento</SelectItem>
                <SelectItem value="other">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm text-gray-700">
              Monto Total *
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="2,500,000"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period" className="text-sm text-gray-700">
                Período *
              </Label>
              <Input
                id="period"
                placeholder="Enero 2025"
                value={formData.period}
                onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-sm text-gray-700">
                Fecha de Vencimiento *
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm text-gray-700">
              Descripción
            </Label>
            <Textarea
              id="description"
              placeholder="Detalles adicionales de la factura..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="border-gray-200 focus:border-gray-300 focus:ring-0 resize-none"
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
              Crear
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}