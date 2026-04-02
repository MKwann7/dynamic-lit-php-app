SET FOREIGN_KEY_CHECKS=0;

USE `dynlit_identity`;

INSERT INTO `whitelabel` (`id`, `name`, `owner_id`, `platform_name`, `public_domain_name`, `public_domain`, `public_domain_ssl`, `portal_domain_name`, `portal_domain`, `portal_domain_ssl`, `root_redirect`, `created_on`, `sys_row_id`) VALUES
    (1000, 'EZcard, LLC', 1000, 'EZcard','EZcard', 'maxr.docker', 0, 'EZcard Account','admin.maxr.docker',0,NULL,NOW(),UUID_TO_BIN('f9d5800d-e2bf-4c26-a5fe-b7015b6ae796'));

USE `dynlit_users`;

INSERT INTO `user` (`user_id`, `whitelabel_id`, `first_name`, `last_name`, `name_prefx`, `middle_name`, `name_sufx`, `username`, `password`, `password_reset_token`, `pin`, `email`, `phone`, `created_on`, `created_by`, `updated_by`, `status`, `preferred_name`, `avatar_url`, `last_login`, `sys_row_id`) VALUES
    (1001, 0, 'Greg', 'Sanders', '', '', '', 'GregSanders', '$2y$10$YWFhNGNhMGRlNzhiMWE2N.yyX5Kk2xtbUJqD1P0hiRFu8kx5BLfd2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '', NULL,NULL, UUID_TO_BIN('73a0d297-57e9-11ea-b088-42010a522005')),
    (1002, 0, 'Sky', 'Houston', 'Dr.', '', '', 'sky', '$2y$10$YWFhNGNhMGRlNzhiMWE2N.yyX5Kk2xtbUJqD1P0hiRFu8kx5BLfd2', NULL, NULL, 'skyhouston@protonmail.com', NULL, NULL, 1000, NULL, 'active', '', NULL, NULL, UUID_TO_BIN('83b1e3a8-68fa-11ea-c199-42010a522006')),
    (1003, 0, 'Micah', 'Zak', '', '', '', 'mz490464', '$2y$10$N2U0OThlMjg1M2FiNWFjO.sJ2FH.YA8UlTsO72yOXASj/lUl09nJi', NULL, NULL, 'micah@zakgraphix.com', NULL, NULL, 1000, NULL, 'active', '', '',NULL, UUID_TO_BIN('5865fe8b-111f-4c6f-a098-8118e5c83af2'));

-- Micah (1003) gets all admin permissions — he is the platform super-admin.
-- Regular users (1001, 1002) have no rows here and will receive token_type='user'.
INSERT INTO `user_admin_permission` (`user_id`, `permission`, `granted_by`, `granted_on`) VALUES
    (1003, 'sites.view_all',          1003, NOW()),
    (1003, 'sites.edit_all',          1003, NOW()),
    (1003, 'customers.view_all',      1003, NOW()),
    (1003, 'customers.edit_all',      1003, NOW()),
    (1003, 'platform.settings.view',  1003, NOW()),
    (1003, 'platform.settings.edit',  1003, NOW());

USE `dynlit_main`;

INSERT INTO `site` (`site_id`, `owner_id`, `site_user_id`, `whitelabel_id`, `site_version_id`, `site_type_id`, `site_name`, `domain`, `has_domain_ssl`, `vanity_url`,
    `status`, `is_template`, `template_id`, `json_data`, `site_num`, `redirect_to`, `created_on`, `created_by`, `last_updated`, `updated_by`, `sys_row_id`) VALUES
    (1000,1003,1003,1,NULL,'site','Micah Zak','micahzak.docker',1,NULL,'active',0,NULL,JSON_OBJECT(),NULL,NULL,NOW(),1003,NOW(),1003,UUID_TO_BIN(UUID()));

SET FOREIGN_KEY_CHECKS=1;