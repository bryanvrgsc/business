# Flujo Maestro de Onboarding y Operacion (CMMS)

Este documento define el orden obligatorio de ejecucion para operar el sistema sin inconsistencias de negocio.

## Fase 1: Setup Inicial (una sola vez por cliente)

Secuencia obligatoria:

1. `clients` (registrar empresa)
2. `users` (usuarios clave)
3. `client_locations` (plantas/sucursales)
4. `forklifts` (activos con QR)
5. `service_contracts` (modelo de cobro)
6. `sla_definitions` (tiempos y penalizaciones)
7. `checklist_templates` + `checklist_questions` (inspecciones)
8. `preventive_schedules` (mantenimiento recurrente)

### Usuarios minimos por rol

| Rol | Responsable |
| --- | --- |
| `ADMIN` | Agencia |
| `CLIENTE` | Supervisor del cliente |
| `TECNICO` | Tecnicos asignables |
| `OPERADOR` | Conductores |

### Criterio de salida de fase 1

El cliente puede:

- Escanear QR y levantar reportes.
- Generar tickets automaticos por severidad.
- Operar preventivos programados.
- Tener contrato y SLA activos para control financiero y operativo.

## Fase 2: Operacion Diaria (core del negocio)

### Flujo operativo

1. Operador escanea QR del montacargas.
2. Operador completa checklist.
3. Sistema crea `reports`.
4. Sistema evalua severidad:

| Evento detectado | Accion automatica |
| --- | --- |
| `WARNING` | Crear `maintenance_tickets` |
| `CRITICAL_STOP` | Crear `maintenance_tickets` + bloquear equipo (`forklifts.operational_status = OUT_OF_SERVICE`) |

5. Tecnico atiende ticket:
   - Acepta
   - Cambia estado
   - Registra horas y actividades
   - Usa refacciones
   - Cierra ticket
6. Sistema financiero registra:
   - `ticket_costs`
   - `ticket_parts_used`
   - Ajuste de inventario
   - Margen/rentabilidad por ticket

## Fase 3: Ciclo del Dinero (mensual)

### 1) Consolidacion por cliente

- `SUM(ticket_costs.total_cost)`

### 2) Aplicacion de contrato

| Tipo de contrato | Formula |
| --- | --- |
| `MENSUAL` | `monthly_fee` |
| `POR_HORA` | `horas * hourly_rate` |
| `EVENTO` | `tickets * tarifa_evento` |

### 3) Facturacion

Se genera factura en sistema externo o en modulo interno.

## Mapa resumido de datos

### Setup inicial

`clients -> users -> client_locations -> forklifts -> service_contracts -> sla_definitions -> checklist_templates -> preventive_schedules`

### Operacion diaria

`forklifts -> reports -> maintenance_tickets -> (ticket_costs + ticket_parts_used)`

## Reglas de oro (invariantes de negocio)

1. No existe ticket sin montacargas.
2. No existe dinero sin ticket.
3. No existe sistema sin cliente.

Si se solicita crear tickets sin activos, se considera riesgo de integridad operativa y financiera.

## Definicion del valor del producto

El sistema no vende solo checklists o tickets; vende:

- Control operacional
- Trazabilidad total
- Dinero medible por cliente, ticket y contrato
