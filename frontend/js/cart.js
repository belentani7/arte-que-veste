/**
 * ═══════════════════════════════════════════════════════════════
 * ARTE QUE VESTE — Carrinho de Compras (localStorage)
 * Compartido entre todas as páginas da loja.
 * ═══════════════════════════════════════════════════════════════
 */

const AQV_CART_KEY = 'aqv_carrinho';

const Cart = {
    get() {
        try {
            const data = JSON.parse(localStorage.getItem(AQV_CART_KEY) || '[]');
            if (!Array.isArray(data)) return [];
            return data.filter(item => item && typeof item === 'object')
                .map(item => ({
                    key: String(item.key ?? '').slice(0, 150),
                    sku: String(item.sku ?? '').slice(0, 100),
                    name: String(item.name ?? 'Produto').slice(0, 200),
                    desc: String(item.desc ?? '').slice(0, 300),
                    img: String(item.img ?? '').slice(0, 1000),
                    price: Number.isFinite(Number(item.price)) ? Math.max(0, Number(item.price)) : 0,
                    category: String(item.category ?? ''),
                    tamanho: item.tamanho == null ? '' : String(item.tamanho).slice(0, 100),
                    cor: item.cor == null ? '' : String(item.cor).slice(0, 100),
                    quantidade: Number.isFinite(Number(item.quantidade))
                      ? Math.min(100, Math.max(1, Math.floor(Number(item.quantidade)))) : 1
                }));
        } catch { return []; }
    },

    save(items) {
        try {
            localStorage.setItem(AQV_CART_KEY, JSON.stringify(items));
        } catch (err) {
            console.warn('Não foi possível salvar o carrinho localmente.', err);
        }
        this.updateBadge();
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items } }));
    },

    add(product, qty = 1, size = null, color = null) {
        if (!product || !product.sku) return;
        const safeQty = Number.isFinite(Number(qty))
            ? Math.min(100, Math.max(1, Math.floor(Number(qty))))
            : 1;
        const safePrice = Number.isFinite(Number(product.price)) ? Math.max(0, Number(product.price)) : 0;
        const items = this.get();
        const key = `${product.sku}-${size || ''}-${color || ''}`;
        const existing = items.find(i => i.key === key);
        if (existing) {
            existing.quantidade = Math.min(existing.quantidade + safeQty, 100);
        } else {
            items.push({
                key,
                sku: String(product.sku),
                name: String(product.name || 'Produto'),
                desc: String(product.desc || ''),
                price: safePrice,
                img: String(product.img || ''),
                category: String(product.category || ''),
                tamanho: size || '',
                cor: color || '',
                quantidade: safeQty
            });
        }
        this.save(items);
        this.showToast(`${product.name || 'Produto'} adicionado ao carrinho!`);
    },

    update(key, qty) {
        const items = this.get();
        const item = items.find(i => i.key === key);
        if (!item) return;
        const nextQty = Number.isFinite(Number(qty)) ? Math.floor(Number(qty)) : 0;
        if (nextQty <= 0) {
            this.remove(key);
            return;
        }
        item.quantidade = Math.min(nextQty, 100);
        this.save(items);
    },

    remove(key) {
        const items = this.get().filter(i => i.key !== key);
        this.save(items);
    },

    clear() {
        try {
            localStorage.removeItem(AQV_CART_KEY);
        } catch {}
        this.updateBadge();
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items: [] } }));
    },

    getSubtotal() {
        return this.get().reduce((sum, i) => sum + (i.price * i.quantidade), 0);
    },

    getItemCount() {
        return this.get().reduce((sum, i) => sum + i.quantidade, 0);
    },

    updateBadge() {
        const count = this.getItemCount();
        document.querySelectorAll('.cart-badge').forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? 'flex' : 'none';
        });
        document.querySelectorAll('.cart-count-text').forEach(el => {
            el.textContent = `${count} ${count === 1 ? 'item' : 'itens'}`;
        });
    },

    showToast(msg) {
        const existing = document.getElementById('aqv-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'aqv-toast';
        toast.setAttribute?.('role', 'status');
        toast.setAttribute?.('aria-live', 'polite');
        toast.innerHTML = `
            <div style="position:fixed;bottom:24px;right:24px;z-index:9999;background:#1a1a1a;color:#fff;
                padding:14px 20px;border-left:4px solid #40E0D0;font-family:system-ui,-apple-system,sans-serif;font-size:14px;
                box-shadow:0 8px 32px rgba(0,0,0,0.22);transform:translateY(20px);opacity:0;
                transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),opacity 0.35s cubic-bezier(0.16,1,0.3,1);max-width:360px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" stroke-width="2" aria-hidden="true">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span class="toast-message"></span>
                </div>
            </div>`;
        const msgNode = toast.querySelector('.toast-message');
        if (msgNode) msgNode.textContent = String(msg);
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            const d = toast.firstElementChild;
            if (d) {
                d.style.transform = 'translateY(0)';
                d.style.opacity = '1';
            }
        });
        setTimeout(() => {
            const d = toast.firstElementChild;
            if (d) { d.style.transform = 'translateY(20px)'; d.style.opacity = '0'; }
            setTimeout(() => toast.remove(), 400);
        }, 2500);
    }
};

document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());
