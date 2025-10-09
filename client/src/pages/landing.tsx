import { Button } from '@/components/ui/button';
import logoPath from '@assets/logo_soda (1)_1759330032096.png';
import { Building2, FileText, Bell, BarChart3 } from 'lucide-react';
import { SiGoogle, SiGithub, SiApple } from 'react-icons/si';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center mb-6">
            <img src={logoPath} alt="Rental Manager Logo" className="h-20 w-auto" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Rental Manager
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Gestiona tu cartera de arriendos con facilidad. Facturación automática, recordatorios, reportes y más.
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
            className="text-lg px-8 py-6 mb-4"
          >
            Iniciar sesión
          </Button>
          <div className="flex items-center justify-center gap-4 text-gray-600">
            <span className="text-sm">Disponible con:</span>
            <div className="flex gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <SiGoogle className="w-6 h-6" />
              </div>
              <div className="w-8 h-8 flex items-center justify-center">
                <SiGithub className="w-6 h-6" />
              </div>
              <div className="w-8 h-8 flex items-center justify-center">
                <SiApple className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Facturación Automática</h3>
            <p className="text-gray-600">Genera facturas mensuales por contrato automáticamente</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Recordatorios Inteligentes</h3>
            <p className="text-gray-600">Email y WhatsApp automáticos D-3 y D+1</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Reportes en PDF</h3>
            <p className="text-gray-600">Informes mensuales automáticos por aseguradora</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Multi-Propiedad</h3>
            <p className="text-gray-600">Gestiona múltiples propiedades desde un solo lugar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
