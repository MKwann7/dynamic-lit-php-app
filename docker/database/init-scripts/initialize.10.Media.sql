-- --------------------------------------------------------
-- Updated for MySQL 8.4
-- SysRowIds now use BINARY(16)
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE IF NOT EXISTS `maxr_media`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `maxr_media`;

DROP TABLE IF EXISTS `image`;
CREATE TABLE `image` (
     `image_id` INT NOT NULL AUTO_INCREMENT,
     `parent_id` INT DEFAULT NULL COMMENT 'ParentId',
     `version_id` INT DEFAULT NULL COMMENT 'VersionId',
     `whitelabel_id` INT DEFAULT NULL COMMENT 'WhiteLabelId',
     `user_id` INT DEFAULT NULL COMMENT 'UserId',
     `entity_id` INT DEFAULT NULL COMMENT 'EntityId',
     `entity_name` VARCHAR(45) NOT NULL COMMENT 'EntityName',
     `image_class` VARCHAR(25) NOT NULL DEFAULT 'avatar' COMMENT 'ImageClass',
     `title` VARCHAR(150) NOT NULL COMMENT 'Title',
     `url` VARCHAR(200) NOT NULL COMMENT 'Url',
     `thumb` VARCHAR(200) NOT NULL COMMENT 'Thumb',
     `width` INT DEFAULT NULL COMMENT 'Width',
     `height` INT DEFAULT NULL COMMENT 'Height',
     `x_offset` INT DEFAULT NULL COMMENT 'Xoffset',
     `y_offset` INT DEFAULT NULL COMMENT 'Yoffset',
     `type` VARCHAR(15) NOT NULL COMMENT 'Type',
     `created_on` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'CreatedOn',
     `created_by` INT NOT NULL COMMENT 'CreatedBy',
     `last_updated` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'LastUpdated',
     `updated_by` INT NOT NULL COMMENT 'UpdatedBy',
     `sys_row_id` BINARY(16) NOT NULL COMMENT 'SysRowId',
     PRIMARY KEY (`image_id`),
     KEY `idx_image_user_id` (`user_id`),
     KEY `idx_image_entity_id` (`entity_id`),
     KEY `idx_image_entity_name` (`entity_name`),
     KEY `idx_image_class` (`image_class`),
     KEY `idx_image_created_on` (`created_on`),
     KEY `idx_image_last_updated` (`last_updated`),
     KEY `idx_image_sys_row_id` (`sys_row_id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='ImageTable for Maxr 1.0';

DROP TRIGGER IF EXISTS `tgr_image_sysrowid`;

SET @OLDTMP_SQL_MODE=@@SQL_MODE;
SET SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

DELIMITER //

CREATE TRIGGER `tgr_image_sysrowid`
    BEFORE INSERT ON `image`
    FOR EACH ROW
BEGIN
    IF NEW.sys_row_id IS NULL OR NEW.sys_row_id = UNHEX(REPEAT('00', 16)) THEN
        SET NEW.sys_row_id = UUID_TO_BIN(UUID());
END IF;
END//

DELIMITER ;

SET SQL_MODE=@OLDTMP_SQL_MODE;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;