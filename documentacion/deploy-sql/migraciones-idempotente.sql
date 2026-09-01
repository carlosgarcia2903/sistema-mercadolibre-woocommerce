-- ============================================================================
-- Sistema GYC — SQL de migraciones (idempotente)
-- ============================================================================
-- Seguro de ejecutar sin importar qué exista ya en producción: cada tabla usa
-- CREATE TABLE IF NOT EXISTS, y cada columna/índice se agrega solo si no
-- existe (verificado contra information_schema). No borra ni modifica datos
-- existentes, solo agrega estructura faltante.
--
-- Cómo usar: pega este archivo completo en phpMyAdmin → pestaña SQL → Ejecutar,
-- sobre la base de datos de producción. Puedes correrlo más de una vez sin
-- riesgo (por eso es idempotente).
-- ============================================================================

-- ── Tablas base de Laravel (framework) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `payload` longtext NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tablas de la app (Sistema GYC) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `platform` varchar(255) NOT NULL,
  `platform_order_id` varchar(255) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) NOT NULL DEFAULT 'CLP',
  `ordered_at` timestamp NULL DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `raw_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orders_platform_index` (`platform`),
  KEY `orders_platform_order_id_index` (`platform_order_id`),
  UNIQUE KEY `orders_platform_platform_order_id_unique` (`platform`,`platform_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sku` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `stock` int DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `source_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `products_sku_index` (`sku`),
  KEY `products_source_index` (`source`),
  KEY `products_source_id_index` (`source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ml_pdfs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned DEFAULT NULL,
  `platform_shipment_id` varchar(255) DEFAULT NULL,
  `pdf_url` varchar(255) DEFAULT NULL,
  `pdf_path` varchar(255) DEFAULT NULL,
  `downloaded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ml_pdfs_platform_shipment_id_index` (`platform_shipment_id`),
  KEY `ml_pdfs_order_id_foreign` (`order_id`),
  CONSTRAINT `ml_pdfs_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_order_id_foreign` (`order_id`),
  KEY `sales_product_id_foreign` (`product_id`),
  CONSTRAINT `sales_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `size` varchar(255) DEFAULT NULL,
  `variant_source_id` varchar(255) DEFAULT NULL,
  `sku` varchar(255) DEFAULT NULL,
  `sale_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cost_price` decimal(12,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_variants_size_index` (`size`),
  KEY `product_variants_variant_source_id_index` (`variant_source_id`),
  KEY `product_variants_product_id_foreign` (`product_id`),
  UNIQUE KEY `product_variants_product_id_size_unique` (`product_id`,`size`),
  CONSTRAINT `product_variants_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- A partir de aquí: ALTER TABLE condicionales (solo si la columna/índice no
-- existe todavía). Necesario por si algunas de las tablas de arriba ya
-- existían en producción SIN estas columnas (creadas antes de esta migración).
-- ============================================================================

-- ml_pdfs.logistic_type
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ml_pdfs' AND COLUMN_NAME = 'logistic_type') = 0,
  'ALTER TABLE `ml_pdfs` ADD COLUMN `logistic_type` VARCHAR(255) NULL AFTER `platform_shipment_id`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- ml_pdfs.shipment_status
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ml_pdfs' AND COLUMN_NAME = 'shipment_status') = 0,
  'ALTER TABLE `ml_pdfs` ADD COLUMN `shipment_status` VARCHAR(255) NULL AFTER `logistic_type`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- ml_pdfs.shipment_substatus
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ml_pdfs' AND COLUMN_NAME = 'shipment_substatus') = 0,
  'ALTER TABLE `ml_pdfs` ADD COLUMN `shipment_substatus` VARCHAR(255) NULL AFTER `shipment_status`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- ml_pdfs.platform (Falabella / Paris etiquetas)
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ml_pdfs' AND COLUMN_NAME = 'platform') = 0,
  'ALTER TABLE `ml_pdfs` ADD COLUMN `platform` VARCHAR(255) NOT NULL DEFAULT ''mercadolibre'' AFTER `order_id`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ml_pdfs' AND INDEX_NAME = 'ml_pdfs_platform_index') = 0,
  'ALTER TABLE `ml_pdfs` ADD INDEX `ml_pdfs_platform_index` (`platform`)',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- sales.size
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'size') = 0,
  'ALTER TABLE `sales` ADD COLUMN `size` VARCHAR(255) NULL AFTER `product_id`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- sales.color (nueva — permite guardar el color de la variante vendida en ML)
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'color') = 0,
  'ALTER TABLE `sales` ADD COLUMN `color` VARCHAR(255) NULL AFTER `size`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- sales.variant_id (FK a product_variants)
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'variant_id') = 0,
  'ALTER TABLE `sales` ADD COLUMN `variant_id` BIGINT UNSIGNED NULL AFTER `product_id`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND CONSTRAINT_NAME = 'sales_variant_id_foreign') = 0,
  'ALTER TABLE `sales` ADD CONSTRAINT `sales_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- sales.sale_fee (comisión ML por venta)
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'sale_fee') = 0,
  'ALTER TABLE `sales` ADD COLUMN `sale_fee` DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER `unit_price`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- orders.pack_id (agrupa órdenes de un mismo pack ML)
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'pack_id') = 0,
  'ALTER TABLE `orders` ADD COLUMN `pack_id` VARCHAR(255) NULL AFTER `platform_order_id`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'orders_pack_id_index') = 0,
  'ALTER TABLE `orders` ADD INDEX `orders_pack_id_index` (`pack_id`)',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- orders.shipping_cost
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'shipping_cost') = 0,
  'ALTER TABLE `orders` ADD COLUMN `shipping_cost` DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER `total`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- orders.sale_fees
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'sale_fees') = 0,
  'ALTER TABLE `orders` ADD COLUMN `sale_fees` DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER `shipping_cost`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- orders.received_amount
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'received_amount') = 0,
  'ALTER TABLE `orders` ADD COLUMN `received_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER `sale_fees`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- products.image_path (foto del producto en el módulo "Venta en Tienda")
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'image_path') = 0,
  'ALTER TABLE `products` ADD COLUMN `image_path` VARCHAR(255) NULL AFTER `description`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- product_variants.wholesale_price (precio al comprar 3+ de la misma talla)
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_variants' AND COLUMN_NAME = 'wholesale_price') = 0,
  'ALTER TABLE `product_variants` ADD COLUMN `wholesale_price` DECIMAL(12,2) NULL AFTER `sale_price`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- product_variants.sort_order (orden manual de tallas, arrastrable en /pos)
