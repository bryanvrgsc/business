# CMMS B2B SaaS - Guía para la Inteligencia Artificial (GEMINI.md)

Este documento centraliza el propósito, las invariantes de negocio y la arquitectura del repositorio actual, sirviendo como contexto principal para cualquier asistente de IA que interactúe, construya y mantenga este proyecto.

---

## 🚀 1. Propósito Core del Repositorio

El sistema en este repositorio es un **Sistema de Gestión de Mantenimiento Computarizado (CMMS)** diseñado bajo el modelo **B2B SaaS Multi-tenant** y enfocado en el mantenimiento de **Montacargas y Activos Industriales**. 

Su propósito fundamental no es solo generar e imprimir reportes PDF o un simple seguimiento de refacciones, sino **ofrecer control financiero, y rentabilidad medible por cliente**. El producto se basa en la trazabilidad inquebrantable que comienza en el operador reportando en el montacargas, hasta la recolección de dinero estructurada en tickets correctivos o preventivos en los dashboards del cliente.

**Reglas de Oro (Invariantes de Negocio del Sistema):**
1. **No existe ticket sin montacargas** (Ninguna refacción, preventivo o revisión se da sin un activo validado por QR).
2. **No existe dinero ni rentabilidad sin ticket** (Las métricas y costos financieros se desprenden siempre de un `maintenance_ticket` finalizado).
3. **No existe sistema sin cliente** (Cada pieza de información está encapsulada estrictamente a un `client_id` (Tenant Isolation)).

---

## 🏗 2. Arquitectura de Software y Stack Tecnológico

El proyecto cuenta con una arquitectura dividida en frontend, backend edge y base de datos distribuida, optimizado para operaciones globales.
- **Frontend App**: Next.js 14 (App Router) y TailwindCSS para web dashboard. Se consumen APIs desde Next.
- **Backend API**: Cloudflare Workers y [Hono](https://hono.dev/) como framework rápido y compatible con Edge.
- **Capa de Datos**: PostgreSQL compatible, alojado específicamente en **Google Cloud Spanner** vía driver `pg-node`.
- **Almacenamiento (Evidencia)**: Cloudflare R2 (para comprobantes multimedia de tickets, subidos fuera de banda).
- **Autenticación**: JWT (con bcrypt en DB) almacenado en una tabla `user_sessions`, manejando expiración manual.

---

## 🗄 3. Base de Datos y Esquema (Spanner + Postgres)

Como IA trabajando sobre la capa de base de datos, siempre debes tener en cuenta que, a pesar de usar sintaxis nativa de PostgreSQL, el backend físico de datos es Cloud Spanner. Por lo tanto:
- **EVITAREMOS** `JSONB`, `INET`, y `NUMERIC(X,Y)` explícito, usar en su lugar `TEXT` o `NUMERIC` estándar.
- **EVITAREMOS** `UNIQUE` a nivel de columna, crear `CREATE UNIQUE INDEX` separado para soportarlo en Spanner. No asumas que cuentas con la cláusula `IF NOT EXISTS` a nivel de índice.

La DB cuenta con 20 tablas organizadas en 8 grandes contenedores/módulos:
1. **Core (Empresas y Usuarios)**: `clients`, `users` y `user_sessions` (roles de `ADMIN`, `CLIENTE`, `TECNICO`, `OPERADOR`).
2. **Activos**: `client_locations` y `forklifts` mapeados con `qr_code_payload` obligatoria para operabilidad.
3. **Checklists**: Plantillas `checklist_templates` y `checklist_questions`. Soporte de versionado y prioridades vitales (`WARNING`, `CRITICAL_STOP`).
4. **Reportes Diarios**: Entidades `reports` y `report_answers`. Este módulo es _Offline-first_, la app guarda timestamps locales `captured_at` y sincroniza en bloque `synced_at` por anti-fraude.
5. **Mantenimiento**: Planes periódicos en `preventive_schedules`, Tickets de mantenimiento (`maintenance_tickets`). Las alertas están controladas por reglas en `sla_definitions`.
6. **Costos en Mantenimiento**: Sub-tabla `ticket_costs` la cual calcula `unit_cost` * `quantity` identificando cargos facturables mediante el flag `is_billable`.
7. **Inventario**: `parts_inventory` y el desglose en cada uso a través de la tabla `ticket_parts_used`.
8. **Contratos (Recaudo)**: `service_contracts` y su puente para alcance `contract_forklifts`. Con soporte multi-monetización (`POR_HORA`, `MENSUAL_FIJO`, `POR_EVENTO`).

---

## 🚦 4. Flujo Maestro de Onboarding del Sistema

A fin de generar features operativas validables, el sistema de datos asume un Setup inicial riguroso donde las altas de cliente obedecen al siguiente árbol de dependencias mandatorio:

**El Flujo Mandatorio es:**
`clients` ➡ `users` ➡ `client_locations` ➡ `forklifts` ➡ `service_contracts` ➡ `sla_definitions` ➡ `checklist_templates` ➡ `preventive_schedules`

Ningún cliente o agencia puede escanear código QR o subir un reporte hasta completar integralmente estas ramas del Tenant.

---

## 📍 5. Instrucciones Centrales de Implementación para IAs

Cualquier cambio de código o refactorización que se pida debe observar estos puntos:
1. **Isolación de DB:** Añadir inyección obligatoria en todos los queries backend al tenant (`WHERE client_id = ?`).
2. **Prioridad sobre SLA:** Si diseñas nuevas queries, dale suma prevalencia a los campos `created_at` o `assigned_at` evaluables sobre `sla_definitions` para reportes de alertas.
3. **Mantenimiento Preventivo:** Recuerda que los `preventive_schedules` disparan tickets automatizados vía cron/workers en el servidor para avisar a los técnicos según horómetro o fecha calendario (`next_due_at ` / `next_due_hours`).

Documentación central de consulta:
- BD: `documentacion_db.md` y `tablasv2.sql`.
- Negocio: `plan_implementacion.md` y `flujo_maestro_onboarding_operacion.md`.
