# Sistema de Gestión E-commerce — WooCommerce + MercadoLibre

Sistema web privado para la gestión centralizada de ventas en múltiples plataformas. Permite sincronizar, visualizar y administrar órdenes de **WooCommerce** y **MercadoLibre** desde un único panel, con notificaciones automáticas por correo electrónico y generación de documentos PDF.

## Tecnologías

- **Backend:** Laravel 12 (PHP)
- **Frontend:** React 18 + Inertia.js
- **Base de datos:** MySQL
- **Estilos:** Tailwind CSS
- **PDF:** barryvdh/laravel-dompdf
- **Correo:** Brevo SMTP
- **Assets:** Vite

## Funcionalidades principales

### Sincronización de órdenes
- Sincronización incremental automática con WooCommerce REST API y MercadoLibre API
- Cron jobs configurables (por defecto: cada hora vía `schedule:run`)
- Botones de sincronización manual desde el panel
- Detección de órdenes nuevas para evitar duplicados

### Panel de órdenes
- Tabla unificada con órdenes de WooCommerce y MercadoLibre
- Vista detallada por orden con datos de cliente, productos, envío y totales
- Cambio de estado de órdenes WooCommerce directamente desde el panel (sincronizado con la API)
- Descarga de etiquetas de envío PDF de MercadoLibre

### Notificaciones por correo
- Correo automático al detectar una nueva orden de WooCommerce (con PDF de la orden adjunto)
- Correo automático al detectar una nueva orden de MercadoLibre (con etiqueta de envío adjunta si está disponible)
- Correo de seguimiento cuando una etiqueta de MercadoLibre se habilita días después de la compra

### Generación de PDF
- PDF de orden WooCommerce con datos de facturación, envío o retiro local, productos, tallas y totales
- Descarga de etiquetas de envío MercadoLibre almacenadas localmente

## Estructura del proyecto

```
app/
├── Console/Commands/        # Comandos Artisan: SyncWooCommerce, SyncMercadoLibre, RefreshMlToken
├── Http/Controllers/        # OrdersController, MercadoLibreController
├── Mail/                    # Mailables: NuevaOrdenWooCommerce, NuevasOrdenesMl, EtiquetaDisponibleMl
├── Models/                  # Order, Sale, Product, MlPdf
├── Services/                # WooCommerceService, MercadoLibreService
resources/
├── js/Pages/Orders/         # Panel principal de órdenes (React + Inertia)
├── views/emails/            # Plantillas HTML de correos
├── views/pdfs/              # Plantilla PDF de órdenes WooCommerce
routes/
├── web.php                  # Rutas web
├── console.php              # Cron schedule
```

## Instalación

### Requisitos
- PHP 8.2+
- Node.js 18+
- Composer
- MySQL

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/carlosgarcia2903/sistema-mercadolibre-woocommerce.git
cd sistema-mercadolibre-woocommerce

# 2. Instalar dependencias PHP
composer install

# 3. Instalar dependencias JS y compilar assets
npm install && npm run build

# 4. Configurar entorno
cp .env.production.example .env
# Editar .env con tus credenciales

# 5. Generar clave de aplicación
php artisan key:generate

# 6. Ejecutar migraciones
php artisan migrate

# 7. Crear enlace de storage
php artisan storage:link
```

## Configuración del entorno

Copia `.env.production.example` a `.env` y completa las siguientes variables:

```env
# Base de datos
DB_DATABASE=nombre_base_de_datos
DB_USERNAME=usuario
DB_PASSWORD=contraseña

# Correo (Brevo SMTP)
MAIL_USERNAME=tu_usuario@smtp-brevo.com
MAIL_PASSWORD=tu_clave_smtp

# WooCommerce
WOOCOMMERCE_URL=https://tutienda.cl
WOOCOMMERCE_KEY=ck_xxxx
WOOCOMMERCE_SECRET=cs_xxxx

# MercadoLibre
MERCADOLIBRE_CLIENT_ID=
MERCADOLIBRE_CLIENT_SECRET=
MERCADOLIBRE_USER_ID=
MERCADOLIBRE_REDIRECT_URI=https://tudominio.cl/ml/callback
```

## Sincronización manual

```bash
# Sincronizar WooCommerce (últimas 24 horas)
php artisan sync:woocommerce

# Sincronizar desde una fecha específica
php artisan sync:woocommerce --after=2026-05-01T00:00:00.000Z

# Sincronizar MercadoLibre
php artisan sync:mercadolibre

# Renovar token de MercadoLibre
php artisan ml:refresh-token
```

## Cron en producción (cPanel)

En cPanel → Cron Jobs, agrega una tarea cada hora:

```
0 * * * * cd /ruta/del/proyecto && php artisan schedule:run >> /dev/null 2>&1
```

El schedule ejecutará las sincronizaciones a las horas configuradas en `routes/console.php`.

## Licencia

Uso privado — todos los derechos reservados.
