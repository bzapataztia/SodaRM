# API Documentation - Rental Manager

## Autenticación

Todas las APIs requieren autenticación mediante sesión. El usuario debe estar autenticado usando Replit Auth.

**Headers requeridos:**
```
Cookie: connect.sid=<session-token>
```

**Respuestas de error comunes:**
- `401 Unauthorized`: No autenticado
- `403 Forbidden`: Sin permisos para el recurso
- `404 Not Found`: Recurso no encontrado
- `400 Bad Request`: Datos inválidos
- `500 Internal Server Error`: Error del servidor

---

## 1. CONTRATOS (Contracts)

### GET /api/contracts
Obtiene todos los contratos del tenant actual.

**Respuesta exitosa (200):**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "number": "CONT-2024-001",
    "propertyId": "uuid",
    "ownerContactId": "uuid",
    "tenantContactId": "uuid",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "rentAmount": "1500000.00",
    "paymentDay": 5,
    "lateFeeType": "percentage",
    "lateFeeValue": "10.00",
    "status": "active",
    "policyId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "property": { ... },
    "tenantContact": { ... },
    "owner": { ... },
    "policy": { ... }
  }
]
```

### POST /api/contracts
Crea un nuevo contrato.

**Request Body:**
```json
{
  "number": "CONT-2024-001",
  "propertyId": "uuid",
  "ownerContactId": "uuid",
  "tenantContactId": "uuid",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "rentAmount": 1500000,
  "paymentDay": 5,
  "lateFeeType": "percentage",
  "lateFeeValue": 10,
  "status": "draft",
  "policyId": "uuid"
}
```

**Validaciones:**
- `number`: Único por tenant
- `propertyId`: Debe existir
- `ownerContactId`: Debe existir y tener rol "owner"
- `tenantContactId`: Debe existir y tener rol "tenant"
- `startDate` y `endDate`: No pueden superponerse con otros contratos activos en la misma propiedad
- `paymentDay`: Entre 1 y 30
- `rentAmount`: Mayor a 0

**Respuesta exitosa (200):**
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "number": "CONT-2024-001",
  ...
}
```

### GET /api/contracts/:id
Obtiene un contrato específico por ID.

**Parámetros:**
- `id`: UUID del contrato

**Respuesta exitosa (200):**
```json
{
  "id": "uuid",
  "number": "CONT-2024-001",
  "property": { ... },
  "tenantContact": { ... },
  "owner": { ... },
  ...
}
```

### PATCH /api/contracts/:id
Actualiza un contrato existente.

**Request Body (campos opcionales):**
```json
{
  "number": "CONT-2024-002",
  "rentAmount": 1600000,
  "paymentDay": 10,
  "status": "active"
}
```

**Validaciones:**
- Mismas validaciones que POST para campos modificados
- No se pueden superponer fechas con otros contratos activos

**Respuesta exitosa (200):**
```json
{
  "id": "uuid",
  "number": "CONT-2024-002",
  ...
}
```

### DELETE /api/contracts/:id
Elimina un contrato.

**Respuesta exitosa (200):**
```json
{
  "message": "Contract deleted successfully"
}
```

### POST /api/contracts/:id/activate
Activa un contrato y genera facturas mensuales automáticamente.

**Respuesta exitosa (200):**
```json
{
  "message": "Contract activated and invoices generated",
  "invoicesGenerated": 12
}
```

---

## 2. FACTURAS (Invoices)

### GET /api/invoices
Obtiene todas las facturas del tenant actual.

