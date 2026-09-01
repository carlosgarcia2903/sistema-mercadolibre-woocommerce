# Sistema GYC — Documentación del Proyecto

Sistema de gestión de e-commerce que centraliza órdenes de **WooCommerce**, **Mercado Libre**, **Falabella Seller Center**, **Paris Marketplace** y ventas **presenciales** (tienda física) en un único panel. Permite ver ventas, sincronizar órdenes, descargar etiquetas de envío, gestionar inventario, cobrar ventas en tienda y analizar rentabilidad.

> La columna `orders.platform` admite `'woocommerce'`, `'mercadolibre'`, `'falabella'`, `'paris'` y `'presencial'`. Las primeras cuatro sincronizan automáticamente desde APIs externas; `'presencial'` se genera manualmente desde el módulo **Venta en Tienda** (`/pos`, ver sección homónima más abajo). Ver el detalle de Falabella en [`documentacion/plan-integracion-falabella.md`](documentacion/plan-integracion-falabella.md) y de Paris en [`documentacion/plan-integracion-paris.md`](documentacion/plan-integracion-paris.md).

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | PHP 8.2 · Laravel 12 |
| Frontend | React 18 · Inertia.js 2 · Tailwind CSS 3 |
| Build | Vite 7 |
| Base de datos | MySQL (producción en HostGator) |
| Comunicación back↔front | Inertia.js (sin API REST separada) |
| Gráficos | Recharts 3.8 |
| Animaciones | Framer Motion 12 |
| Routing frontend | Ziggy (genera `route()` desde rutas de Laravel) |
| Email | Laravel Mail (SMTP) |
| HTTP client | Laravel Http (Guzzle) |

---

## Estructura de Directorios

```
sistemagyc/
├── app/
│   ├── Console/Commands/
│   │   ├── SyncMercadoLibre.php     # Artisan: sync:mercadolibre
│   │   ├── SyncFalabella.php        # Artisan: sync:falabella
│   │   ├── SyncParis.php            # Artisan: sync:paris
│   │   └── SyncWooCommerce.php      # Artisan: sync:woocommerce
│   ├── Http/Controllers/
│   │   ├── OrdersController.php     # Listado y sync de órdenes (agrupa packs ML)
│   │   ├── ProductsController.php   # Listado de productos
│   │   ├── PosController.php        # Venta en Tienda: catálogo, carrito, checkout
│   │   ├── RentabilidadController.php # Dashboard rentabilidad + updateCost
│   │   ├── ReportsController.php    # Inventario con edición de costos
│   │   ├── MlPdfsController.php     # Descarga de etiquetas ML
│   │   └── MercadoLibreAuthController.php # OAuth callback ML
│   ├── Mail/
│   │   ├── NuevasOrdenesMl.php      # Email de nueva orden ML (agrupa packs)
│   │   ├── EtiquetaDisponibleMl.php # Email cuando etiqueta se habilita
│   │   └── NuevaOrdenWooCommerce.php
│   ├── Models/
│   │   ├── Order.php
│   │   ├── Sale.php
│   │   ├── Product.php
│   │   ├── ProductVariant.php
│   │   └── MlPdf.php
│   └── Services/
│       ├── MercadoLibreService.php  # Cliente API ML
│       ├── FalabellaService.php     # Cliente API Falabella (firma HMAC-SHA256)
│       ├── ParisService.php         # Cliente API Paris Marketplace (API REST propia Cencosud)
│       └── WooCommerceService.php   # Cliente API WC
├── database/migrations/             # Ver sección "Base de datos"
├── resources/js/
│   ├── app.jsx                      # Entry point React/Inertia
│   └── Pages/
│       ├── Dashboard.jsx
│       ├── Orders/Index.jsx         # Tabla de órdenes con modal de detalle
│       ├── Pos/Index.jsx            # Venta en Tienda: grilla + carrito + gestión de catálogo
│       ├── Rentabilidad/Index.jsx   # Dashboard con gráficos Recharts
│       ├── Reports/
│       │   └── Inventory.jsx        # Tabla de productos + edición de costo
│       └── Products/Index.jsx
└── routes/web.php                   # Todas las rutas de la app
```

