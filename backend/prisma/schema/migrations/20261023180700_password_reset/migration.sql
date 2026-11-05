ALTER TABLE `users`
    ADD COLUMN `password_reset_expires` DATETIME(3) NULL,
    ADD COLUMN `password_reset_token_hash` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `users_password_reset_token_hash_key`
    ON `users`(`password_reset_token_hash`);
