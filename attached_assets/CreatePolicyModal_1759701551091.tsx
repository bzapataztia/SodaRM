import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { X } from "lucide-react";

interface CreatePolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePolicyModal({ open, onOpenChange }: CreatePolicyModalProps) {
  const [formData, setFormData] = useState({
    policyNumber: "POL-12343",
    insurer: "",
    coverageType: "",
    startDate: "",
    endDate: "",
    status: "active"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating policy:", formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      policyNumber: "POL-12343",
      insurer: "",
      coverageType: "",
      startDate: "",
      endDate: "",
      status: "active"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Nueva Póliza</DialogTitle>
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
            <Label htmlFor="policyNumber" className="text-sm text-gray-700">
              Número de Póliza *
            </Label>
            <Input
              id="policyNumber"
              value={formData.policyNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, policyNumber: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="insurer" className="text-sm text-gray-700">
              Aseguradora *
            </Label>
            <Select value={formData.insurer} onValueChange={(value) => setFormData(prev => ({ ...prev, insurer: value }))}>
              <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0">
                <SelectValue placeholder="Seleccionar aseguradora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suramericana">Suramericana</SelectItem>
                <SelectItem value="bolivar">Seguros Bolívar</SelectItem>
                <SelectItem value="sura">SURA</SelectItem>
                <SelectItem value="liberty">Liberty Seguros</SelectItem>
                <SelectItem value="mapfre">MAPFRE</SelectItem>
                <SelectItem value="axa">AXA Colpatria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverageType" className="text-sm text-gray-700">
              Tipo de Cobertura
            </Label>
            <Input
              id="coverageType"
              placeholder="Todo riesgo, incendio, etc."
              value={formData.coverageType}
              onChange={(e) => setFormData(prev => ({ ...prev, coverageType: e.target.value }))}
              className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm text-gray-700">
                Fecha de Inicio *
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm text-gray-700">
                Fecha de Fin *
              </Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-0"
              />
            </div>
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
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="expired">Vencida</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
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