---

## Base de Datos — Esquema

### `orders`
Órdenes de WooCommerce y MercadoLibre.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | bigint PK | |
| `platform` | string | `'woocommerce'` o `'mercadolibre'` |
| `platform_order_id` | string | ID en la plataforma de origen |
| `pack_id` | string nullable | Agrupa órdenes ML que son una sola compra |
| `status` | string nullable | `paid`, `cancelled`, `delivered`, etc. |
| `total` | decimal(12,2) | Monto bruto de la orden |
| `shipping_cost` | decimal(12,2) | Costo de envío neto para el vendedor (puede ser negativo = bonificación Flex) |
| `sale_fees` | decimal(12,2) | Comisión ML total (sale_fee por unidad × cantidad) |
| `received_amount` | decimal(12,2) | `total - sale_fees - shipping_cost` |
| `currency` | string(3) | Ej: `'CLP'` |
| `ordered_at` | timestamp | Fecha de la orden |
| `customer_name` | string nullable | |
| `customer_email` | string nullable | |
| `raw_json` | json nullable | Respuesta completa de la API (debug) |

**Clave única:** `(platform, platform_order_id)`

### `sales`
Ítems individuales dentro de una orden.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | bigint PK | |
| `order_id` | FK → orders | |
| `product_id` | FK → products nullable | |
| `variant_id` | FK → product_variants nullable | |
| `size` | string nullable | Talla vendida (S, M, L, etc.) |
| `quantity` | integer | |
| `unit_price` | decimal(12,2) | Precio unitario |
| `sale_fee` | decimal(12,2) | Comisión ML por unidad |
| `total` | decimal(12,2) | `unit_price × quantity` |

### `products`
Productos sincronizados desde WooCommerce/ML, o creados manualmente para Venta en Tienda.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | bigint PK | |
| `source` | string nullable | `'woocommerce'`, `'mercadolibre'` o `'presencial'` (catálogo de tienda física) |
| `source_id` | string nullable | ID del producto en la plataforma (null si `source='presencial'`) |
| `sku` | string nullable | |
| `name` | string | |
| `description` | text nullable | |
| `image_path` | string nullable | Ruta en `storage/app/public/pos/…` (foto de producto, solo POS). Servida vía `Storage::disk('public')->url()` — requiere `php artisan storage:link` |
| `price` | decimal(12,2) | Precio de venta general (no usado por productos `presencial`, que usan `product_variants.sale_price`) |
| `stock` | integer nullable | |

### `product_variants`
Variantes por talla de cada producto. El costo se ingresa manualmente.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | bigint PK | |
| `product_id` | FK → products | |
| `size` | string nullable | Talla; `null` si el producto no tiene variantes (ej. productos únicos en POS) |
| `sort_order` | integer | Orden manual (arrastrable en `/pos`); por defecto 0 |
| `variant_source_id` | string nullable | ID de la variación en WC/ML |
| `sku` | string nullable | |
| `sale_price` | decimal(12,2) | Precio de venta unitario de la talla |
| `wholesale_price` | decimal(12,2) nullable | Precio especial al comprar 3+ unidades de **la misma talla** en Venta en Tienda (umbral en `PosController::WHOLESALE_MIN_QTY`). `null` = sin precio mayorista |
| `cost_price` | decimal(12,2) nullable | **Ingresado manualmente** en `/inventario` |

**Clave única:** `(product_id, size)`

### `ml_pdfs`
Historial de etiquetas de envío de ML y sus estados logísticos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | bigint PK | |
| `order_id` | FK → orders nullable | |
| `platform_shipment_id` | string | ID del shipment en ML |
| `logistic_type` | string nullable | `'self_service'` (Flex) o null (ML normal) |
| `shipment_status` | string nullable | `ready_to_ship`, `shipped`, `delivered`, etc. |
| `shipment_substatus` | string nullable | Subestado detallado |
| `pdf_path` | string nullable | Ruta local en `storage/app/mercadolibre/labels/` |
| `downloaded_at` | timestamp nullable | |

