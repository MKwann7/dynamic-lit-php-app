/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

SET GLOBAL log_bin_trust_function_creators = 1;

CREATE DATABASE IF NOT EXISTS `dynlit_components`
    /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `dynlit_components`;

CREATE TABLE component (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    active_version_id BIGINT UNSIGNED NULL,
    name VARCHAR(255) NOT NULL,
    tag VARCHAR(100) NOT NULL,
    el_name VARCHAR(100) NOT NULL,
    uri VARCHAR(255) NULL,
    framework VARCHAR(50) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    public_id BINARY(16)  NOT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_component_tag (tag),
    UNIQUE KEY uq_component_el_name (el_name),
    UNIQUE KEY uq_component_public_id (public_id),

    KEY idx_component_framework (framework),
    KEY idx_component_active_version_id (active_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `tgr_component_public_id`
    BEFORE INSERT ON `component`
    FOR EACH ROW
BEGIN
    IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
        SET NEW.public_id = UUID_TO_BIN(UUID());
END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

CREATE TABLE component_version (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    component_id BIGINT UNSIGNED NOT NULL,

    version VARCHAR(50) NOT NULL,
    version_sort INT GENERATED ALWAYS AS (
       CAST(REPLACE(REPLACE(version, '.', ''), '-', '') AS UNSIGNED)
       ) STORED,

    entry_path VARCHAR(1024) NOT NULL,
    css_path VARCHAR(1024) NULL,

    integrity VARCHAR(255) NULL,

    render_mode VARCHAR(25) NOT NULL,
    theme_aware BOOLEAN NOT NULL DEFAULT TRUE,
    expose_parts JSON NULL,

    breadcrumb_label VARCHAR(100) NULL,

    exports_json JSON NOT NULL,
    manifest_json JSON NULL,

    status ENUM('draft', 'active', 'inactive') NOT NULL DEFAULT 'draft',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_component_version (component_id, version),
    KEY idx_component_version_component (component_id),
    KEY idx_component_version_status (status),

    CONSTRAINT fk_component_version_component
       FOREIGN KEY (component_id)
           REFERENCES component(id)
           ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE component_dependency (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    component_version_id BIGINT UNSIGNED NOT NULL,
    dependency_component_id BIGINT UNSIGNED NOT NULL,

    required BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    type VARCHAR(25) NOT NULL DEFAULT 'inline',  -- inline | standalone | slot | parent-slot
    mount_id VARCHAR(36) NULL,
    path VARCHAR(512) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_dependency_component_version (component_version_id),
    KEY idx_dependency_component (dependency_component_id),

    CONSTRAINT fk_dependency_component_version
      FOREIGN KEY (component_version_id)
          REFERENCES component_version(id)
          ON DELETE CASCADE,

    CONSTRAINT fk_dependency_component
      FOREIGN KEY (dependency_component_id)
          REFERENCES component(id)
          ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE component_route (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    uri VARCHAR(512) NOT NULL,
    component_id BIGINT UNSIGNED NOT NULL,

    is_public BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_route_uri (uri),
    KEY idx_route_component (component_id),
    KEY idx_route_uri (uri),

    CONSTRAINT fk_route_component
     FOREIGN KEY (component_id)
         REFERENCES component(id)
         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE component
    ADD CONSTRAINT fk_component_active_version
        FOREIGN KEY (active_version_id)
            REFERENCES component_version(id)
            ON DELETE SET NULL;

/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;