**Respuesta exitosa (200):**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "number": "INV-2024-001",
    "contractId": "uuid",
    "tenantContactId": "uuid",
    "issueDate": "2024-01-01",
    "dueDate": "2024-01-05",
    "subtotal": "1500000.00",
    "tax": "0.00",
    "otherCharges": "0.00",
    "lateFee": "0.00",
    "totalAmount": "1500000.00",
    "amountPaid": "0.00",
    "status": "issued",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "contract": {
      "property": { ... }
    },
    "tenantContact": { ... },
    "charges": [ ... ],
    "payments": [ ... ]
  }
]
```

**Estados posibles:**
- `draft`: Borrador
- `issued`: Emitida
- `partial`: Pago parcial
- `overdue`: Vencida (incluso con pago parcial)
- `paid`: Pagada completamente

### POST /api/invoices
Crea una nueva factura.

**Request Body:**
```json
{
  "number": "INV-2024-001",
  "contractId": "uuid",
  "tenantContactId": "uuid",
  "issueDate": "2024-01-01",
  "dueDate": "2024-01-05",
  "subtotal": 1500000,
  "tax": 0,
  "otherCharges": 0,
  "lateFee": 0,
  "totalAmount": 1500000,
  "amountPaid": 0,
  "status": "issued"
}
```

**Validaciones:**
- `number`: Único por tenant
- `amountPaid`: No puede ser negativo ni mayor a `totalAmount`
- `contractId`: Debe existir

### GET /api/invoices/:id
Obtiene una factura específica.

### PATCH /api/invoices/:id
Actualiza una factura.

**Request Body (campos opcionales):**
```json
{
  "dueDate": "2024-01-10",
  "status": "paid"
}
```

### DELETE /api/invoices/:id
Elimina una factura.

### POST /api/invoices/:id/remind
Envía un recordatorio de pago por email al inquilino.

**Respuesta exitosa (200):**
```json
{
  "message": "Reminder sent successfully"
}
```

### POST /api/invoices/:id/recalc
Recalcula los totales de la factura basándose en los cargos.

**Respuesta exitosa (200):**
```json
{
  "message": "Invoice recalculated successfully",
  "invoice": { ... }
}
```

### GET /api/invoices/:id/pdf
Genera y descarga un PDF de la factura.

**Respuesta exitosa (200):**
- Content-Type: `application/pdf`
- Archivo PDF descargable

---

## 3. PAGOS (Payments)

### GET /api/payments
Obtiene todos los pagos del tenant actual.

**Respuesta exitosa (200):**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "invoiceId": "uuid",
    "amount": "1500000.00",
    "paymentDate": "2024-01-05",
    "method": "transfer",
    "receiptUrl": "https://...",
    "createdAt": "2024-01-05T00:00:00.000Z",
    "invoice": {
      "number": "INV-2024-001",
      "contract": {
        "property": { ... }
      },
      "tenantContact": { ... }
    }
  }
]
```

### POST /api/payments
Registra un nuevo pago.

**Request Body:**
```json
{
  "invoiceId": "uuid",
  "amount": 1500000,
  "paymentDate": "2024-01-05",
  "method": "transfer",
  "receiptUrl": "https://..."
}
```

**Validaciones:**
- `amount`: No puede exceder el saldo pendiente de la factura
- `invoiceId`: Debe existir
- `method`: Valores válidos: "cash", "transfer", "check", "card"

**Efecto automático:**
- Actualiza `amountPaid` de la factura
- Actualiza el status de la factura:
  - Si `amountPaid >= totalAmount` → `paid`
  - Si `amountPaid > 0` y vencida → `overdue`
  - Si `amountPaid > 0` y no vencida → `partial`
  - Si `amountPaid = 0` → `issued`

### GET /api/payments/:id
Obtiene un pago específico.

### PATCH /api/payments/:id
Actualiza un pago existente.

**Request Body (campos opcionales):**
```json
{
  "amount": 1600000,
  "paymentDate": "2024-01-06",
  "method": "cash"
}
```

**Validaciones:**
- Si se actualiza `amount`, se valida que no exceda el saldo pendiente

### DELETE /api/payments/:id
Elimina un pago.

**Efecto automático:**
- Recalcula `amountPaid` y `status` de la factura asociada

---

## 4. PROPIEDADES (Properties)

### GET /api/properties
Obtiene todas las propiedades del tenant actual.