> Cada cambio de estado genera una nueva fila (historial). La relación `Order::latestMlPdf()` devuelve siempre la más reciente.

---

## Rutas

```
GET  /                          → redirect a /dashboard
GET  /dashboard                 → Dashboard con stats y gráfico 7 días
GET  /orders                    → Tabla de órdenes (tab: woocommerce | mercadolibre)
POST /orders/sync               → Dispara Artisan sync en tiempo real
PATCH /orders/{order}/status    → Actualiza estado en WC (solo WooCommerce)
GET  /products                  → Listado de productos
GET  /rentabilidad              → Dashboard de rentabilidad
PATCH /variants/{variant}/cost  → Guarda cost_price de una variante
GET  /ml-pdfs/{mlPdf}/download  → Descarga PDF de etiqueta (usada desde la tabla de Órdenes)
GET  /reports/inventory         → Inventario con edición de costos
GET  /pos                       → Venta en Tienda: grilla de productos + carrito
POST /pos/checkout               → Cobra el carrito y genera Order (platform='presencial')
POST /pos/products               → Crea un producto del catálogo presencial
POST /pos/products/{product}     → Actualiza nombre/foto de un producto presencial
DELETE /pos/products/{product}   → Elimina un producto presencial
POST /pos/products/{product}/variants          → Agrega una talla/precio
POST /pos/products/{product}/variants/reorder  → Guarda el orden (drag & drop) de las tallas
PATCH /pos/variants/{variant}    → Edita talla/precio/precio mayorista
DELETE /pos/variants/{variant}   → Elimina una talla
GET  /ml/callback               → OAuth callback de ML
```

Todas las rutas (excepto `/ml/callback`) requieren autenticación (`auth` middleware).

---

## Comandos Artisan

### `php artisan sync:mercadolibre`

Sincroniza órdenes de Mercado Libre.

```bash
# Solo últimas 24 horas (default)
php artisan sync:mercadolibre

# Desde una fecha específica (resync histórico)
php artisan sync:mercadolibre --after=2024-01-01T00:00:00Z

# Con offset y límite (paginación manual)
php artisan sync:mercadolibre --offset=100 --limit=50
```

**Qué hace:**
1. Llama a `/orders/search` paginando hasta agotar resultados
2. Por cada orden: calcula `sale_fees` (fee × qty), obtiene `shipping_cost` desde `/shipments/{id}/costs`
3. Guarda/actualiza `Order` y recrea `Sale`s
4. Descarga PDF de etiqueta si está disponible
5. Envía email agrupado por `pack_id` si hay órdenes nuevas

### `php artisan sync:falabella`

Sincroniza órdenes de Falabella Seller Center.

```bash
php artisan sync:falabella                              # últimas 24 h
php artisan sync:falabella --after=2026-06-01T00:00:00Z # histórico
```

**Qué hace:** `GetOrders` paginado → por cada orden `GetOrderItems` (precios, SKU, envío) → persiste `Order`/`Sale`/`Product` con `platform='falabella'` → descarga etiqueta vía `GetDocument` (guardada en `ml_pdfs` con `platform='falabella'`) → email de orden nueva. La API usa firma HMAC-SHA256 (ver `FalabellaService`). El `received_amount` es estimado (`total − envío`); la comisión de venta queda en 0 hasta integrar la API de finanzas.

### `php artisan sync:paris`

Sincroniza órdenes de Paris Marketplace.

```bash
php artisan sync:paris                              # últimas 24 h
php artisan sync:paris --after=2026-06-01T00:00:00Z # histórico
```

**Qué hace:** trae **todas** las órdenes desde `GET /v1/orders` (la API de Paris **no** es Mirakl, es una API REST propia de Cencosud — ver [`documentacion/plan-integracion-paris.md`](documentacion/plan-integracion-paris.md) para el detalle de cómo se descubrió). Cada orden ya incluye sus ítems (`subOrders[].items[]`) y su etiqueta de envío (`subOrders[].label[]`, URL directa a PDF/ZPL) — sin llamadas extra. El filtrado por `--after` se hace del lado del cliente porque la API ignora los parámetros de fecha/paginación. Persiste `Order`/`Sale`/`Product` con `platform='paris'` → descarga etiqueta (`ml_pdfs` con `platform='paris'`) → email de orden nueva. Autenticación: header `Authorization: Bearer {API_KEY}` (ver `ParisService`). El `received_amount` usa `total - comisión - envío`, tomando `commission` (real, por ítem) y `shippingCost`/`cost` que la propia orden expone — más preciso que la estimación de Falabella.

