/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

SET GLOBAL log_bin_trust_function_creators = 1;

-- Dumping database structure for maxr_users
CREATE DATABASE IF NOT EXISTS `maxr_users` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `maxr_users`;

CREATE TABLE IF NOT EXISTS `user` (
    `user_id` INT NOT NULL AUTO_INCREMENT COMMENT 'UserId',
    `whitelabel_id` INT DEFAULT 0 COMMENT 'CompanyId',
    `first_name` VARCHAR(50) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT 'FirstName',
    `last_name` VARCHAR(50) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT 'LastName',
    `name_prefx` VARCHAR(20) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT 'NamePrefix',
    `middle_name` VARCHAR(45) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT 'MiddleName',
    `name_sufx` VARCHAR(15) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT 'NameSuffix',
    `username` VARCHAR(35) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT 'UserName',
    `password` VARCHAR(255) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT 'Password',
    `password_reset_token` BINARY(16) DEFAULT NULL COMMENT 'PasswordResetToken',
    `pin` INT DEFAULT NULL COMMENT 'Pin',
    `email` VARCHAR(45) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT 'UserEmail',
    `phone` VARCHAR(35) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT 'UserPhone',
    `created_on` DATETIME DEFAULT NULL COMMENT 'CreatedOn',
    `created_by` INT DEFAULT NULL COMMENT 'CreatedBy',
    `last_updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'LastUpdated',
    `updated_by` INT DEFAULT NULL COMMENT 'UpdatedBy',
    `status` VARCHAR(15) CHARACTER SET utf8mb4 DEFAULT 'Active' COMMENT 'Status',
    `preferred_name` VARCHAR(50) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT 'PreferredName',
    `avatar_url` VARCHAR(255) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT 'AvatarUrl',
    `last_login` DATETIME DEFAULT NULL COMMENT 'LastLogin',
    `sys_row_id` BINARY(16) DEFAULT NULL COMMENT 'SysRowId',
    PRIMARY KEY (`user_id`),
    UNIQUE KEY `ux_user_sys_row_id` (`sys_row_id`),
    UNIQUE KEY `ux_user_email` (`email`),
    UNIQUE KEY `ux_username` (`username`),
    UNIQUE KEY `ux_user_phone` (`phone`),
    KEY `ix_user_whitelabel_id` (`whitelabel_id`),
    KEY `ix_user_status` (`status`),
    KEY `ix_user_created_by` (`created_by`),
    KEY `ix_user_updated_by` (`updated_by`),
    KEY `ix_user_first_name` (`first_name`),
    KEY `ix_user_last_name` (`last_name`),
    KEY `ix_user_email` (`email`),
    KEY `ix_user_username` (`username`),
    KEY `ix_user_password_reset_token` (`password_reset_token`),
    KEY `ix_user_last_login` (`last_login`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User Table for Maxr 1.0';

SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `tgr_user_sysrowid`
    BEFORE INSERT ON `user`
    FOR EACH ROW
BEGIN
    IF NEW.sys_row_id IS NULL OR NEW.sys_row_id = '' THEN
        SET NEW.sys_row_id = UUID_TO_BIN(UUID());
END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

CREATE TABLE IF NOT EXISTS `user_login` (
    `user_login_id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT DEFAULT NULL,
    `login_on` DATETIME NOT NULL,
    `success` TINYINT(1) NOT NULL DEFAULT 0,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `user_agent` VARCHAR(255) DEFAULT NULL,
    `failure_reason` VARCHAR(255) DEFAULT NULL,
    `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `sys_row_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
    PRIMARY KEY (`user_login_id`),
    UNIQUE KEY `ux_user_login_sys_row_id` (`sys_row_id`),
    KEY `ix_user_login_user_id` (`user_id`),
    KEY `ix_user_login_login_on` (`login_on`),
    KEY `ix_user_login_success` (`success`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User login audit table for Maxr 1.0';

-- ---------------------------------------------------------------------------
-- Fine-grained admin permission grants (1 user → N permissions)
-- ---------------------------------------------------------------------------
-- Permission keys use dot-namespaced strings, e.g. 'sites.view_all'.
-- Any user with at least one active, non-expired row gets token_type='admin'.
-- expires_on = NULL means the grant never expires.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_admin_permission` (
    `id`          INT         NOT NULL AUTO_INCREMENT,
    `user_id`     INT         NOT NULL COMMENT 'FK → user.user_id',
    `permission`  VARCHAR(64) NOT NULL COMMENT 'e.g. sites.view_all, platform.settings.edit',
    `granted_by`  INT         DEFAULT NULL COMMENT 'user_id of the granting admin',
    `granted_on`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_on`  DATETIME    DEFAULT NULL COMMENT 'NULL = never expires',
    `is_active`   TINYINT(1)  NOT NULL DEFAULT 1,
    `sys_row_id`  BINARY(16)  DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ux_uap_user_permission`  (`user_id`, `permission`),
    KEY `ix_uap_user_id`                (`user_id`),
    KEY `ix_uap_permission`             (`permission`),
    KEY `ix_uap_is_active`              (`is_active`),
    KEY `ix_uap_expires_on`             (`expires_on`),
    CONSTRAINT `fk_uap_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Fine-grained admin permission grants per user';

SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `tgr_user_admin_permission_sysrowid`
    BEFORE INSERT ON `user_admin_permission`
    FOR EACH ROW
BEGIN
    IF NEW.sys_row_id IS NULL OR NEW.sys_row_id = '' THEN
        SET NEW.sys_row_id = UUID_TO_BIN(UUID());
    END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

