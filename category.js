/**
 * category.js - Shared script for all category pages.
 * Reads data-category attribute from its own <script> tag to filter products.
 */
(function () {
    const scriptEl = document.currentScript || document.querySelector('script[data-category]');
    const CATEGORY = (scriptEl ? scriptEl.getAttribute('data-category') : '').toUpperCase();

    const SUPABASE_URL = 'https://hgjcmsqforkvcfatygsl.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let storeWhatsAppNumber = '18090000000';
    let colorMap = {};

    function getBaseName(name) {
        return name.replace(/[-_]\d{2,}$/, '').replace(/\s+\d+$/, '').trim();
    }

    function getProductColor(prod) {
        const imgPath = prod.image || (prod.images && prod.images[0]) || '';
        const normalized = imgPath.replace(/^(\.\.\/)+/, '').replace(/\\/g, '/');
        if (colorMap[normalized]) {
            return colorMap[normalized];
        }
        const nameLower = prod.name.toLowerCase();
        if (nameLower.includes('negro')) return 'Negro';
        if (nameLower.includes('blanco')) return 'Blanco';
        if (nameLower.includes('gris')) return 'Gris';
        if (nameLower.includes('verde')) return 'Verde';
        if (nameLower.includes('rojo')) return 'Rojo';
        if (nameLower.includes('azul')) return 'Azul';
        if (nameLower.includes('naranja')) return 'Naranja';
        if (nameLower.includes('beige')) return 'Beige';
        return 'Negro';
    }

    async function loadColorMap() {
        try {
            const isSubdir = window.location.pathname.includes('/camisetas/') || 
                             window.location.pathname.includes('/hoodies/') || 
                             window.location.pathname.includes('/accesorios/') || 
                             window.location.pathname.includes('/colecciones/') || 
                             window.location.pathname.includes('/novedades/') || 
                             window.location.pathname.includes('/ofertas/');
            const url = isSubdir ? '../assets/colors.json' : 'assets/colors.json';
            const res = await fetch(url);
            if (res.ok) {
                colorMap = await res.json();
            }
        } catch (e) {
            console.error('Error cargando colorMap:', e);
        }
    }

    async function loadDynamicWhatsAppNumber() {
        try {
            const { data, error } = await _supabase
                .from('store_settings')
                .select('whatsapp_number')
                .eq('id', 1)
                .single();
            if (data && data.whatsapp_number) {
                storeWhatsAppNumber = data.whatsapp_number.replace(/\D/g, '') || '18090000000';
                document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
                    const currentHref = link.getAttribute('href');
                    if (currentHref) {
                        try {
                            const urlObj = new URL(currentHref);
                            urlObj.pathname = `/${storeWhatsAppNumber}`;
                            link.setAttribute('href', urlObj.toString());
                        } catch (e) {
                            const newHref = currentHref.replace(/wa\.me\/\d+/, `wa.me/${storeWhatsAppNumber}`);
                            link.setAttribute('href', newHref);
                        }
                    }
                });
            }
        } catch (err) {
            console.error('Error cargando el número de WhatsApp dinámico:', err);
        }
    }

    // ---------- CART ----------
    let cart = JSON.parse(localStorage.getItem('kmizrd_cart') || '[]');

    function updateCartUI() {
        const count = cart.reduce((a, i) => a + i.quantity, 0);
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
        const itemsEl = document.getElementById('cart-drawer-items');
        const footerEl = document.getElementById('cart-drawer-footer');
        const countEl = document.getElementById('cart-drawer-count');
        if (!itemsEl) return;
        if (countEl) countEl.textContent = count;
        if (cart.length === 0) {
            itemsEl.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#94a3b8;"><p style="font-size:15px;font-weight:600;">Tu carrito está vacío</p></div>';
            if (footerEl) footerEl.style.display = 'none';
            return;
        }
        if (footerEl) footerEl.style.display = 'block';
        let subtotal = 0;
        itemsEl.innerHTML = '';
        cart.forEach((item, idx) => {
            const price = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
            subtotal += price * item.quantity;
            const div = document.createElement('div');
            div.className = 'cart-item';
            const colorText = item.color ? `, Color: ${item.color}` : '';
            div.innerHTML = `
                <div class="cart-item-img"><img src="${item.image}" alt="${item.name}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;"></div>
                <div class="cart-item-details" style="flex:1;padding:0 12px;">
                    <div style="font-weight:700;font-size:14px;color:#0f172a;">${item.name}</div>
                    <div style="font-size:12px;color:#64748b;margin:2px 0;">Talla: ${item.size}${colorText}</div>
                    <div style="font-size:14px;font-weight:800;color:var(--accent-color);">RD$${(price * item.quantity).toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <button class="qty-btn minus-btn" data-index="${idx}" style="width:28px;height:28px;border-radius:50%;background:#f1f5f9;border:none;cursor:pointer;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center;">-</button>
                    <span style="font-weight:700;min-width:20px;text-align:center;">${item.quantity}</span>
                    <button class="qty-btn plus-btn" data-index="${idx}" style="width:28px;height:28px;border-radius:50%;background:#f1f5f9;border:none;cursor:pointer;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center;">+</button>
                    <button class="remove-btn" data-index="${idx}" style="width:28px;height:28px;border-radius:50%;background:#fee2e2;border:none;cursor:pointer;color:#ef4444;display:flex;align-items:center;justify-content:center;margin-left:4px;">✕</button>
                </div>`;
            itemsEl.appendChild(div);
        });
        const subtotalEl = document.getElementById('cart-subtotal');
        const totalEl = document.getElementById('cart-total');
        if (subtotalEl) subtotalEl.textContent = `RD$${subtotal.toLocaleString('en-US', {minimumFractionDigits:2})}`;
        if (totalEl) totalEl.textContent = `RD$${subtotal.toLocaleString('en-US', {minimumFractionDigits:2})}`;
    }

    function addToCart(product, size) {
        const color = getProductColor(product);
        const existing = cart.find(i => i.id === product.id && i.size === size);
        if (existing) { existing.quantity += 1; }
        else { cart.push({ id: product.id, name: product.name, price: product.price, size, color, image: product.image, quantity: 1 }); }
        localStorage.setItem('kmizrd_cart', JSON.stringify(cart));
        updateCartUI();
        const drawer = document.getElementById('cart-drawer');
        if (drawer) { drawer.classList.add('active'); document.body.style.overflow = 'hidden'; }
    }

    document.addEventListener('click', (e) => {
        const minusBtn = e.target.closest('.minus-btn');
        const plusBtn = e.target.closest('.plus-btn');
        const removeBtn = e.target.closest('.remove-btn');
        if (minusBtn) {
            const idx = parseInt(minusBtn.getAttribute('data-index'));
            cart[idx].quantity -= 1;
            if (cart[idx].quantity <= 0) cart.splice(idx, 1);
            localStorage.setItem('kmizrd_cart', JSON.stringify(cart));
            updateCartUI();
        } else if (plusBtn) {
            const idx = parseInt(plusBtn.getAttribute('data-index'));
            cart[idx].quantity += 1;
            localStorage.setItem('kmizrd_cart', JSON.stringify(cart));
            updateCartUI();
        } else if (removeBtn) {
            const idx = parseInt(removeBtn.getAttribute('data-index'));
            cart.splice(idx, 1);
            localStorage.setItem('kmizrd_cart', JSON.stringify(cart));
            updateCartUI();
        }
    });

    // Cart Drawer open/close
    const cartBtn = document.querySelector('.cart-btn');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartCloseBtn = document.getElementById('cart-drawer-close');
    if (cartBtn && cartDrawer) {
        cartBtn.addEventListener('click', () => { cartDrawer.classList.add('active'); document.body.style.overflow = 'hidden'; });
    }
    if (cartCloseBtn) {
        cartCloseBtn.addEventListener('click', () => { cartDrawer.classList.remove('active'); document.body.style.overflow = ''; });
    }
    if (cartDrawer) {
        cartDrawer.addEventListener('click', (e) => {
            if (e.target === cartDrawer) { cartDrawer.classList.remove('active'); document.body.style.overflow = ''; }
        });
    }

    // WhatsApp Checkout
    const checkoutBtn = document.querySelector('.cart-checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            if (cart.length === 0) return;
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = 'Preparando pedido...';
            try {
                const { data: settings } = await _supabase.from('store_settings').select('whatsapp_number').eq('id', 1).single();
                const number = settings?.whatsapp_number?.replace(/\D/g, '') || '18090000000';
                let subtotal = 0;
                cart.forEach(i => { subtotal += parseFloat(String(i.price).replace(/[^0-9.]/g, '')) * i.quantity; });
                let msg = `¡Hola KMIZRD! Me gustaría realizar un pedido:\n\n`;
                cart.forEach(item => {
                    const colorText = item.color ? ` (Color: ${item.color})` : '';
                    msg += `• ${item.quantity}x ${item.name} (Talla: ${item.size}${colorText}) - RD$${parseFloat(String(item.price).replace(/[^0-9.]/g,'')).toLocaleString('en-US',{minimumFractionDigits:2})}\n`;
                });
                msg += `\n💰 Total: RD$${subtotal.toLocaleString('en-US', {minimumFractionDigits:2})}`;
                // Save order
                await _supabase.from('store_orders').insert([{
                    customer_name: 'Cliente WhatsApp', customer_email: '',
                    items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, size: i.size, color: i.color || '', quantity: i.quantity })),
                    subtotal, shipping: 0, total: subtotal,
                    payment_method: 'whatsapp', payment_status: 'pending', payment_reference: 'WhatsApp'
                }]);
                window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
                cart = []; localStorage.setItem('kmizrd_cart', JSON.stringify(cart)); updateCartUI();
                if (cartDrawer) { cartDrawer.classList.remove('active'); document.body.style.overflow = ''; }
            } catch (err) {
                console.error(err);
                window.open(`https://wa.me/${storeWhatsAppNumber}`, '_blank');
            } finally {
                checkoutBtn.disabled = false;
                checkoutBtn.innerHTML = 'Pedir por WhatsApp <i class="fab fa-whatsapp"></i>';
            }
        });
    }

    // ---------- PRODUCTS ----------
    let allProducts = [];
    let currentProduct = null;
    let customCurrentProduct = null;
    let customCurrentSize = 'Única';
    let customBase64Image = '';

    async function loadProducts() {
        const grid = document.getElementById('cat-product-grid');
        const emptyEl = document.getElementById('cat-empty');
        const countEl = document.getElementById('results-count');
        if (!grid) return;
        try {
            let query = _supabase.from('products').select('*').order('created_at', { ascending: false });
            if (CATEGORY) {
                query = query.ilike('category', `%${CATEGORY.toLowerCase().replace('camisetas','camiseta').replace('hoodies','hoodie').replace('accesorios','accesorio').replace('colecciones','coleccion').replace('novedades','nuevo').replace('ofertas','oferta')}%`);
            }
            const { data, error } = await query;
            if (error) throw error;
            const rawProducts = (data || []).map(p => {
                const rawImages = (p.image || '').split(',').map(s => s.trim()).filter(Boolean);
                const images = rawImages.map(img =>
                    (!img.startsWith('data:') && !img.startsWith('http')) ? `../${img}` : img
                );
                return { ...p, images, image: images[0] || '' };
            });

            // Group variants by base design name
            const groups = {};
            rawProducts.forEach(p => {
                const base = getBaseName(p.name);
                if (!groups[base]) groups[base] = [];
                groups[base].push(p);
            });

            // One representative card per group; store all variants in .variants
            allProducts = Object.values(groups).map(variants => {
                const rep = { ...variants[0], variants };
                return rep;
            });

            renderProducts(allProducts);
        } catch (err) {
            console.error('Error loading products:', err);
            if (countEl) countEl.textContent = '0 productos';
            if (emptyEl) emptyEl.style.display = 'block';
        }
    }

    function renderProducts(products) {
        const grid = document.getElementById('cat-product-grid');
        const emptyEl = document.getElementById('cat-empty');
        const countEl = document.getElementById('results-count');
        if (!grid) return;
        grid.innerHTML = '';
        if (countEl) countEl.textContent = `${products.length} producto${products.length !== 1 ? 's' : ''}`;
        if (products.length === 0) { if (emptyEl) emptyEl.style.display = 'block'; return; }
        if (emptyEl) emptyEl.style.display = 'none';
        products.forEach(prod => {
            const isColeccion = (prod.category || '').toLowerCase().includes('coleccion');
            const price = parseFloat(String(prod.price).replace(/[^0-9.]/g, ''));
            const card = document.createElement('div');
            card.className = 'cat-product-card';
            card.setAttribute('data-id', prod.id);
            card.innerHTML = `
                <div class="cat-card-image-wrap">
                    <span class="cat-card-badge new">NUEVO</span>
                    ${!isColeccion ? `<span class="cat-card-badge custom" style="top:44px;">✦ PERSONALIZABLE</span>` : ''}
                    ${(prod.images && prod.images.length > 1) ? `<span style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.65);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;z-index:2;">📷 ${prod.images.length} fotos</span>` : ''}
                    <img src="${prod.image}" alt="${prod.name}" loading="lazy">
                    <div class="cat-card-actions">
                        ${isColeccion
                            ? `<button class="cat-action-btn cart" data-action="cart" title="Añadir al carrito"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></button>`
                            : `<button class="cat-action-btn customize" data-action="customize" title="Personalizar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>`
                        }
                    </div>
                </div>
                <div class="cat-card-info">
                    <div class="cat-card-category">${prod.category}</div>
                    <div class="cat-card-name">${getBaseName(prod.name)}</div>
                    <div class="cat-card-price">RD$${price.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                    <div class="cat-card-sizes">${(prod.sizes || []).slice(0, 4).map(s => `<span class="cat-size-dot">${s}</span>`).join('')}${(prod.variants && prod.variants.length > 1) ? `<span class="cat-size-dot" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;">🎨 ${prod.variants.length} colores</span>` : ''}</div>
                    ${!isColeccion ? `<div class="cat-card-custom-tag">✦ Solicitar personalización</div>` : ''}
                </div>`;
            card.addEventListener('click', (e) => {
                const action = e.target.closest('[data-action]')?.getAttribute('data-action');
                if (action === 'cart') {
                    const firstSize = (prod.sizes || ['Única'])[0];
                    addToCart(prod, firstSize);
                } else if (action === 'customize') {
                    openPersonalizationModal(prod, (prod.sizes || ['Única'])[0]);
                } else {
                    openProductModal(prod);
                }
            });
            grid.appendChild(card);
        });
    }

    // Sort
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            let sorted = [...allProducts];
            const v = sortSelect.value;
            if (v === 'price-asc') sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            else if (v === 'price-desc') sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            else if (v === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
            renderProducts(sorted);
        });
    }

    // ---------- PRODUCT MODAL ----------
    const modal = document.getElementById('product-detail-modal');
    const closeBtn = document.getElementById('modal-close-btn');

    // Gallery state
    let galleryImages = [];
    let galleryIndex = 0;

    function setGalleryImage(index) {
        galleryIndex = index;
        const mainImg = document.getElementById('modal-product-img');
        if (mainImg) {
            mainImg.style.opacity = '0';
            setTimeout(() => {
                mainImg.src = galleryImages[galleryIndex];
                mainImg.style.opacity = '1';
            }, 150);
        }
        // Update active thumbnail inline styles
        const thumbs = document.querySelectorAll('.gallery-thumb');
        thumbs.forEach((t, i) => {
            if (i === galleryIndex) {
                t.style.borderColor = 'var(--accent-color)';
                t.style.opacity = '1';
                t.style.transform = 'scale(1.06)';
            } else {
                t.style.borderColor = 'transparent';
                t.style.opacity = '0.65';
                t.style.transform = 'scale(1)';
            }
        });
    }

    // Color name -> CSS color value map for swatches
    const COLOR_CSS = {
        'Negro': '#1a1a1a',
        'Blanco': '#ffffff',
        'Gris': '#9ca3af',
        'Verde': '#16a34a',
        'Rojo': '#dc2626',
        'Azul': '#2563eb',
        'Azul Marino': '#1e3a5f',
        'Naranja': '#ea580c',
        'Beige': '#d4b896'
    };

    function buildGallery(images) {
        galleryImages = (images && images.length > 0) ? images : [];
        galleryIndex = 0;
        const mainImg = document.getElementById('modal-product-img');
        if (mainImg && galleryImages.length > 0) mainImg.src = galleryImages[0];
        const thumbStrip = document.getElementById('gallery-thumbnails');
        if (thumbStrip) {
            thumbStrip.innerHTML = '';
            if (galleryImages.length > 1) {
                galleryImages.forEach((imgSrc, i) => {
                    const thumb = document.createElement('img');
                    thumb.src = imgSrc;
                    thumb.className = `gallery-thumb ${i === 0 ? 'active' : ''}`;
                    thumb.style.cssText = 'width:68px;height:68px;object-fit:cover;border-radius:10px;cursor:pointer;flex-shrink:0;border:2px solid transparent;opacity:0.65;transition:all 0.25s ease;';
                    thumb.addEventListener('click', () => setGalleryImage(i));
                    thumb.addEventListener('mouseenter', () => { if (i !== galleryIndex) thumb.style.opacity = '0.9'; });
                    thumb.addEventListener('mouseleave', () => { if (i !== galleryIndex) thumb.style.opacity = '0.65'; });
                    thumbStrip.appendChild(thumb);
                    if (i === 0) { thumb.style.borderColor = 'var(--accent-color)'; thumb.style.opacity = '1'; }
                });
            }
        }
        const prevBtn = document.getElementById('gallery-prev-btn');
        const nextBtn = document.getElementById('gallery-next-btn');
        if (prevBtn && nextBtn) {
            if (galleryImages.length > 1) {
                prevBtn.style.display = 'flex'; prevBtn.style.alignItems = 'center'; prevBtn.style.justifyContent = 'center';
                nextBtn.style.display = 'flex'; nextBtn.style.alignItems = 'center'; nextBtn.style.justifyContent = 'center';
                prevBtn.onclick = () => setGalleryImage((galleryIndex - 1 + galleryImages.length) % galleryImages.length);
                nextBtn.onclick = () => setGalleryImage((galleryIndex + 1) % galleryImages.length);
            } else {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            }
        }
        if (galleryImages.length > 0) setGalleryImage(0);
    }

    function switchVariant(variant) {
        currentProduct = variant;
        buildGallery(variant.images && variant.images.length > 0 ? variant.images : [variant.image]);
        document.getElementById('modal-product-name').textContent = getBaseName(variant.name);
        document.getElementById('modal-product-price').textContent = `RD$${parseFloat(String(variant.price).replace(/[^0-9.]/g, '')).toLocaleString('en-US', {minimumFractionDigits:2})}`;
        document.getElementById('modal-product-desc').textContent = variant.description || '';
        const sizesEl = document.getElementById('modal-sizes-container');
        sizesEl.innerHTML = '';
        (variant.sizes || ['Única']).forEach((size, idx) => {
            const btn = document.createElement('button');
            btn.className = `size-badge-modal ${idx === 0 ? 'active' : ''}`;
            btn.textContent = size;
            btn.addEventListener('click', () => { sizesEl.querySelectorAll('.size-badge-modal').forEach(b => b.classList.remove('active')); btn.classList.add('active'); });
            sizesEl.appendChild(btn);
        });
    }

    function openProductModal(product) {
        currentProduct = product;
        const variants = product.variants || [product];
        const isColeccion = (product.category || '').toLowerCase().includes('coleccion');

        // Gallery from first variant
        buildGallery(product.images && product.images.length > 0 ? product.images : [product.image]);

        // --- Product Info ---
        document.getElementById('modal-product-category').textContent = product.category;
        document.getElementById('modal-product-name').textContent = getBaseName(product.name);
        document.getElementById('modal-product-price').textContent = `RD$${parseFloat(String(product.price).replace(/[^0-9.]/g, '')).toLocaleString('en-US', {minimumFractionDigits:2})}`;
        document.getElementById('modal-product-desc').textContent = product.description || '';

        // --- Color Swatches ---
        const sizesEl = document.getElementById('modal-sizes-container');
        // Remove previous swatch panel if any
        const existingSwatches = document.getElementById('color-swatches-panel');
        if (existingSwatches) existingSwatches.remove();

        if (variants.length > 1) {
            const swatchPanel = document.createElement('div');
            swatchPanel.id = 'color-swatches-panel';
            swatchPanel.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center;';
            const label = document.createElement('span');
            label.textContent = 'Color:';
            label.style.cssText = 'font-size:13px;font-weight:700;color:#64748b;margin-right:4px;';
            swatchPanel.appendChild(label);

            variants.forEach((v, vi) => {
                const color = getProductColor(v);
                const cssColor = COLOR_CSS[color] || '#888';
                const swatch = document.createElement('button');
                swatch.title = color;
                swatch.style.cssText = `width:28px;height:28px;border-radius:50%;background:${cssColor};border:3px solid ${vi === 0 ? 'var(--accent-color)' : '#e2e8f0'};cursor:pointer;transition:all 0.2s;outline:none;box-shadow:0 1px 3px rgba(0,0,0,0.15);`;
                if (color === 'Blanco') swatch.style.boxShadow = '0 0 0 1px #ccc, 0 1px 3px rgba(0,0,0,0.15)';
                swatch.addEventListener('click', () => {
                    swatchPanel.querySelectorAll('button').forEach(b => b.style.borderColor = '#e2e8f0');
                    swatch.style.borderColor = 'var(--accent-color)';
                    switchVariant(v);
                });
                swatchPanel.appendChild(swatch);
            });

            sizesEl.parentNode.insertBefore(swatchPanel, sizesEl);
        }

        // --- Sizes ---
        sizesEl.innerHTML = '';
        (product.sizes || ['Única']).forEach((size, idx) => {
            const btn = document.createElement('button');
            btn.className = `size-badge-modal ${idx === 0 ? 'active' : ''}`;
            btn.textContent = size;
            btn.addEventListener('click', () => { sizesEl.querySelectorAll('.size-badge-modal').forEach(b => b.classList.remove('active')); btn.classList.add('active'); });
            sizesEl.appendChild(btn);
        });

        const addBtn = document.querySelector('.modal-add-cart-btn');
        if (addBtn) {
            if (isColeccion) {
                addBtn.innerHTML = '<i class="fa fa-shopping-cart"></i> Añadir al Carrito';
                addBtn.classList.remove('personalize-btn');
            } else {
                addBtn.innerHTML = '<i class="fas fa-palette"></i> Solicitar Personalización';
                addBtn.classList.add('personalize-btn');
            }
        }
        if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function closeProductModal() {
        if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; currentProduct = null; }
    }

    if (closeBtn) closeBtn.addEventListener('click', closeProductModal);
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeProductModal(); });

    const addCartBtn = document.querySelector('.modal-add-cart-btn');
    if (addCartBtn) {
        addCartBtn.addEventListener('click', () => {
            if (!currentProduct) return;
            const activeSize = document.querySelector('.size-badge-modal.active');
            const size = activeSize ? activeSize.textContent : 'Única';
            const isColeccion = (currentProduct.category || '').toLowerCase().includes('coleccion');
            if (isColeccion) {
                addToCart(currentProduct, size);
                closeProductModal();
            } else {
                closeProductModal();
                openPersonalizationModal(currentProduct, size);
            }
        });
    }

    // ---------- PERSONALIZATION MODAL ----------
    const personalizationModal = document.getElementById('personalization-modal');
    const customModalCloseBtn = document.getElementById('custom-modal-close-btn');
    const customForm = document.getElementById('custom-apparel-form');
    const customDragArea = document.getElementById('custom-drag-area');
    const customFileInput = document.getElementById('custom-image-file');
    const customPreviewContainer = document.getElementById('custom-image-preview-container');
    const customPreviewImage = document.getElementById('custom-image-preview');
    const customRemovePreviewBtn = document.getElementById('custom-remove-preview-btn');
    const customColorsContainer = document.getElementById('custom-colors');

    function updateOverlayColor(colorName) {
        const overlay = document.getElementById('custom-modal-product-overlay');
        if (!overlay) return;

        let bg = 'transparent';
        switch (colorName.toLowerCase()) {
            case 'negro':
                bg = 'rgba(20, 20, 20, 0.88)';
                break;
            case 'blanco':
                bg = 'transparent';
                break;
            case 'gris':
                bg = 'rgba(128, 128, 128, 0.75)';
                break;
            case 'azul marino':
            case 'azul':
                bg = 'rgba(15, 32, 67, 0.85)';
                break;
            case 'rojo':
                bg = 'rgba(185, 28, 28, 0.8)';
                break;
            case 'beige':
                bg = 'rgba(217, 180, 140, 0.6)';
                break;
            case 'naranja':
                bg = 'rgba(234, 88, 12, 0.8)';
                break;
            default:
                bg = 'transparent';
        }
        overlay.style.backgroundColor = bg;
    }

    function openPersonalizationModal(product, size) {
        customCurrentProduct = product;
        customCurrentSize = size || 'Única';
        const img = document.getElementById('custom-modal-product-img');
        const cat = document.getElementById('custom-modal-product-cat');
        const name = document.getElementById('custom-modal-product-name');
        const sizeEl = document.getElementById('custom-modal-product-size');
        if (img) img.src = product.image;
        if (cat) cat.textContent = product.category;
        if (name) name.textContent = product.name;
        if (sizeEl) sizeEl.textContent = size && size !== 'Única' ? `Talla: ${size}` : '';
        const descEl = document.getElementById('custom-desc');
        if (descEl) descEl.value = '';
        
        // Initialize preview overlay color
        const activeColorBtn = customColorsContainer ? customColorsContainer.querySelector('.color-circle.active') : null;
        const chosenColor = activeColorBtn ? activeColorBtn.getAttribute('data-color') : 'Negro';
        updateOverlayColor(chosenColor);

        // Pre-load product image as reference
        customBase64Image = product.image;
        if (customPreviewImage) customPreviewImage.src = product.image;
        if (customDragArea) {
            const di = customDragArea.querySelector('.drag-icon');
            const dt = customDragArea.querySelector('.drag-text');
            if (di) di.style.display = 'none';
            if (dt) dt.style.display = 'none';
        }
        if (customPreviewContainer) customPreviewContainer.style.display = 'flex';
        if (personalizationModal) { personalizationModal.classList.add('active'); document.body.style.overflow = 'hidden'; }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function closePersonalizationModal() {
        if (personalizationModal) { personalizationModal.classList.remove('active'); document.body.style.overflow = ''; }
    }

    if (customModalCloseBtn) customModalCloseBtn.addEventListener('click', closePersonalizationModal);
    if (personalizationModal) personalizationModal.addEventListener('click', (e) => { if (e.target === personalizationModal) closePersonalizationModal(); });

    // Color picker
    if (customColorsContainer) {
        customColorsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.color-circle');
            if (btn) {
                customColorsContainer.querySelectorAll('.color-circle').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const chosenColor = btn.getAttribute('data-color') || 'Negro';
                updateOverlayColor(chosenColor);
            }
        });
    }

    // Drag & Drop image upload
    if (customDragArea && customFileInput) {
        customDragArea.addEventListener('click', (e) => { if (!e.target.closest('#custom-remove-preview-btn')) customFileInput.click(); });
        customDragArea.addEventListener('dragover', (e) => { e.preventDefault(); customDragArea.style.borderColor = 'var(--accent-color)'; });
        customDragArea.addEventListener('dragleave', () => { customDragArea.style.borderColor = '#334155'; });
        customDragArea.addEventListener('drop', (e) => { e.preventDefault(); customDragArea.style.borderColor = '#334155'; const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImageFile(f); });
        customFileInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) handleImageFile(f); });
    }
    function handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            customBase64Image = e.target.result;
            if (customPreviewImage) customPreviewImage.src = customBase64Image;
            if (customDragArea) {
                const di = customDragArea.querySelector('.drag-icon');
                const dt = customDragArea.querySelector('.drag-text');
                if (di) di.style.display = 'none';
                if (dt) dt.style.display = 'none';
            }
            if (customPreviewContainer) customPreviewContainer.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }
    if (customRemovePreviewBtn) {
        customRemovePreviewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            customBase64Image = '';
            if (customPreviewImage) customPreviewImage.src = '';
            if (customFileInput) customFileInput.value = '';
            if (customDragArea) {
                const di = customDragArea.querySelector('.drag-icon');
                const dt = customDragArea.querySelector('.drag-text');
                if (di) di.style.display = '';
                if (dt) dt.style.display = '';
            }
            if (customPreviewContainer) customPreviewContainer.style.display = 'none';
        });
    }

    // Form Submit → Supabase + close modal
    if (customForm) {
        customForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = customForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Enviando...';
            const activeColorBtn = customColorsContainer?.querySelector('.color-circle.active');
            const color = activeColorBtn?.getAttribute('data-color') || 'Negro';
            try {
                const { error } = await _supabase.from('custom_requests').insert([{
                    customer_name: document.getElementById('custom-name').value,
                    customer_phone: document.getElementById('custom-phone').value,
                    customer_email: document.getElementById('custom-email').value,
                    product_type: customCurrentProduct?.category || 'Personalizado',
                    product_name: customCurrentProduct?.name || '',
                    color,
                    size: customCurrentSize,
                    description: document.getElementById('custom-desc').value,
                    reference_image: customBase64Image || customCurrentProduct?.image || '',
                    status: 'pending'
                }]);
                if (error) throw error;
                alert('¡Tu solicitud ha sido enviada! Nos pondremos en contacto vía WhatsApp pronto.');
                customForm.reset();
                closePersonalizationModal();
                customCurrentProduct = null;
                if (customRemovePreviewBtn) customRemovePreviewBtn.click();
            } catch (err) {
                alert('Error al enviar: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="send" style="width:18px;height:18px;"></i> Enviar Solicitud';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    // CTA Button (open personalization without specific product)
    const openCustomCta = document.getElementById('open-custom-cta-btn');
    if (openCustomCta) {
        openCustomCta.addEventListener('click', () => {
            openPersonalizationModal({ name: scriptEl?.getAttribute('data-label') || 'Prenda', category: CATEGORY, image: '' }, 'M');
        });
    }

    // Custom item cards (used in accesorios/novedades pages)
    document.querySelectorAll('.custom-item-card[data-product-name]').forEach(card => {
        card.addEventListener('click', () => {
            openPersonalizationModal({
                name: card.getAttribute('data-product-name'),
                category: card.getAttribute('data-product-cat') || CATEGORY,
                image: card.querySelector('img')?.src || ''
            }, 'M');
        });
    });

    // Navigation Custom Items Click handler
    document.querySelectorAll('.nav-custom-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const name = item.getAttribute('data-product-name') || 'Prenda Personalizada';
            const cat = item.getAttribute('data-product-cat') || 'PERSONALIZACIÓN';
            const img = item.getAttribute('data-product-img') || '../assets/logo.jpg';
            openPersonalizationModal({ name, category: cat, image: img }, 'M');
        });
    });

    // ---------- INIT ----------
    updateCartUI();
    loadDynamicWhatsAppNumber();
    loadColorMap().then(() => loadProducts());

    // Catalog links smooth scroll on same page
    document.querySelectorAll('.catalog-nav-link').forEach(link => {
        link.addEventListener('click', () => {});
    });

})();