### `php artisan sync:woocommerce`

Sincroniza órdenes de WooCommerce desde la API REST de WC.

### Sync programado (scheduler)

Definido en `routes/console.php`. Todos los syncs corren a las **8:00, 11:00, 13:00, 16:00 y 20:00** (`0 8,11,13,16,20 * * *`), trayendo órdenes desde las 00:00 del día anterior:

```php
Schedule::command('sync:woocommerce')->cron('0 8,11,13,16,20 * * *');
Schedule::command('sync:mercadolibre')->cron('0 8,11,13,16,20 * * *');
Schedule::command('sync:falabella')->cron('0 8,11,13,16,20 * * *');
Schedule::command('sync:paris')->cron('0 8,11,13,16,20 * * *');
Schedule::command('ml:refresh-token')->cron('0 */5 * * *');
```

> En producción (HostGator/cPanel) requiere un cron job que ejecute `php artisan schedule:run` cada minuto. Verificar con `php artisan schedule:list`.

---

## Servicios

### `MercadoLibreService`

Cliente para la API de ML. Maneja auto-refresh del token OAuth.

| Método | Descripción |
|--------|-------------|
| `searchOrders($sellerId, $offset, $limit, $after)` | Lista órdenes paginadas |
| `getItem($itemId)` | Datos de un ítem (variaciones, tallas) |
| `getShipment($shipmentId)` | Estado del envío |
| `getShipmentNetCost($shipmentId, $logisticType)` | Costo neto de envío para el vendedor |
| `getShipmentLabel($shipmentId)` | PDF de etiqueta (binario) |
| `refreshAccessToken($persistInEnv)` | Renueva tokens y opcionalmente los persiste en `.env` |

#### Cálculo de `shipping_cost` (lógica crítica)

```
No Flex:  shipping_cost = senders[0].cost
Flex:     shipping_cost = senders[0].cost - receiver.save
          (puede ser negativo → bonificación para el vendedor)
```

El endpoint es `GET /shipments/{id}/costs`. **No viene en la orden directamente.**

### `WooCommerceService`

Cliente REST para WooCommerce. Usa Basic Auth con consumer key/secret del `.env`.

**Cambio de estado:** `updateOrderStatus($orderId, $status)` actualiza el estado directamente en WooCommerce vía `PUT /wc/v3/orders/{id}`. Se dispara desde el selector de estado en el detalle de una orden WooCommerce en `/orders` (`PATCH /orders/{order}/status` → `OrdersController::updateStatus`), que primero actualiza en WooCommerce y luego localmente — si la API falla, no se guarda el cambio local. El slug que viaja a la API es siempre el original de WooCommerce (`pending`, `processing`, `on-hold`, `completed`, `cancelled`, `refunded`, `failed`); en el frontend ([`Orders/Index.jsx`](resources/js/Pages/Orders/Index.jsx)) esos slugs se traducen a español solo para mostrar (`toSpanishOrderStatus`), nunca se envía ni se guarda el texto traducido.

**Correo de entrega:** al cambiar el estado a `completed` (y no venía ya de `completed`, para no reenviar en cada guardado), `OrdersController::updateStatus` envía [`PedidoEntregadoWooCommerce`](app/Mail/PedidoEntregadoWooCommerce.php) al `customer_email` de la orden, avisando que su pedido fue entregado. Es un correo nuestro, independiente de los correos nativos de WooCommerce (confirmación de compra, etc.), que WooCommerce sigue enviando por su cuenta según su propia configuración de Ajustes → Correos electrónicos — este sistema no los reemplaza ni los controla.

---

## Variables de Entorno (`.env`)