**Respuesta exitosa (200):**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "code": "PROP-001",
    "name": "Apartamento Centro",
    "address": "Calle 123 #45-67",
    "type": "apartment",
    "stratum": 3,
    "listRent": "1500000.00",
    "status": "rented",
    "ownerContactId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "owner": { ... }
  }
]
```

### POST /api/properties
Crea una nueva propiedad.

**Request Body:**
```json
{
  "code": "PROP-001",
  "name": "Apartamento Centro",
  "address": "Calle 123 #45-67",
  "type": "apartment",
  "stratum": 3,
  "listRent": 1500000,
  "status": "available",
  "ownerContactId": "uuid"
}
```

**Validaciones:**
- `code`: Único por tenant
- `ownerContactId`: Debe existir y tener rol "owner"
- `status`: Valores válidos: "available", "rented", "maintenance", "reserved"

### GET /api/properties/:id
Obtiene una propiedad específica.

### PATCH /api/properties/:id
Actualiza una propiedad.

### DELETE /api/properties/:id
Elimina una propiedad.

---

## 5. CONTACTOS (Contacts)

### GET /api/contacts
Obtiene todos los contactos del tenant actual.

**Respuesta exitosa (200):**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "fullName": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "+57 300 123 4567",
    "roles": ["owner", "tenant"],
    "docType": "CC",
    "docNumber": "123456789",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/contacts
Crea un nuevo contacto.

**Request Body:**
```json
{
  "fullName": "Juan Pérez",
  "email": "juan@example.com",
  "phone": "+57 300 123 4567",
  "roles": ["owner"],
  "docType": "CC",
  "docNumber": "123456789"
}
```

**Validaciones:**
- `fullName`: Requerido
- `roles`: Array con al menos un rol. Valores válidos: "owner", "tenant", "guarantor", "provider"
- `email`: Formato válido de email (opcional)

### GET /api/contacts/:id
Obtiene un contacto específico.

### PATCH /api/contacts/:id
Actualiza un contacto.

### DELETE /api/contacts/:id
Elimina un contacto.

---

## 6. ASEGURADORAS (Insurers)

### GET /api/insurers
Obtiene todas las aseguradoras del tenant actual.

**Respuesta exitosa (200):**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Sura",
    "emailReports": "reportes@sura.com",
    "policyType": "arrendamiento",
    "notes": "Póliza de garantía de arrendamiento",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/insurers
Crea una nueva aseguradora.

**Request Body:**
```json
{
  "name": "Sura",
  "emailReports": "reportes@sura.com",
  "policyType": "arrendamiento",
  "notes": "Póliza de garantía de arrendamiento"
}
```

**Validaciones:**
- `name`: Requerido

### GET /api/insurers/:id
Obtiene una aseguradora específica.

### PATCH /api/insurers/:id
Actualiza una aseguradora.

### DELETE /api/insurers/:id
Elimina una aseguradora.

### GET /api/insurers/:insurerId/overdue-policies-report
Obtiene un reporte de pólizas con facturas vencidas.

**Respuesta exitosa (200):**
```json
[
  {
    "policyId": "uuid",
    "policyNumber": "POL-001",
    "coverageType": "arrendamiento",
    "policyStatus": "active",
    "contractId": "uuid",
    "contractNumber": "CONT-001",
    "invoiceId": "uuid",
    "invoiceNumber": "INV-001",
    "invoiceDueDate": "2024-01-05",
    "invoiceTotal": "1500000.00",
    "invoiceAmountPaid": "0.00",
    "tenantContactId": "uuid"
  }
]
```

---

## 7. PÓLIZAS (Policies)

### GET /api/policies
Obtiene todas las pólizas del tenant actual.

**Respuesta exitosa (200):**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "policyNumber": "POL-2024-001",
    "insurerId": "uuid",
    "coverageType": "arrendamiento",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "insurer": { ... }
  }
]
```

### POST /api/policies
Crea una nueva póliza.

**Request Body:**
```json
{
  "policyNumber": "POL-2024-001",
  "insurerId": "uuid",
  "coverageType": "arrendamiento",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "status": "active"
}
```

**Validaciones:**
- `policyNumber`: Único por tenant
- `insurerId`: Debe existir
- `status`: Valores válidos: "active", "expired", "cancelled"

### GET /api/policies/:id
Obtiene una póliza específica.

### PATCH /api/policies/:id
Actualiza una póliza.

### DELETE /api/policies/:id
Elimina una póliza.

---

## IMPORTACIÓN/EXPORTACIÓN CSV

### Importación

Cada módulo tiene su endpoint de importación:

