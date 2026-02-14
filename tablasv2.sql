-- ============================================================
-- CMMS B2B SaaS — Esquema Completo v2
-- Enfoque: Rentabilidad y Transparencia
-- Compatible con Spanner PostgreSQL
-- ============================================================

-- ============================================================
-- BASE: Empresas y Usuarios
-- ============================================================

-- Tabla de Empresas Clientes (Multi-tenant)
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    phone VARCHAR(20),
    tax_id VARCHAR(20),
    billing_address TEXT,
    subscription_plan VARCHAR(50) DEFAULT 'BASIC',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios (Tecnicos, Operadores, Admins)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    client_id VARCHAR(36),
    email VARCHAR(255),
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Sesiones de usuario (Control de acceso)
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- ACTIVOS: Montacargas y Ubicaciones
-- ============================================================

-- Ubicaciones/Plantas del cliente
CREATE TABLE IF NOT EXISTS client_locations (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    gps_latitude DOUBLE PRECISION,
    gps_longitude DOUBLE PRECISION,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Tabla de Activos (Montacargas)
CREATE TABLE IF NOT EXISTS forklifts (
    id VARCHAR(36) PRIMARY KEY,
    internal_id VARCHAR(50) NOT NULL,
    serial_number VARCHAR(100),
    qr_code_payload VARCHAR(255) NOT NULL,
    model VARCHAR(100),
    brand VARCHAR(100),
    year INT,
    fuel_type VARCHAR(50),
    client_id VARCHAR(36) NOT NULL,
    location_id VARCHAR(36),
    operational_status VARCHAR(20) DEFAULT 'OPERATIONAL',
    current_hours NUMERIC,
    last_sync_at TIMESTAMPTZ,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (location_id) REFERENCES client_locations(id)
);

-- ============================================================
-- CHECKLISTS: Templates y Preguntas
-- ============================================================

-- Versiones del Checklist
CREATE TABLE IF NOT EXISTS checklist_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    version INT NOT NULL,
    client_id VARCHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Preguntas Individuales del Checklist
CREATE TABLE IF NOT EXISTS checklist_questions (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    severity_level VARCHAR(20) DEFAULT 'INFO',
    requires_evidence BOOLEAN DEFAULT FALSE,
    order_index INT,
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id)
);

-- ============================================================
-- REPORTES: Inspecciones diarias
-- ============================================================

-- Encabezado del Reporte
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(36) PRIMARY KEY,
    forklift_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(36),

    captured_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    gps_latitude DOUBLE PRECISION,
    gps_longitude DOUBLE PRECISION,

    has_critical_failure BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (forklift_id) REFERENCES forklifts(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id)
);

-- Respuestas Detalladas
CREATE TABLE IF NOT EXISTS report_answers (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,

    answer_value VARCHAR(255),
    is_flagged BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (report_id) REFERENCES reports(id),
    FOREIGN KEY (question_id) REFERENCES checklist_questions(id)
);

-- Evidencia (URLs de Cloudflare R2)
CREATE TABLE IF NOT EXISTS report_evidence (
    id VARCHAR(36) PRIMARY KEY,
    answer_id VARCHAR(36) NOT NULL,

    media_url TEXT NOT NULL,
    media_type VARCHAR(50) DEFAULT 'image/jpeg',
    captured_at TIMESTAMPTZ,

    FOREIGN KEY (answer_id) REFERENCES report_answers(id)
);

-- ============================================================
-- MANTENIMIENTO: SLAs, Preventivos, Tickets y Costos
-- ============================================================