```env
# Base de datos
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sistemagyc
DB_USERNAME=root
DB_PASSWORD=

# MercadoLibre
MERCADOLIBRE_CLIENT_ID=
MERCADOLIBRE_CLIENT_SECRET=
MERCADOLIBRE_TOKEN=           # access_token (se renueva automáticamente)
MERCADOLIBRE_REFRESH_TOKEN=   # se actualiza automáticamente en .env
MERCADOLIBRE_USER_ID=         # seller ID numérico
MERCADOLIBRE_URL=https://api.mercadolibre.com

# WooCommerce
WOOCOMMERCE_URL=https://tu-tienda.com
WOOCOMMERCE_KEY=ck_...
WOOCOMMERCE_SECRET=cs_...

# Falabella Seller Center
FALABELLA_URL=https://sellercenter-api.falabella.com
FALABELLA_USER_ID=          # email del usuario Seller Center
FALABELLA_API_KEY=          # API key (secreto de la firma HMAC)

# Paris Marketplace (API REST propia de Cencosud, NO Mirakl)
PARIS_URL=https://api-developers.ecomm.cencosud.com
PARIS_API_KEY=               # se genera en Mi Cuenta → Integraciones

# Email
MAIL_MAILER=smtp
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=
```

---

## Flujo de Datos — Inertia.js

No existe una API REST separada. El backend pasa datos directamente a los componentes React via Inertia:

```php
// Controller
return Inertia::render('Orders/Index', [
    'orders' => $orders,      // datos paginados
    'filters' => $filters,
]);
```

```jsx
// Componente React — los props vienen del controller
export default function Index({ auth, orders, filters }) { ... }
```

Para mutaciones (guardar costo, cambiar status), se usa `axios.patch()` o `router.post()` de Inertia.

---

## Módulo: Venta en Tienda (POS)

Pantalla (`/pos`, [`PosController`](app/Http/Controllers/PosController.php) → [`Pos/Index.jsx`](resources/js/Pages/Pos/Index.jsx)) para registrar ventas presenciales (tienda física) como una plataforma más del sistema.

**Catálogo:** productos con `source='presencial'` (independientes de WooCommerce/ML). El catálogo inicial (Body, Body Beatle, Camiseta, Camiseta Beatle Panty, Polera, Polera Beatle, Pantalón buzo, Ajuar) se crea vía migración solo con el nombre — talla, precio y foto se cargan después desde la propia pantalla (botón ⚙️ en cada tarjeta), porque son datos del negocio que no correspondía inventar en el código. Un producto sin tallas configuradas (`variants` vacío) abre directo el modal de gestión al hacer clic. Un producto con una sola variante de `size = null` se agrega al carro directo, sin selector de talla (para productos únicos, sin variantes, que se irán agregando después).

**Precio mayorista:** cada `product_variant` puede tener `wholesale_price`. Se aplica cuando el carrito acumula 3+ unidades (`PosController::WHOLESALE_MIN_QTY`) de **la misma talla** — no se mezclan tallas distintas del mismo producto para alcanzar el umbral. El cálculo se hace en el frontend para la vista previa del carrito y se **recalcula en el backend** al cobrar (`PosController::checkout`), nunca se confía en el precio que manda el cliente.

**Orden de tallas:** `product_variants.sort_order` define el orden en que aparecen las tallas en el selector y en el modal de gestión; se reordena arrastrando (`framer-motion` `Reorder`) y se persiste vía `POST /pos/products/{product}/variants/reorder`.

**Al cobrar:** se crea un `Order` con `platform='presencial'`, `platform_order_id` correlativo tipo `PDV-00001` (`PosController::nextOrderNumber()`), `shipping_cost=0`, `sale_fees=0` y `received_amount = total` (no hay comisión ni envío en venta presencial). Cada línea del carrito genera un `Sale` con el precio unitario efectivo ya calculado (normal o mayorista). El nombre del cliente es opcional y no se pide email.

**Dónde se ven estas ventas:** al ser `Order`/`Sale` reales, `presencial` es un tab más en **Órdenes** (`/orders?tab=presencial`) y en **Rentabilidad** (`/rentabilidad?tab=presencial`) — igual que Falabella/Paris, sin botón de "Sincronizar" (no hay API externa, se carga solo al cobrar desde `/pos`). También se suman a los totales agregados del Dashboard (no filtra por plataforma).

