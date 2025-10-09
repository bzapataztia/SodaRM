import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { X } from "lucide-react";

interface AddTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTenantModal({ open, onOpenChange }: AddTenantModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    documentType: "",
    documentNumber: "",
    email: "",
    phone: "",
    mobile: "",
    address: "",
    city: "",
    occupation: "",
    company: "",
    monthlyIncome: "",
    emergencyContact: "",
    emergencyPhone: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Adding tenant:", formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      firstName: "",
      lastName: "",
      documentType: "",
      documentNumber: "",
      email: "",
      phone: "",
      mobile: "",
      address: "",
      city: "",
      occupation: "",
      company: "",
      monthlyIncome: "",
      emergencyContact: "",
      emergencyPhone: "",
      notes: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Nuevo Inquilino</DialogTitle>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm text-gray-700">
                Nombres *
              </Label>
              <Input
                id="firstName"
                placeholder="Juan Carlos"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm text-gray-700">
                Apellidos *
              </Label>
              <Input
                id="lastName"
                placeholder="González Pérez"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentType" className="text-sm text-gray-700">
              Tipo de Documento *
            </Label>
            <Select value={formData.documentType} onValueChange={(value) => setFormData(prev => ({ ...prev, documentType: value }))}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cc">Cédula de Ciudadanía</SelectItem>
                <SelectItem value="ce">Cédula de Extranjería</SelectItem>
                <SelectItem value="passport">Pasaporte</SelectItem>
                <SelectItem value="nit">NIT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentNumber" className="text-sm text-gray-700">
              Número de Documento *
            </Label>
            <Input
              id="documentNumber"
              placeholder="12345678"
              value={formData.documentNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-gray-700">
              Correo Electrónico *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="juan.gonzalez@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-sm text-gray-700">
              Teléfono Móvil *
            </Label>
            <Input
              id="mobile"
              placeholder="+57 300 123 4567"
              value={formData.mobile}
              onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm text-gray-700">
              Dirección
            </Label>
            <Input
              id="address"
              placeholder="Calle 123 #45-67, Barrio El Poblado"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
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
              Crear
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}