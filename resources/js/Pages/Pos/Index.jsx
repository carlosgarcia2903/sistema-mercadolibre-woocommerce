import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, router, usePage } from '@inertiajs/react';
import { Reorder, useDragControls } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const fmt = (n) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

export default function Index({ products, wholesaleMinQty }) {
    const { flash } = usePage().props;

    const [cart, setCart] = useState({}); // { [variantId]: {variant_id, product_id, product_name, size, sale_price, wholesale_price, quantity} }
    const [customerName, setCustomerName] = useState('');
    const [pickerProduct, setPickerProduct] = useState(null); // producto abierto en el modal de tallas
    const [manageProduct, setManageProduct] = useState(null); // producto abierto en el modal de gestión
    const [showNewProduct, setShowNewProduct] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const lines = useMemo(() => Object.values(cart).sort((a, b) => a.product_name.localeCompare(b.product_name)), [cart]);

    const lineUnitPrice = (line) =>
        line.wholesale_price != null && line.quantity >= wholesaleMinQty ? line.wholesale_price : line.sale_price;

    const total = lines.reduce((sum, l) => sum + lineUnitPrice(l) * l.quantity, 0);
    const totalUnits = lines.reduce((sum, l) => sum + l.quantity, 0);

    function addToCart(product, variant, qty = 1) {
        setCart((prev) => {
            const key = String(variant.id);
            const existing = prev[key];
            const quantity = (existing?.quantity || 0) + qty;
            return {
                ...prev,
                [key]: {
                    variant_id: variant.id,
                    product_id: product.id,
                    product_name: product.name,
                    size: variant.size,
                    sale_price: variant.sale_price,
                    wholesale_price: variant.wholesale_price,
                    quantity,
                },
            };
        });
    }

    function setQty(variantId, qty) {
        setCart((prev) => {
            const key = String(variantId);
            if (qty <= 0) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return { ...prev, [key]: { ...prev[key], quantity: qty } };
        });
    }

    function removeLine(variantId) {
        setQty(variantId, 0);
    }

    function clearCart() {
        setCart({});
        setCustomerName('');
    }

    function onCardClick(product) {
        if (product.variants.length === 0) {
            setManageProduct(product);
            return;
        }
        if (product.variants.length === 1 && !product.variants[0].size) {
            addToCart(product, product.variants[0], 1);
            return;
        }
        setPickerProduct(product);
    }

    function checkout() {
        if (lines.length === 0 || submitting) return;
        setSubmitting(true);
        router.post(
            route('pos.checkout'),
            {
                customer_name: customerName || null,
                items: lines.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity })),
            },
            {
                preserveScroll: true,
                onSuccess: () => clearCart(),
                onFinish: () => setSubmitting(false),
            }
        );
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold">Venta en Tienda</h2>}>
            <Head title="Venta en Tienda" />

            {flash?.success && (
                <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 text-sm">
                    {flash.success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
                {/* Grilla de productos */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Toca un producto para agregarlo al carro.</p>
                        <button
                            onClick={() => setShowNewProduct(true)}
                            className="px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                        >
                            + Nuevo producto
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onClick={() => onCardClick(product)}
                                onManage={() => setManageProduct(product)}
                            />
                        ))}
                    </div>
                </div>

                {/* Carrito */}
                <div className="lg:sticky lg:top-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Carro de compra</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{totalUnits} unidad{totalUnits !== 1 ? 'es' : ''}</p>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                        {lines.length === 0 && (
                            <p className="px-5 py-8 text-center text-sm text-gray-400">Carro vacío</p>
                        )}
                        {lines.map((line) => {
                            const unitPrice = lineUnitPrice(line);
                            const isWholesale = line.wholesale_price != null && line.quantity >= wholesaleMinQty;
                            return (
                                <div key={line.variant_id} className="px-5 py-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{line.product_name}</p>
                                            {line.size && <p className="text-xs text-gray-500 dark:text-gray-400">Talla {line.size}</p>}
                                            {isWholesale && (
                                                <span className="inline-block mt-1 text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                    Precio x{wholesaleMinQty}+ aplicado
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removeLine(line.variant_id)}
                                            className="text-gray-400 hover:text-red-500 text-sm"
                                            title="Quitar"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setQty(line.variant_id, line.quantity - 1)}
                                                className="w-7 h-7 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                                            >
                                                −
                                            </button>
                                            <span className="w-6 text-center text-sm font-medium">{line.quantity}</span>
                                            <button
                                                onClick={() => setQty(line.variant_id, line.quantity + 1)}
                                                className="w-7 h-7 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(unitPrice * line.quantity)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 space-y-3">
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Cliente (opcional)"
                            className="w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm"
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                            <span className="text-xl font-bold text-gray-900 dark:text-white">{fmt(total)}</span>
                        </div>
                        <button
                            onClick={checkout}
                            disabled={lines.length === 0 || submitting}
                            className="w-full py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? 'Procesando…' : 'Cobrar'}
                        </button>
                        {lines.length > 0 && (
                            <button onClick={clearCart} className="w-full text-xs text-gray-400 hover:text-red-500">
                                Vaciar carro
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {pickerProduct && (
                <SizePickerModal
                    product={pickerProduct}
                    wholesaleMinQty={wholesaleMinQty}
                    onAdd={(variant) => addToCart(pickerProduct, variant, 1)}
                    onClose={() => setPickerProduct(null)}
                    onManage={() => {
                        setManageProduct(pickerProduct);
                        setPickerProduct(null);
                    }}
                />
            )}

            {manageProduct && (
                <ManageProductModal
                    product={products.find((p) => p.id === manageProduct.id) || manageProduct}
                    onClose={() => setManageProduct(null)}
                />
            )}

            {showNewProduct && <NewProductModal onClose={() => setShowNewProduct(false)} />}
        </AuthenticatedLayout>
    );
}

function ProductCard({ product, onClick, onManage }) {
    const hasVariants = product.variants.length > 0;

    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow">
            <button onClick={onClick} className="block w-full text-left">
                <div className="aspect-square bg-gray-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl opacity-30">👕</span>
                    )}
                </div>
                <div className="px-3 py-2.5">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                    {!hasVariants ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400">Sin tallas/precio</p>
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {product.variants.length === 1 && !product.variants[0].size
                                ? fmt(product.variants[0].sale_price)
                                : `${product.variants.length} talla${product.variants.length !== 1 ? 's' : ''}`}
                        </p>
                    )}
                </div>
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onManage();
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-900/90 shadow flex items-center justify-center text-gray-500 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Gestionar producto"
            >
                ⚙️
            </button>
        </div>
    );
}