SET @stmt := (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_variants' AND COLUMN_NAME = 'sort_order') = 0,
  'ALTER TABLE `product_variants` ADD COLUMN `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `size`',
  'SELECT 1'
));
PREPARE p FROM @stmt; EXECUTE p; DEALLOCATE PREPARE p;

-- Catálogo inicial de "Venta en Tienda" (source = 'presencial'). Solo nombres;
-- talla/precio/foto se cargan después desde /pos. No duplica si ya existen.
INSERT INTO `products` (`name`, `source`, `price`, `created_at`, `updated_at`)
SELECT * FROM (SELECT 'Body' AS name, 'presencial' AS source, 0 AS price, NOW() AS created_at, NOW() AS updated_at) t
WHERE NOT EXISTS (SELECT 1 FROM `products` WHERE source = 'presencial' AND name = t.name);

INSERT INTO `products` (`name`, `source`, `price`, `created_at`, `updated_at`)
SELECT * FROM (SELECT 'Body Beatle', 'presencial', 0, NOW(), NOW()) t
WHERE NOT EXISTS (SELECT 1 FROM `products` WHERE source = 'presencial' AND name = t.name);

INSERT INTO `products` (`name`, `source`, `price`, `created_at`, `updated_at`)
SELECT * FROM (SELECT 'Camiseta', 'presencial', 0, NOW(), NOW()) t
WHERE NOT EXISTS (SELECT 1 FROM `products` WHERE source = 'presencial' AND name = t.name);

