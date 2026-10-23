ALTER TABLE `users`
    ADD COLUMN `email_verification_expires` DATETIME(3) NULL,
    ADD COLUMN `email_verification_token_hash` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `users_email_verification_token_hash_key`
    ON `users`(`email_verification_token_hash`);