function SizePickerModal({ product, wholesaleMinQty, onAdd, onClose, onManage }) {
    return (
        <Modal show onClose={onClose} maxWidth="sm">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                    <button onClick={onManage} className="text-xs text-indigo-600 hover:text-indigo-800">
                        Editar tallas
                    </button>
                </div>
                <div className="space-y-2">
                    {product.variants.map((variant) => (
                        <button
                            key={variant.id}
                            onClick={() => onAdd(variant)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
                        >
                            <span className="font-medium text-gray-900">{variant.size || 'Talla única'}</span>
                            <span className="text-sm text-gray-600">
                                {fmt(variant.sale_price)}
                                {variant.wholesale_price != null && (
                                    <span className="text-amber-600"> · {wholesaleMinQty}+ = {fmt(variant.wholesale_price)}</span>
                                )}
                            </span>
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="mt-4 w-full py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                    Listo
                </button>
            </div>
        </Modal>
    );
}

function VariantRow({ variant, onUpdate, onDelete, onDragEnd }) {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={variant}
            dragListener={false}
            dragControls={controls}
            onDragEnd={onDragEnd}
            className="flex items-center gap-2 bg-white rounded-lg"
        >
            <span
                onPointerDown={(e) => controls.start(e)}
                className="shrink-0 w-5 text-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing select-none touch-none"
                title="Arrastrar para ordenar"
            >
                ⠿
            </span>
            <input
                type="text"
                defaultValue={variant.size || ''}
                onBlur={(e) => onUpdate('size', e.target.value)}
                placeholder="Talla (vacío = única)"
                className="w-32 rounded-lg border-gray-300 text-sm"
            />
            <input
                type="number"
                min="0"
                step="1"
                defaultValue={variant.sale_price}
                onBlur={(e) => onUpdate('sale_price', e.target.value)}
                placeholder="Precio"
                className="w-28 rounded-lg border-gray-300 text-sm"
            />
            <input
                type="number"
                min="0"
                step="1"
                defaultValue={variant.wholesale_price ?? ''}
                onBlur={(e) => onUpdate('wholesale_price', e.target.value)}
                placeholder="Precio 3+"
                className="w-28 rounded-lg border-gray-300 text-sm"
            />
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500 text-sm px-1">
                ✕
            </button>
        </Reorder.Item>
    );
}

function ManageProductModal({ product, onClose }) {
    const [name, setName] = useState(product.name);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(product.image_url);
    const [savingInfo, setSavingInfo] = useState(false);

    const [items, setItems] = useState(product.variants);
    useEffect(() => setItems(product.variants), [product.variants]);

    function persistOrder(newItems) {
        router.post(
            route('pos.variants.reorder', product.id),
            { variant_ids: newItems.map((v) => v.id) },
            { preserveScroll: true, only: ['products'] }
        );
    }

    const [newSize, setNewSize] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newWholesale, setNewWholesale] = useState('');
    const [addingVariant, setAddingVariant] = useState(false);

    function saveInfo(e) {
        e.preventDefault();
        setSavingInfo(true);
        const formData = new FormData();
        formData.append('name', name);
        if (imageFile) formData.append('image', imageFile);
        router.post(route('pos.products.update', product.id), formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setSavingInfo(false),
        });
    }

    function onFileChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    }

    function addVariant(e) {
        e.preventDefault();
        if (!newPrice) return;
        setAddingVariant(true);
        router.post(
            route('pos.variants.store', product.id),
            { size: newSize || null, sale_price: newPrice, wholesale_price: newWholesale || null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewSize('');
                    setNewPrice('');
                    setNewWholesale('');
                },
                onFinish: () => setAddingVariant(false),
            }
        );
    }

    function updateVariant(variant, field, value) {
        router.patch(
            route('pos.variants.update', variant.id),
            {
                size: field === 'size' ? value : variant.size,
                sale_price: field === 'sale_price' ? value : variant.sale_price,
                wholesale_price: field === 'wholesale_price' ? value : variant.wholesale_price,
            },
            { preserveScroll: true, only: ['products'] }
        );
    }

    function deleteVariant(variant) {
        if (!confirm(`¿Eliminar la talla "${variant.size || 'Talla única'}"?`)) return;
        router.delete(route('pos.variants.destroy', variant.id), { preserveScroll: true });
    }

    function deleteProduct() {
        if (!confirm(`¿Eliminar "${product.name}" y todas sus tallas?`)) return;
        router.delete(route('pos.products.destroy', product.id), { preserveScroll: true, onSuccess: onClose });
    }

    return (
        <Modal show onClose={onClose} maxWidth="lg">
            <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Gestionar producto</h3>

                <form onSubmit={saveInfo} className="flex gap-4 items-start mb-6">
                    <label className="shrink-0 w-20 h-20 rounded-lg bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer">
                        {imagePreview ? (
                            <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl opacity-30">📷</span>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                    </label>
                    <div className="flex-1 space-y-2">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border-gray-300 text-sm"
                            placeholder="Nombre del producto"
                        />
                        <button
                            type="submit"
                            disabled={savingInfo}
                            className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {savingInfo ? 'Guardando…' : 'Guardar nombre / foto'}
                        </button>
                    </div>
                </form>

                <h4 className="text-sm font-semibold text-gray-700 mb-2">Tallas y precios</h4>
                <p className="text-xs text-gray-400 mb-2">Arrastra ⠿ para cambiar el orden en que aparecen.</p>
                <div className="mb-4">
                    {items.length === 0 && (
                        <p className="text-sm text-gray-400">Aún no hay tallas. Agrega la primera abajo.</p>
                    )}
                    <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
                        {items.map((variant) => (
                            <VariantRow
                                key={variant.id}
                                variant={variant}
                                onUpdate={(field, value) => updateVariant(variant, field, value)}
                                onDelete={() => deleteVariant(variant)}
                                onDragEnd={() => persistOrder(items)}
                            />
                        ))}
                    </Reorder.Group>
                </div>

                <form onSubmit={addVariant} className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <input
                        type="text"
                        value={newSize}
                        onChange={(e) => setNewSize(e.target.value)}
                        placeholder="Talla (vacío = única)"
                        className="w-32 rounded-lg border-gray-300 text-sm"
                    />
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="Precio"
                        required
                        className="w-28 rounded-lg border-gray-300 text-sm"
                    />
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={newWholesale}
                        onChange={(e) => setNewWholesale(e.target.value)}
                        placeholder="Precio 3+ (opcional)"
                        className="w-32 rounded-lg border-gray-300 text-sm"
                    />
                    <button
                        type="submit"
                        disabled={addingVariant}
                        className="px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
                    >
                        + Agregar
                    </button>
                </form>

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between">
                    <button onClick={deleteProduct} className="text-xs text-red-500 hover:text-red-700">
                        Eliminar producto
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                        Cerrar
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function NewProductModal({ onClose }) {
    const [name, setName] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);

    function submit(e) {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        const formData = new FormData();
        formData.append('name', name);
        if (imageFile) formData.append('image', imageFile);
        router.post(route('pos.products.store'), formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: onClose,
            onFinish: () => setSaving(false),
        });
    }

    return (
        <Modal show onClose={onClose} maxWidth="sm">
            <form onSubmit={submit} className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Nuevo producto</h3>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Nombre</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border-gray-300 text-sm"
                        autoFocus
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Foto (opcional)</label>
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="text-sm" />
                </div>
                <p className="text-xs text-gray-400">
                    Después de crearlo podrás agregarle tallas y precios desde el ⚙️ de la tarjeta.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {saving ? 'Creando…' : 'Crear producto'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