INSERT INTO `products` (`name`, `source`, `price`, `created_at`, `updated_at`)
SELECT * FROM (SELECT 'Camiseta Beatle Panty', 'presencial', 0, NOW(), NOW()) t
WHERE NOT EXISTS (SELECT 1 FROM `products` WHERE source = 'presencial' AND name = t.name);

INSERT INTO `products` (`name`, `source`, `price`, `created_at`, `updated_at`)
SELECT * FROM (SELECT 'Polera', 'presencial', 0, NOW(), NOW()) t
WHERE NOT EXISTS (SELECT 1 FROM `products` WHERE source = 'presencial' AND name = t.name);

INSERT INTO `products` (`name`, `source`, `price`, `created_at`, `updated_at`)
SELECT * FROM (SELECT 'Polera Beatle', 'presencial', 0, NOW(), NOW()) t
WHERE NOT EXISTS (SELECT 1 FROM `products` WHERE source = 'presencial' AND name = t.name);

INSERT INTO `products` (`name`, `source`, `price`, `created_at`, `updated_at`)
SELECT * FROM (SELECT 'Pantalón buzo', 'presencial', 0, NOW(), NOW()) t
WHERE NOT EXISTS (SELECT 1 FROM `products` WHERE source = 'presencial' AND name = t.name);

INSERT INTO `products` (`name`, `source`, `price`, `created_at`, `updated_at`)
SELECT * FROM (SELECT 'Ajuar', 'presencial', 0, NOW(), NOW()) t
WHERE NOT EXISTS (SELECT 1 FROM `products` WHERE source = 'presencial' AND name = t.name);

-- ── Registrar las migraciones como "ejecutadas" en la tabla `migrations` ────
-- (para que si en el futuro tienes SSH y corres `php artisan migrate`, Laravel
-- no intente re-ejecutar estas migraciones que ya aplicamos a mano aquí)

CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '0001_01_01_000000_create_users_table' AS migration, 1 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '0001_01_01_000001_create_cache_table' AS migration, 1 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '0001_01_01_000002_create_jobs_table' AS migration, 1 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_03_14_191235_create_orders_table' AS migration, 1 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_03_14_191235_create_products_table' AS migration, 1 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_03_14_191236_create_ml_pdfs_table' AS migration, 1 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_03_14_191236_create_sales_table' AS migration, 1 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_03_15_200449_add_logistic_type_to_ml_pdfs_table' AS migration, 2 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_03_15_201727_add_shipment_status_to_ml_pdfs_table' AS migration, 2 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_03_15_212834_add_size_to_sales_table' AS migration, 2 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_06_17_120000_create_product_variants_table' AS migration, 3 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_06_17_120100_add_cost_fields_to_sales_table' AS migration, 3 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_06_22_120000_add_pack_id_to_orders_table' AS migration, 4 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_07_02_120000_add_platform_to_ml_pdfs_table' AS migration, 5 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_07_28_120000_add_color_to_sales_table' AS migration, 6 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_08_10_120000_add_image_path_to_products_table' AS migration, 7 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_08_10_120100_add_wholesale_price_to_product_variants_table' AS migration, 7 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_08_10_120200_seed_pos_initial_products' AS migration, 7 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT * FROM (SELECT '2026_08_10_130000_add_sort_order_to_product_variants_table' AS migration, 7 AS batch) t
WHERE NOT EXISTS (SELECT 1 FROM `migrations` WHERE migration = t.migration);

-- ============================================================================
-- Fin. Verifica en phpMyAdmin que las tablas orders, sales, product_variants
-- y ml_pdfs tengan todas las columnas nuevas (pack_id, color, platform, etc.)
-- ============================================================================
