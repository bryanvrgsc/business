# CMMS - Sistema de Gestión de Mantenimiento

Sistema de gestión para mantenimiento de montacargas y activos industriales. Diseñado para ofrecer rentabilidad y trazabilidad completa.

**Backend:** https://cmms-backend.bryanvrgsc.workers.dev
**Frontend:** https://cmms-frontend-epn.pages.dev

---

## 🚀 Módulos Implementados

### 1. Gestión de Clientes (Tenant)
- **Empresas**: Registro de clientes con información fiscal y planes de suscripción (Basic, Pro, Enterprise).
- **Control**: Visualización de estado (Activo/Inactivo).
- **Ruta**: `/admin/clients`

### 2. Ubicaciones
- **Sedes**: Gestión de plantas, bodegas y sucursales por cliente.
- **Geolocalización**: Registro de coordenadas GPS (latitud/longitud).
- **Ruta**: `/admin/locations`

### 3. Activos (Montacargas)
- **Registro**: Alta de equipos con fichas técnicas completas (Modelo, Marca, Serie, Horas).
- **Identificación**: Generación de QR interno para escaneo.
- **Ruta**: `/admin/forklifts`

### 4. Contratos y SLAs
- **Contratos**: Definición de modelos de cobro:
    - Mensual Fijo
    - Por Hora
    - Por Evento (Ticket)
- **SLAs**: Acuerdos de Nivel de Servicio configurables por prioridad (Alta, Media, Baja) con penalizaciones.
- **Ruta**: `/admin/contracts`

### 5. Checklists y Mantenimiento
- **Plantillas**: Creador de checklists dinámicos versionados.
- **Preguntas**: Tipos soportados (Sí/No, Texto, Número) con niveles de severidad (Info, Warning, Critical Stop).
- **Ruta**: `/maintenance/checklists`

---

## 🛠 Stack Tecnológico

- **Frontend**: Next.js 14, Tailwind CSS, Lucide React.
- **Backend**: Hono (Edge), Cloudflare Workers.
- **Base de Datos**: PostgreSQL / Spanner (vía pg-node).
- **Almacenamiento**: Cloudflare R2 (Imágenes y Evidencias).

## 📂 Documentación Clave

- [Flujo Maestro de Onboarding y Operación](./flujo_maestro_onboarding_operacion.md)
- [Plan de Implementación](./plan_implementacion.md)
- [Documentación de Base de Datos](./documentacion_db.md)

## ⚡ Setup Local

### Backend
Moverse al directorio `backend/`:
```bash
npm install
npm run dev
```

### Frontend
Moverse al directorio `frontend/`:
```bash
npm install
npm run dev
```

---

> **Nota**: Este proyecto está en desarrollo activo. La arquitectura sigue el modelo "Tenant-First" para escalabilidad B2B.
