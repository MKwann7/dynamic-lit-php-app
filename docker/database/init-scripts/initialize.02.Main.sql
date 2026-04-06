/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

SET GLOBAL log_bin_trust_function_creators = 1;

-- Dumping database structure for dynlit_users
CREATE DATABASE IF NOT EXISTS `dynlit_main` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `dynlit_main`;

CREATE TABLE IF NOT EXISTS `site` (
    `site_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `owner_id` BIGINT UNSIGNED DEFAULT NULL,
    `site_user_id` BIGINT UNSIGNED DEFAULT NULL,
    `whitelabel_id` BIGINT UNSIGNED DEFAULT NULL,
    `site_version_id` BIGINT UNSIGNED DEFAULT NULL,

    `site_type_id` ENUM('site', 'group', 'persona') NOT NULL DEFAULT 'site',

    `site_name` VARCHAR(255) NOT NULL,
    `domain` VARCHAR(100) NOT NULL,
    `has_domain_ssl` TINYINT(1) NOT NULL DEFAULT 0,

    `vanity_url` VARCHAR(45) DEFAULT NULL,

    `status` ENUM('active', 'inactive', 'canceled', 'suspended') NOT NULL DEFAULT 'inactive',

    `is_template` TINYINT(1) NOT NULL DEFAULT 0,
    `template_id` BIGINT UNSIGNED DEFAULT NULL,

    `json_data` JSON DEFAULT NULL,

    `site_num` BIGINT UNSIGNED DEFAULT NULL,
    `redirect_to` BIGINT UNSIGNED DEFAULT NULL,

    `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,

    `last_updated` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT UNSIGNED DEFAULT NULL,

    `sys_row_id` BINARY(16) NOT NULL,

    PRIMARY KEY (`site_id`),

    UNIQUE KEY `ux_domain` (`domain`),
    UNIQUE KEY `ux_sys_row_id` (`sys_row_id`),

    KEY `idx_whitelabel_id` (`whitelabel_id`),
    KEY `idx_owner_id` (`owner_id`),
    KEY `idx_status` (`status`),
    KEY `idx_site_type` (`site_type_id`),
    KEY `idx_created_on` (`created_on`),
    KEY `idx_last_updated` (`last_updated`)

    ) ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;

SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `tgr_site_sysrowid`
    BEFORE INSERT ON `site`
    FOR EACH ROW
BEGIN
    IF NEW.sys_row_id IS NULL OR NEW.sys_row_id = '' THEN
        SET NEW.sys_row_id = UUID_TO_BIN(UUID());
END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;