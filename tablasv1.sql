CREATE TABLE montacargas (
    montacargas_id VARCHAR(36) NOT NULL PRIMARY KEY,
    cliente_id VARCHAR(36) NOT NULL,
    numero_serie VARCHAR(100),
    codigo_qr TEXT,
    horas_motor BIGINT,
    ultimo_servicio TIMESTAMPTZ
);

-- Ejecuta esto después para asegurar que el número de serie no se repita
CREATE UNIQUE INDEX montacargas_numero_serie_unico 
ON montacargas(numero_serie);


CREATE TABLE clientes (
    cliente_id VARCHAR(36) NOT NULL PRIMARY KEY,
    nombre_empresa VARCHAR(100) NOT NULL,
    contacto_nombre VARCHAR(100),
    contacto_email VARCHAR(100),
    direccion TEXT,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    usuario_id VARCHAR(36) NOT NULL PRIMARY KEY,
    cliente_id VARCHAR(36),
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,  -- Quitamos el UNIQUE de aquí
    password_hash TEXT NOT NULL,
    rol VARCHAR(20) NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reportes (
    reporte_id VARCHAR(36) NOT NULL PRIMARY KEY,
    montacargas_id VARCHAR(36) NOT NULL,
    usuario_reporto_id VARCHAR(36) NOT NULL, -- Quién abrió el ticket
    tecnico_asignado_id VARCHAR(36),         -- Quién lo está arreglando
    
    -- Detalles del problema
    tipo_falla VARCHAR(50), -- Ej: 'Frenos', 'Motor', 'Hidráulico'
    descripcion TEXT,
    foto_evidencia_url TEXT,
    prioridad VARCHAR(20) DEFAULT 'MEDIA', -- 'BAJA', 'MEDIA', 'ALTA'
    estado VARCHAR(20) DEFAULT 'ABIERTO',  -- 'ABIERTO', 'EN_PROCESO', 'CERRADO'
    
    -- RELOJES PARA TUS KPIs (Medición de tiempos)
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, -- Reporte creado
    fecha_asignacion TIMESTAMPTZ,  -- Técnico asignado (Tiempo de respuesta)
    fecha_llegada TIMESTAMPTZ,     -- Técnico llegó al sitio
    fecha_solucion TIMESTAMPTZ     -- Problema resuelto (Tiempo total)
);

CREATE UNIQUE INDEX usuarios_email_unico 
ON usuarios(email);

-- Un usuario debe pertenecer a un cliente válido (si el campo no es NULL)
ALTER TABLE usuarios ADD CONSTRAINT fk_usuario_cliente 
FOREIGN KEY (cliente_id) REFERENCES clientes(cliente_id);


-- 1. Conectar Montacargas con Clientes
-- Esto asegura que un montacargas siempre pertenezca a una empresa real
ALTER TABLE montacargas ADD CONSTRAINT fk_montacargas_cliente 
FOREIGN KEY (cliente_id) REFERENCES clientes(cliente_id);

-- 2. Conectar Reportes con Montacargas
-- Esto evita que se creen reportes de máquinas fantasmas
ALTER TABLE reportes ADD CONSTRAINT fk_reporte_montacargas 
FOREIGN KEY (montacargas_id) REFERENCES montacargas(montacargas_id);

-- 3. Conectar Reportes con el Usuario que reportó
ALTER TABLE reportes ADD CONSTRAINT fk_reporte_usuario_creador 
FOREIGN KEY (usuario_reporto_id) REFERENCES usuarios(usuario_id);

-- 4. Conectar Reportes con el Técnico asignado
ALTER TABLE reportes ADD CONSTRAINT fk_reporte_tecnico 
FOREIGN KEY (tecnico_asignado_id) REFERENCES usuarios(usuario_id);


-- !INDICES
-- Para encontrar rápido todos los montacargas de un cliente específico
CREATE INDEX idx_montacargas_cliente ON montacargas(cliente_id);

-- Para que tus dashboards carguen rápido: "Mostrar todos los tickets ABIERTOS"
CREATE INDEX idx_reportes_estado ON reportes(estado);

-- Para ver el historial de un montacargas específico rápidamente
CREATE INDEX idx_reportes_montacargas ON reportes(montacargas_id);