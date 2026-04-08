/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

SET GLOBAL log_bin_trust_function_creators = 1;

-- Dumping database structure for dynlit_identity
CREATE DATABASE IF NOT EXISTS `dynlit_identity` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `dynlit_identity`;

CREATE TABLE IF NOT EXISTS `whitelabel` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `owner_id` BIGINT UNSIGNED DEFAULT NULL,
    `platform_name` VARCHAR(100) NOT NULL,

    -- Public Domain
    `public_domain_name` VARCHAR(100) DEFAULT NULL,
    `public_domain` VARCHAR(255) NOT NULL,
    `public_domain_ssl` TINYINT(1) NOT NULL DEFAULT 0,

    -- Portal Domain
    `portal_domain_name` VARCHAR(100) DEFAULT NULL,
    `portal_domain` VARCHAR(255) DEFAULT NULL,
    `portal_domain_ssl` TINYINT(1) NOT NULL DEFAULT 0,

    -- Optional domains (future expansion)
    `media_domain` VARCHAR(255) DEFAULT NULL,
    `media_domain_ssl` TINYINT(1) NOT NULL DEFAULT 0,
    `ws_domain` VARCHAR(255) DEFAULT NULL,
    `ws_domain_ssl` TINYINT(1) NOT NULL DEFAULT 0,

    -- Redirect behavior
    `root_redirect` VARCHAR(255) DEFAULT NULL,

    -- Metadata
    `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_updated_on` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- UUID (binary for performance)
    `sys_row_id` BINARY(16) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `ux_sys_row_id` (`sys_row_id`),

    -- Critical lookup indexes (used by your resolver)
    KEY `idx_public_domain` (`public_domain`, `public_domain_ssl`),
    KEY `idx_portal_domain` (`portal_domain`, `portal_domain_ssl`),

    KEY `idx_owner_id` (`owner_id`),
    KEY `idx_created_on` (`created_on`),
    KEY `idx_last_updated_on` (`last_updated_on`)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;

SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `tgr_whitelabel_sysrowid`
    BEFORE INSERT ON `whitelabel`
    FOR EACH ROW
BEGIN
    IF NEW.sys_row_id IS NULL OR NEW.sys_row_id = '' THEN
        SET NEW.sys_row_id = UUID_TO_BIN(UUID());
END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

CREATE TABLE IF NOT EXISTS domain_ssl (
    domain_ssl_id INT NOT NULL AUTO_INCREMENT,
    whitelabel_id INT DEFAULT NULL,
    site_id INT DEFAULT NULL,
    domain VARCHAR(255) NOT NULL,
    is_lets_encrypt TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether this certificate was issued by Let''s Encrypt',
    challenge_type ENUM('http-01','dns-01') NOT NULL DEFAULT 'http-01',
    status ENUM('pending','active','failed','expired') NOT NULL DEFAULT 'pending',
    cert_pem MEDIUMTEXT DEFAULT NULL,
    fullchain_pem MEDIUMTEXT DEFAULT NULL,
    key_pem MEDIUMTEXT DEFAULT NULL,
    issuer VARCHAR(255) DEFAULT NULL,
    serial_number VARCHAR(255) DEFAULT NULL,
    not_before DATETIME DEFAULT NULL,
    expires DATETIME DEFAULT NULL,
    last_renewed_at DATETIME DEFAULT NULL,
    last_checked_at DATETIME DEFAULT NULL,
    last_error TEXT DEFAULT NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (domain_ssl_id),
    UNIQUE KEY ux_domain (domain),
    KEY idx_expires (expires),
    KEY idx_status (status)
    )
    ENGINE=InnoDB
    CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='DomainSslTable for DynLit 1.0';
