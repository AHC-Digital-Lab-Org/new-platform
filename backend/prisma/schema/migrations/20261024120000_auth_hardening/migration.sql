ALTER TABLE `users`
    MODIFY `pais` VARCHAR(191) NULL,
    ADD COLUMN `totp_last_counter` INTEGER NULL;
