-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `alias` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NULL,
    `password_hash` VARCHAR(191) NULL,
    `tipo_usuario` VARCHAR(191) NOT NULL DEFAULT 'usuario_registrado',
    `ciudad` VARCHAR(191) NULL,
    `pais` VARCHAR(191) NOT NULL DEFAULT 'España',
    `fecha_alta` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `consentimientos` JSON NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'pendiente_verificacion',
    `email_verificado` BOOLEAN NOT NULL DEFAULT false,
    `totp_secret` VARCHAR(191) NULL,
    `two_factor_on` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `users_alias_key`(`alias`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
