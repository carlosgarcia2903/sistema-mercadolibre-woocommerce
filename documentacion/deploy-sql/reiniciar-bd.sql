-- ============================================================================
-- Sistema GYC — VACIAR la base de datos (borra TODAS las tablas y datos)
-- ============================================================================
-- DESTRUCTIVO E IRREVERSIBLE. Antes de ejecutarlo, haz un respaldo en
-- phpMyAdmin → pestaña "Exportar" → método "Rápido" → formato SQL → Continuar.
--
-- Qué hace: elimina las tablas de la app (no el usuario ni la base de datos de
-- MySQL, así el .env sigue funcionando). Después ejecuta
-- migraciones-idempotente.sql para recrear todo desde cero.
--
-- Cómo usar: phpMyAdmin → selecciona la base de datos → pestaña SQL → pega y
-- ejecuta este archivo, y a continuación migraciones-idempotente.sql.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `sales`;
DROP TABLE IF EXISTS `ml_pdfs`;
DROP TABLE IF EXISTS `product_variants`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `failed_jobs`;
DROP TABLE IF EXISTS `job_batches`;
DROP TABLE IF EXISTS `jobs`;
DROP TABLE IF EXISTS `cache_locks`;
DROP TABLE IF EXISTS `cache`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `password_reset_tokens`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `migrations`;

SET FOREIGN_KEY_CHECKS = 1;

-- Verifica que no quedó ninguna tabla (debe devolver 0 filas). Si aparece alguna
-- que no estaba en la lista de arriba, bórrala a mano desde la pestaña Estructura.
SHOW TABLES;
