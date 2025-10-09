import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { X } from "lucide-react";

interface AddPropertyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPropertyModal({ open, onOpenChange }: AddPropertyModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    address: "",
    city: "",
    neighborhood: "",
    bedrooms: "",
    bathrooms: "",
    area: "",
    rentPrice: "",
    deposit: "",
    description: "",
    status: "available"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Adding property:", formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      name: "",
      type: "",
      address: "",
      city: "",
      neighborhood: "",
      bedrooms: "",
      bathrooms: "",
      area: "",
      rentPrice: "",
      deposit: "",
      description: "",
      status: "available"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Nueva Propiedad</DialogTitle>
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
            <Label htmlFor="name" className="text-sm text-gray-700">
              Nombre/Identificación *
            </Label>
            <Input
              id="name"
              placeholder="Ej: Apartamento 101"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm text-gray-700">
              Tipo de Propiedad *
            </Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Apartamento</SelectItem>
                <SelectItem value="house">Casa</SelectItem>
                <SelectItem value="studio">Estudio</SelectItem>
                <SelectItem value="penthouse">Penthouse</SelectItem>
                <SelectItem value="office">Oficina</SelectItem>
                <SelectItem value="commercial">Local Comercial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm text-gray-700">
              Dirección *
            </Label>
            <Input
              id="address"
              placeholder="Calle 123 #45-67"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm text-gray-700">
                Ciudad *
              </Label>
              <Input
                id="city"
                placeholder="Medellín"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="neighborhood" className="text-sm text-gray-700">
                Barrio/Sector
              </Label>
              <Input
                id="neighborhood"
                placeholder="El Poblado"
                value={formData.neighborhood}
                onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms" className="text-sm text-gray-700">
                Habitaciones
              </Label>
              <Select value={formData.bedrooms} onValueChange={(value) => setFormData(prev => ({ ...prev, bedrooms: value }))}>
                <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0">
                  <SelectValue placeholder="0" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Estudio</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5+">5+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms" className="text-sm text-gray-700">
                Baños
              </Label>
              <Select value={formData.bathrooms} onValueChange={(value) => setFormData(prev => ({ ...prev, bathrooms: value }))}>
                <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0">
                  <SelectValue placeholder="1" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="1.5">1.5</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="2.5">2.5</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="3+">3+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="area" className="text-sm text-gray-700">
                Área (m²)
              </Label>
              <Input
                id="area"
                type="number"
                placeholder="80"
                value={formData.area}
                onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rentPrice" className="text-sm text-gray-700">
              Precio de Alquiler Mensual *
            </Label>
            <Input
              id="rentPrice"
              type="number"
              placeholder="2,500,000"
              value={formData.rentPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, rentPrice: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm text-gray-700">
              Estado *
            </Label>
            <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Disponible</SelectItem>
                <SelectItem value="occupied">Ocupado</SelectItem>
                <SelectItem value="maintenance">En Mantenimiento</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
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