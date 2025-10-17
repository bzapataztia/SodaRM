# API Examples - Rental Manager

Ejemplos prácticos para integrar con las APIs de Rental Manager desde aplicaciones de terceros.

## 🔐 Autenticación

Para consumir las APIs desde una aplicación externa, necesitas autenticarte usando Replit Auth y mantener la sesión:

### Opción 1: Autenticación mediante Token API (Próximamente)

```javascript
const headers = {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json'
};
```

### Opción 2: Autenticación mediante Sesión (Actual)

```javascript
// 1. Autenticar y obtener cookie de sesión
const session = await fetch('https://your-app.replit.app/api/login', {
  method: 'GET',
  credentials: 'include'
});

// 2. Usar la sesión en todas las peticiones
const data = await fetch('https://your-app.replit.app/api/contracts', {
  credentials: 'include'  // Envía cookies automáticamente
});
```

---

## 📋 Casos de Uso Comunes

### 1. Crear un contrato completo desde cero

```javascript
// Paso 1: Crear propietario
const owner = await fetch('/api/contacts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    fullName: "María García",
    email: "maria@example.com",
    phone: "+57 300 111 2222",
    roles: ["owner"],
    docType: "CC",
    docNumber: "1234567890"
  })
}).then(r => r.json());

// Paso 2: Crear inquilino
const tenant = await fetch('/api/contacts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    fullName: "Carlos López",
    email: "carlos@example.com",
    phone: "+57 300 333 4444",
    roles: ["tenant"],
    docType: "CC",
    docNumber: "9876543210"
  })
}).then(r => r.json());

// Paso 3: Crear propiedad
const property = await fetch('/api/properties', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    code: "APT-101",
    name: "Apartamento Centro Calle 50",
    address: "Calle 50 #23-45, Medellín",
    type: "apartment",
    stratum: 4,
    listRent: 2000000,
    status: "available",
    ownerContactId: owner.id
  })
}).then(r => r.json());

// Paso 4: Crear contrato
const contract = await fetch('/api/contracts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    number: "CONT-2024-" + Date.now(),
    propertyId: property.id,
    ownerContactId: owner.id,
    tenantContactId: tenant.id,
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    rentAmount: 2000000,
    paymentDay: 5,
    lateFeeType: "percentage",
    lateFeeValue: 10,
    status: "signed"
  })
}).then(r => r.json());

// Paso 5: Activar contrato y generar facturas
const activation = await fetch(`/api/contracts/${contract.id}/activate`, {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json());

console.log(`Contrato creado y ${activation.invoicesGenerated} facturas generadas`);
```

### 2. Consultar facturas pendientes y registrar pago

```javascript
// 1. Obtener todas las facturas
const invoices = await fetch('/api/invoices', {
  credentials: 'include'
}).then(r => r.json());

// 2. Filtrar facturas pendientes
const pending = invoices.filter(inv => 
  inv.status === 'issued' || inv.status === 'partial'
);

// 3. Registrar pago para la primera factura pendiente
if (pending.length > 0) {
  const invoice = pending[0];
  const balance = parseFloat(invoice.totalAmount) - parseFloat(invoice.amountPaid);
  
  const payment = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      invoiceId: invoice.id,
      amount: balance,  // Pago total
      paymentDate: new Date().toISOString().split('T')[0],
      method: "transfer",
      receiptUrl: "https://cdn.example.com/receipt-123.pdf"
    })
  }).then(r => r.json());
  
  console.log('Pago registrado:', payment);
}
```

### 3. Obtener reporte de facturas vencidas por aseguradora

```javascript
// 1. Obtener lista de aseguradoras
const insurers = await fetch('/api/insurers', {
  credentials: 'include'
}).then(r => r.json());

// 2. Para cada aseguradora, obtener facturas vencidas
for (const insurer of insurers) {
  const overdueReport = await fetch(
    `/api/insurers/${insurer.id}/overdue-policies-report`,
    { credentials: 'include' }
  ).then(r => r.json());
  
  console.log(`${insurer.name}: ${overdueReport.length} facturas vencidas`);
  
  // 3. Enviar reporte por email (usando tu propio servicio)
  if (overdueReport.length > 0 && insurer.emailReports) {
    // Aquí implementas el envío de email con los datos del reporte
    // await sendEmailReport(insurer.emailReports, overdueReport);
  }
}
```

### 4. Importar datos masivos desde CSV

```javascript
// Ejemplo con Node.js
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('file', fs.createReadStream('contacts.csv'));

const result = await fetch('/api/import/contacts', {
  method: 'POST',
  body: form,
  credentials: 'include'
}).then(r => r.json());

console.log(`Importados: ${result.success} de ${result.total}`);
console.log(`Errores: ${result.errors.length}`);
result.errors.forEach(err => {
  console.error(`Fila ${err.row}: ${err.error}`);
});
```