-- Definiciones de SLA por cliente
CREATE TABLE IF NOT EXISTS sla_definitions (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    max_response_minutes INT NOT NULL,
    max_resolution_minutes INT NOT NULL,
    penalty_per_breach NUMERIC,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Planes de mantenimiento preventivo
CREATE TABLE IF NOT EXISTS preventive_schedules (
    id VARCHAR(36) PRIMARY KEY,
    forklift_id VARCHAR(36),
    client_id VARCHAR(36) NOT NULL,
    target_model VARCHAR(100),
    task_name VARCHAR(255) NOT NULL,
    frequency_type VARCHAR(20) NOT NULL,
    frequency_value INT NOT NULL,
    next_due_at TIMESTAMPTZ,
    next_due_hours NUMERIC,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (forklift_id) REFERENCES forklifts(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Tickets de Mantenimiento (correctivo y preventivo)
CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id VARCHAR(36) PRIMARY KEY,
    ticket_number BIGINT,
    report_id VARCHAR(36),
    forklift_id VARCHAR(36) NOT NULL,
    assigned_to VARCHAR(36),
    sla_id VARCHAR(36),
    schedule_id VARCHAR(36),

    status VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIA',

    created_at TIMESTAMPTZ NOT NULL,
    assigned_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    resolution_notes TEXT,

    FOREIGN KEY (report_id) REFERENCES reports(id),
    FOREIGN KEY (forklift_id) REFERENCES forklifts(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (sla_id) REFERENCES sla_definitions(id),
    FOREIGN KEY (schedule_id) REFERENCES preventive_schedules(id)
);

-- Desglose de Costos por Ticket
CREATE TABLE IF NOT EXISTS ticket_costs (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) NOT NULL,
    cost_type VARCHAR(50) NOT NULL,
    description TEXT,
    quantity NUMERIC DEFAULT 1.0,
    unit_cost NUMERIC NOT NULL,
    total_cost NUMERIC NOT NULL,
    is_billable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES maintenance_tickets(id)
);

-- ============================================================
-- INVENTARIO: Refacciones
-- ============================================================

CREATE TABLE IF NOT EXISTS parts_inventory (
    id VARCHAR(36) PRIMARY KEY,
    part_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    current_stock INT DEFAULT 0,
    min_stock INT DEFAULT 1,
    unit_cost NUMERIC,
    supplier VARCHAR(255),
    client_id VARCHAR(36),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS ticket_parts_used (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) NOT NULL,
    part_id VARCHAR(36) NOT NULL,
    quantity INT DEFAULT 1,
    FOREIGN KEY (ticket_id) REFERENCES maintenance_tickets(id),
    FOREIGN KEY (part_id) REFERENCES parts_inventory(id)
);

-- ============================================================
-- CONTRATOS: Modelo financiero
-- ============================================================

CREATE TABLE IF NOT EXISTS service_contracts (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    contract_type VARCHAR(50) NOT NULL,
    monthly_fee NUMERIC,
    hourly_rate NUMERIC,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Tabla puente: Que montacargas cubre cada contrato
CREATE TABLE IF NOT EXISTS contract_forklifts (
    id VARCHAR(36) PRIMARY KEY,
    contract_id VARCHAR(36) NOT NULL,
    forklift_id VARCHAR(36) NOT NULL,
    FOREIGN KEY (contract_id) REFERENCES service_contracts(id),
    FOREIGN KEY (forklift_id) REFERENCES forklifts(id)
);

-- ============================================================
-- NOTIFICACIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- AUDITORIA: Transparencia total
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    client_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDICES DE PERFORMANCE
-- Ejecutar solo la primera vez, uno por uno
-- ============================================================

-- CREATE UNIQUE INDEX users_email_unique ON users(email);
-- CREATE UNIQUE INDEX idx_forklifts_qr ON forklifts(qr_code_payload);
-- CREATE UNIQUE INDEX idx_parts_number ON parts_inventory(part_number);
-- CREATE INDEX idx_reports_forklift ON reports(forklift_id);
-- CREATE INDEX idx_reports_user ON reports(user_id);
-- CREATE INDEX idx_reports_captured ON reports(captured_at);
-- CREATE INDEX idx_tickets_status ON maintenance_tickets(status);
-- CREATE INDEX idx_tickets_forklift ON maintenance_tickets(forklift_id);
-- CREATE INDEX idx_tickets_assigned ON maintenance_tickets(assigned_to);
-- CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
-- CREATE INDEX idx_audit_created ON audit_log(created_at);
-- CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
-- CREATE INDEX idx_preventive_due ON preventive_schedules(next_due_at);
-- CREATE INDEX idx_forklifts_client ON forklifts(client_id);
-- CREATE INDEX idx_locations_client ON client_locations(client_id);
