import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

type OcrLog = {
  id: string;
  status: 'ok' | 'needs_review' | 'error' | string;
  confidence?: string | number | null;
  extractedAmount?: string | number | null;
};

function formatPercentage(value: string | number | null | undefined): string {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value ?? '0');
  return Number.isFinite(numeric) ? numeric.toFixed(0) : '0';
}

function formatAmount(value: string | number | null | undefined): string {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value ?? '0');
  if (!Number.isFinite(numeric)) {
    return '$0';
  }
  return `$${numeric.toLocaleString('es-CO')}`;
}

export default function OCRInboxPage() {
  const { data: ocrLogs = [], isLoading } = useQuery<OcrLog[]>({
    queryKey: ['/api/ocr/logs'],
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
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">OCR Inbox</h1>
              <p className="text-muted-foreground mt-1">Documentos procesados y pendientes de revisión</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ocrLogs.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <i className="fas fa-inbox text-4xl text-muted-foreground mb-2"></i>
                  <p className="text-muted-foreground">No hay documentos en proceso</p>
                </div>
              ) : (
                ocrLogs.map(log => (
                  <div key={log.id} className="border border-border rounded-lg p-4 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                        <i className="fas fa-file-pdf text-destructive text-xl"></i>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'ok'
                            ? 'bg-success/10 text-success'
                            : log.status === 'needs_review'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {log.status === 'ok' ? 'OK' : log.status === 'needs_review' ? 'Revisar' : 'Error'}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium mb-2">Documento {log.id.slice(0, 8)}</h3>
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Confianza</span>
                        <span className="font-medium">{formatPercentage(log.confidence)}%</span>
                      </div>
                      {log.extractedAmount && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Monto</span>
                          <span className="font-medium font-mono">{formatAmount(log.extractedAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