- `POST /api/import/contacts`
- `POST /api/import/properties`
- `POST /api/import/contracts`
- `POST /api/import/invoices`
- `POST /api/import/payments`

**Request:**
- Content-Type: `multipart/form-data`
- Campo: `file` (archivo CSV)

**Respuesta exitosa (200):**
```json
{
  "success": 45,
  "errors": [
    {
      "row": 3,
      "error": "Invalid email format",
      "data": { ... }
    }
  ],
  "total": 50
}
```

### Descarga de Plantillas

- `GET /api/templates/contacts.csv`
- `GET /api/templates/properties.csv`
- `GET /api/templates/contracts.csv`
- `GET /api/templates/invoices.csv`
- `GET /api/templates/payments.csv`

**Respuesta:**
- Content-Type: `text/csv`
- Archivo CSV con encabezados y ejemplo

---

## EJEMPLOS DE USO

### Crear contrato con póliza

```bash
# 1. Crear contactos
curl -X POST http://localhost:5000/api/contacts \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Juan Pérez",
    "roles": ["owner"],
    "email": "juan@example.com"
  }'

# 2. Crear propiedad
curl -X POST http://localhost:5000/api/properties \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PROP-001",
    "name": "Apartamento Centro",
    "ownerContactId": "owner-uuid"
  }'

# 3. Crear aseguradora
curl -X POST http://localhost:5000/api/insurers \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sura",
    "emailReports": "reportes@sura.com"
  }'

# 4. Crear póliza
curl -X POST http://localhost:5000/api/policies \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json" \
  -d '{
    "policyNumber": "POL-001",
    "insurerId": "insurer-uuid",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "status": "active"
  }'

# 5. Crear contrato
curl -X POST http://localhost:5000/api/contracts \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json" \
  -d '{
    "number": "CONT-001",
    "propertyId": "property-uuid",
    "ownerContactId": "owner-uuid",
    "tenantContactId": "tenant-uuid",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "rentAmount": 1500000,
    "paymentDay": 5,
    "policyId": "policy-uuid"
  }'

# 6. Activar contrato y generar facturas
curl -X POST http://localhost:5000/api/contracts/{contract-id}/activate \
  -H "Cookie: connect.sid=..."
```

### Registrar pago

```bash
# 1. Obtener factura pendiente
curl http://localhost:5000/api/invoices \
  -H "Cookie: connect.sid=..."

# 2. Registrar pago
curl -X POST http://localhost:5000/api/payments \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "invoice-uuid",
    "amount": 1500000,
    "paymentDate": "2024-01-05",
    "method": "transfer",
    "receiptUrl": "https://..."
  }'

# 3. Verificar que la factura se marcó como pagada
curl http://localhost:5000/api/invoices/{invoice-id} \
  -H "Cookie: connect.sid=..."
```

### Generar reporte de aseguradora

```bash
# Obtener facturas vencidas de una aseguradora
curl http://localhost:5000/api/insurers/{insurer-id}/overdue-policies-report \
  -H "Cookie: connect.sid=..."
```

---

## NOTAS IMPORTANTES

### Multi-tenancy
- Todos los endpoints están aislados por tenant
- El `tenantId` se obtiene automáticamente de la sesión del usuario
- No es posible acceder a datos de otros tenants

### Actualización automática de status
- Las facturas actualizan su status automáticamente cuando:
  - Se crea un pago
  - Se elimina un pago
  - El cron verifica facturas vencidas
- Status de facturas vencidas con pago parcial: `overdue` (no `partial`)

### Validaciones de negocio
- Una propiedad no puede tener múltiples contratos activos con fechas superpuestas
- Los pagos no pueden exceder el saldo pendiente de la factura
- Los números de contrato, factura, propiedad y póliza son únicos por tenant

### Generación automática de facturas
- Al activar un contrato, se generan facturas mensuales automáticamente
- Las facturas se crean desde `startDate` hasta `endDate`
- El día de pago se toma del campo `paymentDay` del contrato

### Reportes
- El reporte de aseguradoras incluye solo facturas con status `overdue`
- Las facturas vencidas con pago parcial se incluyen en el reporte