---

## 🔄 Flujos de Trabajo Completos

### Flujo 1: Sistema de Recordatorios Personalizados

```javascript
async function sendCustomReminders() {
  // 1. Obtener facturas próximas a vencer (en 2 días)
  const invoices = await fetch('/api/invoices', {
    credentials: 'include'
  }).then(r => r.json());
  
  const today = new Date();
  const twoDaysFromNow = new Date(today);
  twoDaysFromNow.setDate(today.getDate() + 2);
  
  const upcoming = invoices.filter(inv => {
    const dueDate = new Date(inv.dueDate);
    return dueDate <= twoDaysFromNow && 
           dueDate > today &&
           inv.status !== 'paid';
  });
  
  // 2. Enviar recordatorio por WhatsApp (tu implementación)
  for (const invoice of upcoming) {
    const tenant = invoice.tenantContact;
    const message = `
Hola ${tenant.fullName},
Te recordamos que la factura ${invoice.number} 
vence en 2 días (${invoice.dueDate}).
Monto: $${parseFloat(invoice.totalAmount).toLocaleString('es-CO')}
    `.trim();
    
    // await sendWhatsApp(tenant.phone, message);
    console.log(`Recordatorio enviado a ${tenant.fullName}`);
  }
}
```

### Flujo 2: Dashboard Externo de Métricas

```javascript
async function getDashboardMetrics() {
  // 1. Obtener todas las facturas
  const invoices = await fetch('/api/invoices', {
    credentials: 'include'
  }).then(r => r.json());
  
  // 2. Calcular métricas
  const metrics = {
    total: invoices.length,
    issued: 0,
    paid: 0,
    overdue: 0,
    partial: 0,
    totalAmount: 0,
    collected: 0,
    pending: 0
  };
  
  invoices.forEach(inv => {
    const total = parseFloat(inv.totalAmount);
    const paid = parseFloat(inv.amountPaid);
    
    metrics.totalAmount += total;
    metrics.collected += paid;
    metrics.pending += (total - paid);
    metrics[inv.status]++;
  });
  
  // 3. Calcular tasa de recuperación
  metrics.recoveryRate = metrics.totalAmount > 0 
    ? (metrics.collected / metrics.totalAmount * 100).toFixed(2) 
    : 0;
  
  return metrics;
}

// Uso
const metrics = await getDashboardMetrics();
console.log(`Recuperación: ${metrics.recoveryRate}%`);
console.log(`Facturas vencidas: ${metrics.overdue}`);
console.log(`Saldo pendiente: $${metrics.pending.toLocaleString('es-CO')}`);
```

### Flujo 3: Sincronización con Sistema Contable Externo

```javascript
async function syncToAccountingSystem() {
  // 1. Obtener pagos del día
  const today = new Date().toISOString().split('T')[0];
  const payments = await fetch('/api/payments', {
    credentials: 'include'
  }).then(r => r.json());
  
  const todayPayments = payments.filter(p => p.paymentDate === today);
  
  // 2. Transformar al formato de tu sistema contable
  const accountingEntries = todayPayments.map(payment => ({
    date: payment.paymentDate,
    account: "1105", // Cuenta por cobrar
    debit: 0,
    credit: parseFloat(payment.amount),
    description: `Pago factura ${payment.invoice.number}`,
    reference: payment.id,
    tenant: payment.invoice.tenantContact.fullName
  }));
  
  // 3. Enviar a sistema contable
  // await yourAccountingSystem.createEntries(accountingEntries);
  
  console.log(`${accountingEntries.length} asientos contables sincronizados`);
  return accountingEntries;
}
```

---

## 🛠️ Utilidades y Helpers

### Helper: Cliente API Reutilizable

```javascript
class RentalManagerAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }
    
    return response.json();
  }
  
  // Contratos
  async getContracts() {
    return this.request('/api/contracts');
  }
  
  async createContract(data) {
    return this.request('/api/contracts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async activateContract(contractId) {
    return this.request(`/api/contracts/${contractId}/activate`, {
      method: 'POST'
    });
  }
  
  // Facturas
  async getInvoices() {
    return this.request('/api/invoices');
  }
  
  async getInvoicePDF(invoiceId) {
    const url = `${this.baseURL}/api/invoices/${invoiceId}/pdf`;
    const response = await fetch(url, { credentials: 'include' });
    return response.blob();
  }
  
  async sendReminder(invoiceId) {
    return this.request(`/api/invoices/${invoiceId}/remind`, {
      method: 'POST'
    });
  }
  
  // Pagos
  async createPayment(data) {
    return this.request('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  // Reportes
  async getOverdueReport(insurerId) {
    return this.request(`/api/insurers/${insurerId}/overdue-policies-report`);
  }
}

// Uso
const api = new RentalManagerAPI('https://your-app.replit.app');
const contracts = await api.getContracts();
```