**Imágenes:** se guardan en `storage/app/public/pos/` vía `Storage::disk('public')`. Requiere `php artisan storage:link` (symlink `public/storage` → `storage/app/public`) — verificar que exista en producción, ya que ahí no hay migraciones automáticas de este paso.

> **Fuera de alcance (v1):** no se descuenta stock (no hay columna de stock por talla, solo `products.stock` a nivel de producto general, no aplica a POS), no se registra método de pago, no hay boleta/comprobante imprimible.

---

## Lógica de Negocio Importante

### Pack de ML
Una compra con múltiples productos en ML genera **N órdenes** con el mismo `pack_id`. En la UI se muestran agrupadas en **una sola fila**.

- `OrdersController::index()` agrupa en memoria por `pack_id` antes de paginar
- `total` del pack = suma de todos los `order.total`
- `shipping_cost` del pack = `max()` de los shipping_cost (el mismo shipment aparece en todas)
- `received_amount` del pack = `total_pack - sale_fees_pack - shipping_cost_pack`

### Rentabilidad — Received proporcional
Para distribuir el `received_amount` de una orden entre sus productos:

```
received_por_sale = order.received_amount × (sale.total / suma_totals_en_esa_orden)
```

### Flex (self_service) vs ML normal
- `logistic_type = 'self_service'` → envío Flex (el vendedor lleva el paquete)
- Para Flex: `receiver.save` en `/costs` es una bonificación que recibe el vendedor
- El costo neto puede ser **negativo** (el vendedor gana dinero con el envío)

### Cálculo de `sale_fees`
La API de ML devuelve `sale_fee` **por unidad**. Se debe multiplicar por `quantity`:

```php
$saleFees = collect($order_items)->sum(
    fn ($i) => (float) $i['sale_fee'] * (int) $i['quantity']
);
```

### Estados excluidos en rentabilidad
`cancelled`, `canceled`, `refunded`, `returned`

---

## Producción

- **Hosting:** HostGator (cPanel)
- **Usuario cPanel:** `carl1309`
- **IP:** `69.6.225.245`
- **Deploy:** FTP manual al directorio del dominio
- **SSH:** puerto 2222 (requiere habilitación por soporte de HostGator)
- **DB en producción:** administrar via phpMyAdmin en cPanel

### Pasos para deploy

1. Compilar assets: `npm run build`
2. Subir via FTP:
   - `app/` — controllers, models, services, commands
   - `public/build/` — assets compilados (carpeta completa)
   - `routes/web.php`
   - `database/migrations/` si hay migraciones nuevas
3. En phpMyAdmin: ejecutar el SQL de migraciones nuevas manualmente (ver [`documentacion/deploy-sql/migraciones-idempotente.sql`](documentacion/deploy-sql/migraciones-idempotente.sql), seguro de re-ejecutar)
4. Si se modificaron rutas: `php artisan route:clear` (via terminal o script en cPanel)
5. Si es la primera vez que se sube el módulo de Venta en Tienda (o cualquier feature con subida de imágenes): verificar que exista el symlink `public/storage` → `storage/app/public` (`php artisan storage:link`, o crearlo a mano por FTP/cPanel si no hay SSH) — sin esto las fotos de productos no se ven.

> **Importante:** No importar la base de datos local a producción — ambas tienen órdenes reales. Solo ejecutar el DDL de migraciones nuevas.

---

## Convenciones de Código

- **PHP:** PSR-4, sin tipos en propiedades de modelo (se usan `$fillable` y `$casts`)
- **React:** Componentes funcionales, sin TypeScript
- **Estilos:** Tailwind CSS puro, sin CSS custom salvo excepciones
- **Formato de moneda:** `Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })` en el frontend; `round()` en el backend (sin decimales para CLP)
- **Sin comentarios innecesarios:** solo se comentan invariantes no obvias o workarounds de la API de ML
- **Costo de variantes:** se ingresa manualmente en `/inventario`, nunca se sobreescribe en el sync
