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
            return JSON.parse(localStorage.getItem(AQV_CART_KEY)) || [];
        } catch { return []; }
    },

    save(items) {
        localStorage.setItem(AQV_CART_KEY, JSON.stringify(items));
        this.updateBadge();
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items } }));
    },

    add(product, qty = 1, size = null, color = null) {
        const items = this.get();
        const key = `${product.sku}-${size || ''}-${color || ''}`;
        const existing = items.find(i => i.key === key);
        if (existing) {
            existing.quantidade = Math.min(existing.quantidade + qty, 100);
        } else {
            items.push({
                key,
                sku: product.sku,
                name: product.name,
                desc: product.desc || '',
                price: product.price,
                img: product.img || '',
                category: product.category || '',
                tamanho: size,
                cor: color,
                quantidade: qty
            });
        }
        this.save(items);
        this.showToast(`${product.name} adicionado ao carrinho!`);
    },

    update(key, qty) {
        const items = this.get();
        const item = items.find(i => i.key === key);
        if (!item) return;
        if (qty <= 0) {
            this.remove(key);
            return;
        }
        item.quantidade = Math.min(qty, 100);
        this.save(items);
    },

    remove(key) {
        const items = this.get().filter(i => i.key !== key);
        this.save(items);
    },

    clear() {
        localStorage.removeItem(AQV_CART_KEY);
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
        // Also update any cart count text
        document.querySelectorAll('.cart-count-text').forEach(el => {
            el.textContent = `${count} ${count === 1 ? 'item' : 'itens'}`;
        });
    },

    showToast(msg) {
        const existing = document.getElementById('aqv-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'aqv-toast';
        toast.innerHTML = `
            <div style="position:fixed;bottom:24px;right:24px;z-index:9999;background:#1a1a1a;color:#fff;
                padding:16px 24px;border-left:4px solid #40E0D0;font-family:'Inter',sans-serif;font-size:14px;
                box-shadow:0 8px 32px rgba(0,0,0,0.2);transform:translateY(20px);opacity:0;
                transition:all 0.4s cubic-bezier(0.16,1,0.3,1);max-width:360px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>${msg}</span>
                </div>
            </div>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            const d = toast.firstElementChild;
            d.style.transform = 'translateY(0)';
            d.style.opacity = '1';
        });
        setTimeout(() => {
            const d = toast.firstElementChild;
            if (d) { d.style.transform = 'translateY(20px)'; d.style.opacity = '0'; }
            setTimeout(() => toast.remove(), 400);
        }, 2500);
    }
};

// Initialize badge on load
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());