### Helper: Validador de Datos

```javascript
function validateContractData(data) {
  const errors = [];
  
  if (!data.number) errors.push('Número de contrato requerido');
  if (!data.propertyId) errors.push('Propiedad requerida');
  if (!data.ownerContactId) errors.push('Propietario requerido');
  if (!data.tenantContactId) errors.push('Inquilino requerido');
  if (!data.rentAmount || data.rentAmount <= 0) {
    errors.push('Canon de arrendamiento debe ser mayor a 0');
  }
  if (!data.paymentDay || data.paymentDay < 1 || data.paymentDay > 30) {
    errors.push('Día de pago debe estar entre 1 y 30');
  }
  
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  if (startDate >= endDate) {
    errors.push('Fecha de fin debe ser posterior a fecha de inicio');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Uso
const validation = validateContractData(contractData);
if (!validation.valid) {
  console.error('Errores de validación:', validation.errors);
} else {
  await api.createContract(contractData);
}
```

---

## 📊 Webhooks y Eventos (Próximamente)

```javascript
// Configurar webhook para recibir notificaciones
const webhookConfig = {
  url: "https://your-app.com/webhooks/rental-manager",
  events: [
    "payment.created",
    "invoice.overdue",
    "contract.activated"
  ]
};

// Tu servidor recibirá:
// POST https://your-app.com/webhooks/rental-manager
// {
//   "event": "payment.created",
//   "data": { ... },
//   "timestamp": "2024-01-01T00:00:00.000Z"
// }
```

---

## 🔒 Seguridad y Buenas Prácticas

### 1. Rate Limiting

```javascript
// Implementa rate limiting en tu cliente
class RateLimitedAPI extends RentalManagerAPI {
  constructor(baseURL, requestsPerMinute = 60) {
    super(baseURL);
    this.requestsPerMinute = requestsPerMinute;
    this.requestQueue = [];
  }
  
  async request(endpoint, options) {
    // Esperar si hay demasiadas peticiones
    await this.waitForSlot();
    return super.request(endpoint, options);
  }
  
  async waitForSlot() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.requestQueue = this.requestQueue.filter(t => t > oneMinuteAgo);
    
    if (this.requestQueue.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestQueue[0];
      const waitTime = 60000 - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requestQueue.push(now);
  }
}
```

### 2. Manejo de Errores

```javascript
async function safeAPICall(apiFunction, ...args) {
  try {
    return await apiFunction(...args);
  } catch (error) {
    if (error.message.includes('401')) {
      console.error('No autenticado. Redirigir a login.');
      // window.location.href = '/login';
    } else if (error.message.includes('404')) {
      console.error('Recurso no encontrado');
    } else if (error.message.includes('400')) {
      console.error('Datos inválidos:', error.message);
    } else {
      console.error('Error de servidor:', error);
    }
    throw error;
  }
}

// Uso
try {
  const contract = await safeAPICall(api.createContract, contractData);
} catch (error) {
  // Error ya manejado
}
```

### 3. Caché Local

```javascript
class CachedAPI extends RentalManagerAPI {
  constructor(baseURL, cacheTTL = 60000) {
    super(baseURL);
    this.cache = new Map();
    this.cacheTTL = cacheTTL;
  }
  
  async request(endpoint, options = {}) {
    // Solo cachear GET requests
    if (options.method && options.method !== 'GET') {
      return super.request(endpoint, options);
    }
    
    const cacheKey = endpoint;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    const data = await super.request(endpoint, options);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  clearCache() {
    this.cache.clear();
  }
}
```

---

## 🧪 Testing

### Test de Integración

```javascript
// test/api.test.js
const assert = require('assert');

describe('Rental Manager API', () => {
  let api;
  let createdContactId;
  
  before(() => {
    api = new RentalManagerAPI('http://localhost:5000');
  });
  
  it('should create a contact', async () => {
    const contact = await api.createContact({
      fullName: "Test User",
      roles: ["owner"],
      email: "test@example.com"
    });
    
    assert(contact.id, 'Contact should have an ID');
    createdContactId = contact.id;
  });
  
  it('should get all contacts', async () => {
    const contacts = await api.getContacts();
    assert(Array.isArray(contacts), 'Should return an array');
    assert(contacts.length > 0, 'Should have at least one contact');
  });
  
  after(async () => {
    // Cleanup
    if (createdContactId) {
      await api.deleteContact(createdContactId);
    }
  });
});
```

---

## 📚 Recursos Adicionales

- **Documentación completa:** Ver `API_DOCUMENTATION.md`
- **Schemas de validación:** Ver `shared/schema.ts`
- **Códigos de error:** Ver sección de autenticación
