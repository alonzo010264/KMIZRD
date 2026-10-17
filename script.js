// Ensure page refresh always starts cleanly at the top of the storefront
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.addEventListener('beforeunload', () => {
    window.scrollTo(0, 0);
});
if (!window.location.hash || window.location.hash === '#') {
    window.scrollTo(0, 0);
}

// Initialize Supabase Client
const supabaseUrl = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const supabaseKey = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let storeWhatsAppNumber = '18090000000';

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

let allProducts = [];
let currentModalProduct = null;
let cart = JSON.parse(localStorage.getItem('kmizrd_cart')) || [];
let galleryImages = [];
let galleryIndex = 0;
let colorMap = {};

function getBaseName(name) {
    if (!name) return '';
    const lower = name.toLowerCase();
    if (lower.includes('abrigo') || lower.includes('hoodie')) return name;
    if (lower.startsWith('camiseta oversize')) return name;
    return name.replace(/[-_]\d{2,}$/, '').replace(/\s+\d+$/, '').trim();
}

function parseNumericPrice(price) {
    if (typeof price === 'number') return isNaN(price) ? 0 : price;
    if (!price) return 0;
    const str = String(price).replace(/,/g, '');
    const match = str.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
}


    function extractProductColors(prod) {
        if (!prod) return ['Negro'];
        if (Array.isArray(prod.colors) && prod.colors.length > 0) return prod.colors;
        if (prod.description) {
            const m = prod.description.match(/\[colores?:\s*([^\]]+)\]/i);
            if (m) {
                return m[1].split(',').map(c => c.trim()).filter(Boolean);
            }
        }
        const fallbackCol = getProductColor(prod);
        return fallbackCol ? [fallbackCol] : ['Negro'];
    }

    function getCleanDescription(desc) {
        if (!desc) return '';
        return desc.replace(/\[colores?:\s*[^\]]+\]/gi, '').trim();
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

document.addEventListener('DOMContentLoaded', () => {
    // Non-blocking concurrent data loading
    loadColorMap();
    loadDynamicWhatsAppNumber();
    const productGrid = document.querySelector('.product-grid');
    const modal = document.getElementById('product-detail-modal');
    const closeBtn = document.getElementById('modal-close-btn');

    // Check if redirected from Azul payment
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('azul_status')) {
        const status = urlParams.get('azul_status');
        if (status === 'approved') {
            alert('¡Pago procesado con éxito a través de Azul! Gracias por tu compra.');
            // Clear cart
            cart = [];
            localStorage.setItem('kmizrd_cart', JSON.stringify(cart));
            // Trigger UI update when elements are fully bound later
            setTimeout(() => {
                updateCartUI();
            }, 100);
        } else if (status === 'declined') {
            alert('El pago fue rechazado por la pasarela de Azul. Por favor, intenta de nuevo.');
        } else if (status === 'cancelled') {
            alert('El pago con Azul fue cancelado.');
        }
        // Clean URL params without page reload
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Cart Elements
    const cartBtn = document.querySelector('.cart-btn');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartCloseBtn = document.getElementById('cart-drawer-close');
    const cartItemsContainer = document.getElementById('cart-drawer-items');
    const cartFooter = document.getElementById('cart-drawer-footer');
    const cartCountBadge = document.querySelector('.cart-count');

    // Skeleton loader for instant visual feedback (0ms perceived latency)
    function renderSkeletons() {
        if (!productGrid) return;
        productGrid.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const sk = document.createElement('div');
            sk.className = 'skeleton-card';
            sk.innerHTML = `
                <div class="skeleton-box skeleton-img"></div>
                <div class="skeleton-box skeleton-text-lg"></div>
                <div class="skeleton-box skeleton-text-sm"></div>
            `;
            productGrid.appendChild(sk);
        }
    }

    // Load products with instant session cache + background revalidation
    async function loadProducts() {
        if (!productGrid) return;

        const cacheKey = 'kmizrd_cache_home_products_v3';
        let renderedFromCache = false;

        // 1. Instant display from sessionStorage if valid (< 5 min)
        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.time < 300000 && Array.isArray(parsed.products) && parsed.products.length > 0) {
                    allProducts = parsed.products;
                    window.__productGroups = parsed.groups || {};
                    renderProducts();
                    renderedFromCache = true;
                }
            }
        } catch (e) {}

        // Show skeletons immediately if no cache exists
        if (!renderedFromCache && allProducts.length === 0) {
            renderSkeletons();
        }

        try {
            const { data, error } = await _supabase
                .from('products')
                .select('*')
                .neq('category', 'FAQ')
                .neq('category', 'TRACKING')
                .neq('category', 'SYSTEM_USERS')
                .order('created_at', { ascending: false });
            if (error) throw error;

            // Map raw products
            const rawProducts = (data || []).map(p => {
                const rawImages = (p.image || '').split(',').map(s => s.trim()).filter(Boolean);
                return {
                    id: p.id,
                    name: p.name,
                    price: p.price.toString().startsWith('RD$') ? p.price : `RD$${parseFloat(p.price).toLocaleString('en-US', {minimumFractionDigits: 2})}`,
                    category: p.category,
                    desc: p.description,
                    sizes: p.sizes || ['Única'],
                    images: rawImages,
                    image: rawImages[0] || ''
                };
            });

            // Group by base name (remove trailing -NN suffix or numbers)
            const groupMap = {};
            rawProducts.forEach(prod => {
                const base = getBaseName(prod.name);
                if (!groupMap[base]) groupMap[base] = [];
                groupMap[base].push(prod);
            });
            
            // Store representative products in allProducts
            const representativeProducts = [];
            for (const base in groupMap) {
                const group = groupMap[base];
                representativeProducts.push({
                    ...group[0],
                    name: base
                });
            }

            allProducts = representativeProducts;
            window.__productGroups = groupMap;

            // Store in sessionStorage for instant 0ms revisits
            try {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    time: Date.now(),
                    products: representativeProducts,
                    groups: groupMap
                }));
            } catch (e) {}

            renderProducts();
        } catch (err) {
            console.error('Error cargando productos de Supabase:', err);
            if (!renderedFromCache) {
                allProducts = [];
                renderProducts();
            }
        }
    }

    // Render products in the main storefront grid
    function renderProducts() {
        if (!productGrid) return;

        // Clear existing grid contents
        productGrid.innerHTML = '';

        if (allProducts.length === 0) {
            productGrid.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="package-open"></i>
                    <p>No hay productos en la web.</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        // Curate featured products for the home page (balanced mix including abrigos and oversize)
        const featuredProducts = [];
        const hoodies = allProducts.filter(p => (p.category || '').toUpperCase() === 'HOODIES' || (p.name || '').toLowerCase().includes('abrigo'));
        const oversize = allProducts.filter(p => (p.category || '').toUpperCase() === 'OVERSIZE');
        const others = allProducts.filter(p => !hoodies.includes(p) && !oversize.includes(p));

        if (hoodies.length > 0) featuredProducts.push(...hoodies.slice(0, 2));
        if (oversize.length > 0) featuredProducts.push(...oversize.slice(0, 2));
        if (others.length > 0) featuredProducts.push(...others.slice(0, 2));

        if (featuredProducts.length < 6) {
            allProducts.forEach(p => {
                if (!featuredProducts.includes(p) && featuredProducts.length < 6) {
                    featuredProducts.push(p);
                }
            });
        }

        featuredProducts.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.setAttribute('data-id', prod.id);

            // Check if product is static or db
            const isDiscount = prod.name.toLowerCase() === 'gorra clasica';
            const badgeHTML = isDiscount 
                ? `<span class="badge sale">-20%</span>` 
                : `<span class="badge">NUEVO</span>`;
            
            const numPrice = parseNumericPrice(prod.price);
            const priceHTML = isDiscount
                ? `<span class="old-price">RD$1,500.00</span> RD$1,200.00`
                : numPrice > 0
                    ? (prod.price.toString().startsWith('RD$') ? prod.price : `RD$${numPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}`)
                    : `<span style="font-size:13px;font-weight:700;color:#64748b;font-style:italic;">Precio por cotizar</span>`;

            let imageHTML = '';
            if (prod.images && prod.images.length > 1) {
                imageHTML = `
                    <div class="flip-container">
                        <div class="flipper">
                            <div class="front">
                                <img src="${encodeURI(prod.images[0])}" alt="${prod.name}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/logo.jpg';">
                            </div>
                            <div class="back">
                                <img src="${encodeURI(prod.images[1])}" alt="${prod.name} Trasera" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/logo.jpg';">
                            </div>
                        </div>
                    </div>
                `;
            } else {
                imageHTML = `<img src="${encodeURI(prod.image)}" alt="${prod.name}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/logo.jpg';">`;
            }

            card.innerHTML = `
                <div class="product-image-wrap">
                    ${badgeHTML}
                    ${(prod.images && prod.images.length > 1) ? `<span style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.65);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;z-index:2;">${prod.images.length} fotos</span>` : ''}
                    <button class="wishlist-btn" aria-label="Añadir a lista de deseos"><i data-lucide="heart"></i></button>
                    ${imageHTML}
                    <div class="product-card-actions">
                        <button class="product-action-btn cart" data-action="cart" title="Añadir al carrito" aria-label="Añadir al carrito">
                            <i class="fa fa-shopping-cart"></i>
                        </button>
                        <button class="product-action-btn customize" data-action="customize" title="Personalizar diseño" aria-label="Personalizar diseño">
                            <i class="fa fa-palette"></i>
                        </button>
                    </div>
                </div>
                <div class="product-details">
                    <h3>${prod.name}</h3>
                    <p class="price">${priceHTML}</p>
                    ${(window.__productGroups && window.__productGroups[prod.name] && window.__productGroups[prod.name].length > 1) ? `<p style="font-size:11px;color:#8b5cf6;font-weight:700;margin-top:4px;">${window.__productGroups[prod.name].length} colores disponibles</p>` : ''}
                    <button class="btn-card-add-cart" data-action="cart" title="Añadir al carrito">
                        <i class="fa fa-shopping-cart"></i> Añadir al Carrito
                    </button>
                </div>
            `;
            productGrid.appendChild(card);
        });

        // Initialize Lucide Icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Load initial products from database
    loadProducts();

    // 2. Event delegation for product clicks, quick-add, and wishlist clicks
    if (productGrid) {
        productGrid.addEventListener('click', (e) => {
            // Check if wishlist button was clicked
            const wishlistBtn = e.target.closest('.wishlist-btn');
            if (wishlistBtn) {
                e.preventDefault();
                e.stopPropagation(); // Prevent opening modal
                const icon = wishlistBtn.querySelector('i');
                if (icon) {
                    if (icon.getAttribute('fill') === 'currentColor') {
                        icon.setAttribute('fill', 'none');
                        wishlistBtn.style.color = '#999';
                    } else {
                        icon.setAttribute('fill', 'currentColor');
                        wishlistBtn.style.color = '#ff3366';
                    }
                }
                return;
            }

            // Check if card action button was clicked (Añadir al Carrito or Personalizar)
            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn) {
                e.preventDefault();
                e.stopPropagation();
                const card = actionBtn.closest('.product-card');
                if (!card) return;
                const prodId = card.getAttribute('data-id');
                const product = allProducts.find(p => String(p.id) === String(prodId));
                if (!product) return;

                const action = actionBtn.getAttribute('data-action');
                if (action === 'cart') {
                    const firstSize = (product.sizes && product.sizes[0]) || 'Única';
                    addToCart(product, firstSize);
                } else if (action === 'customize') {
                    const firstSize = (product.sizes && product.sizes[0]) || 'Única';
                    openPersonalizationModal(product, firstSize);
                }
                return;
            }

            // Otherwise, check if a product card was clicked
            const card = e.target.closest('.product-card');
            if (card) {
                const prodId = card.getAttribute('data-id');
                const product = allProducts.find(p => String(p.id) === String(prodId));
                if (product) {
                    openProductModal(product);
                }
            }
        });
    }

    function setGalleryImage(index) {
        galleryIndex = index;
        const mainImg = document.getElementById('modal-product-img');
        const mainWrap = mainImg ? mainImg.closest('.gallery-main-wrap') : null;
        if (mainImg) {
            if (mainWrap) mainWrap.classList.add('is-loading');
            mainImg.style.opacity = '0';
            mainImg.onload = () => {
                mainImg.style.opacity = '1';
                if (mainWrap) mainWrap.classList.remove('is-loading');
            };
            mainImg.onerror = () => {
                mainImg.src = 'assets/logo.jpg';
                mainImg.style.opacity = '1';
                if (mainWrap) mainWrap.classList.remove('is-loading');
            };
            mainImg.src = encodeURI(galleryImages[galleryIndex]);
            if (mainImg.complete && mainImg.naturalHeight !== 0) {
                mainImg.style.opacity = '1';
                if (mainWrap) mainWrap.classList.remove('is-loading');
            }
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

    function switchVariant(variant) {
        currentModalProduct = variant;

        // Populate details
        document.getElementById('modal-product-img').alt = variant.name;
        document.getElementById('modal-product-name').textContent = variant.name;
        
        const numPrice = parseNumericPrice(variant.price);
        const isDiscount = variant.name.toLowerCase() === 'gorra clasica';
        const priceEl = document.getElementById('modal-product-price');
        if (isDiscount) {
            priceEl.innerHTML = `<span class="old-price" style="font-size: 18px;">RD$1,500.00</span> RD$1,200.00`;
        } else if (numPrice > 0) {
            priceEl.innerHTML = `RD$${numPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        } else {
            priceEl.innerHTML = variant.price || 'RD$1,500.00';
        }
        document.getElementById('modal-product-desc').textContent = variant.desc || variant.description || '';

        // Populate sizes
        const sizesContainer = document.getElementById('modal-sizes-container');
        sizesContainer.innerHTML = '';
        const sizes = variant.sizes || ['Única'];
        sizes.forEach((size, idx) => {
            const btn = document.createElement('button');
            btn.className = `size-badge-modal ${idx === 0 ? 'active' : ''}`;
            btn.textContent = size;
            btn.addEventListener('click', () => {
                sizesContainer.querySelectorAll('.size-badge-modal').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            sizesContainer.appendChild(btn);
        });

        // --- Gallery Setup ---
        galleryImages = (variant.images && variant.images.length > 0) ? variant.images : [variant.image];
        galleryIndex = 0;

        const mainImg = document.getElementById('modal-product-img');
        const mainWrap = mainImg ? mainImg.closest('.gallery-main-wrap') : null;
        if (mainImg) {
            if (mainWrap) mainWrap.classList.add('is-loading');
            mainImg.style.opacity = '0';
            mainImg.onload = () => {
                mainImg.style.opacity = '1';
                if (mainWrap) mainWrap.classList.remove('is-loading');
            };
            mainImg.onerror = () => {
                mainImg.src = 'assets/logo.jpg';
                mainImg.style.opacity = '1';
                if (mainWrap) mainWrap.classList.remove('is-loading');
            };
            mainImg.src = encodeURI(galleryImages[0]);
            if (mainImg.complete && mainImg.naturalHeight !== 0) {
                mainImg.style.opacity = '1';
                if (mainWrap) mainWrap.classList.remove('is-loading');
            }
        }

        // Build thumbnails
        const thumbStrip = document.getElementById('gallery-thumbnails');
        if (thumbStrip) {
            thumbStrip.innerHTML = '';
            if (galleryImages.length > 1) {
                galleryImages.forEach((imgSrc, i) => {
                    const thumb = document.createElement('img');
                    thumb.src = encodeURI(imgSrc);
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

        // Arrow buttons
        const prevBtn = document.getElementById('gallery-prev-btn');
        const nextBtn = document.getElementById('gallery-next-btn');
        if (prevBtn && nextBtn) {
            if (galleryImages.length > 1) {
                prevBtn.style.display = 'flex';
                nextBtn.style.display = 'flex';
                prevBtn.onclick = () => setGalleryImage((galleryIndex - 1 + galleryImages.length) % galleryImages.length);
                nextBtn.onclick = () => setGalleryImage((galleryIndex + 1) % galleryImages.length);
            } else {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            }
        }
    }

    // 3. Modal details populator and controller
    function openProductModal(product) {
        if (!modal) return;
        currentModalProduct = product;

        // Resolve base name
        const baseName = getBaseName(product.name);
        const group = (window.__productGroups && window.__productGroups[baseName]) || [product];

        // Button is ALWAYS Add to Cart
        const modalAddCartBtn = document.querySelector('.modal-add-cart-btn');
        if (modalAddCartBtn) {
            modalAddCartBtn.innerHTML = '<i class="fa fa-shopping-cart"></i> Añadir al Carrito';
            modalAddCartBtn.classList.remove('personalize-btn');

            // Add secondary customize button if not already present
            let modalCustBtn = document.getElementById('modal-customize-link');
            if (!modalCustBtn) {
                modalCustBtn = document.createElement('button');
                modalCustBtn.id = 'modal-customize-link';
                modalCustBtn.type = 'button';
                modalCustBtn.className = 'modal-customize-btn';
                modalCustBtn.style.cssText = 'background:transparent; border:1px solid #cbd5e1; color:#0f172a; padding:10px 18px; border-radius:30px; font-weight:700; font-size:13px; cursor:pointer; width:100%; margin-top:10px; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s;';
                modalCustBtn.innerHTML = '<i class="fas fa-palette" style="color:var(--accent-color);"></i> Personalizar con mi diseño o logo';
                modalCustBtn.addEventListener('click', () => {
                    if (!currentModalProduct) return;
                    const activeSizeBtn = document.querySelector('.size-badge-modal.active');
                    const size = activeSizeBtn ? activeSizeBtn.textContent : 'Única';
                    closeProductModal();
                    openPersonalizationModal(currentModalProduct, size);
                });
                modalAddCartBtn.parentNode.insertBefore(modalCustBtn, modalAddCartBtn.nextSibling);
            }
        }

        // Populate category
        document.getElementById('modal-product-category').textContent = product.category;

        // Build/Remove color swatches selector
        const existingColorGroup = document.getElementById('modal-colors-group');
        if (existingColorGroup) existingColorGroup.remove();

        if (group.length > 1) {
            const colorGroup = document.createElement('div');
            colorGroup.className = 'modal-option-group';
            colorGroup.id = 'modal-colors-group';
            colorGroup.style.marginBottom = '15px';
            colorGroup.innerHTML = `
                <label>Colores Disponibles</label>
                <div id="modal-colors-container" style="display:flex; gap:10px; margin-top:8px;"></div>
            `;
            const sizesGroup = document.getElementById('modal-sizes-container').closest('.modal-option-group');
            if (sizesGroup) {
                sizesGroup.parentNode.insertBefore(colorGroup, sizesGroup);
            }

            const colorsContainer = document.getElementById('modal-colors-container');
            group.forEach((variant) => {
                const color = getProductColor(variant);
                const sw = document.createElement('button');
                sw.type = 'button';
                sw.className = 'color-swatch-btn';
                sw.setAttribute('data-color', color);
                sw.setAttribute('data-prod-id', variant.id);
                sw.title = color;

                let bg = '#64748b';
                let border = '2px solid transparent';
                switch (color.toLowerCase()) {
                    case 'negro': bg = '#18181b'; break;
                    case 'blanco': bg = '#ffffff'; border = '2px solid #cbd5e1'; break;
                    case 'gris': bg = '#94a3b8'; break;
                    case 'verde': bg = '#15803d'; break;
                    case 'rojo': bg = '#b91c1c'; break;
                    case 'azul': bg = '#1d4ed8'; break;
                    case 'naranja': bg = '#ea580c'; break;
                    case 'beige': bg = '#f5f5dc'; border = '2px solid #cbd5e1'; break;
                    case 'azul marino': bg = '#0f172a'; break;
                }

                sw.style.cssText = `background:${bg}; width:32px; height:32px; border-radius:50%; border:${border}; cursor:pointer; position:relative; transition:transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);`;
                
                sw.addEventListener('click', () => {
                    colorsContainer.querySelectorAll('.color-swatch-btn').forEach(btn => {
                        btn.style.transform = 'scale(1)';
                        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                        const indicator = btn.querySelector('.active-indicator');
                        if (indicator) indicator.remove();
                    });
                    sw.style.transform = 'scale(1.15)';
                    sw.style.boxShadow = '0 0 0 2px var(--accent-color)';
                    const check = document.createElement('span');
                    check.className = 'active-indicator';
                    check.innerHTML = '✓';
                    check.style.cssText = `position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:${color.toLowerCase() === 'blanco' || color.toLowerCase() === 'beige' ? '#000' : '#fff'}; font-size:12px; font-weight:bold;`;
                    sw.appendChild(check);

                    switchVariant(variant);
                });

                colorsContainer.appendChild(sw);
            });

            // Trigger click on the representative one or first matching
            const repId = product.id;
            const targetBtn = colorsContainer.querySelector(`[data-prod-id="${repId}"]`) || colorsContainer.firstChild;
            if (targetBtn) targetBtn.click();
        } else {
            // Single product variant, use regular switchVariant directly
            switchVariant(product);
        }

        // Load recommendations
        renderRecommendations(product);

        // Open modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Lock background scroll
    }

    function closeProductModal() {
        if (modal) {
            modal.classList.remove('active');
            const drawer = document.getElementById('cart-drawer');
            if (!drawer || !drawer.classList.contains('active')) {
                document.body.style.overflow = '';
            }
            currentModalProduct = null;
        }
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeProductModal);
    }

    // Close on click outside modal container
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeProductModal();
            }
        });
    }

    // 4. Recommendations logic (products of the same category, excluding the current one)
    function renderRecommendations(currentProduct) {
        const recGrid = document.getElementById('modal-recommendations-grid');
        if (!recGrid) return;

        recGrid.innerHTML = '';

        // Filter products of same category, excluding current product
        let filtered = allProducts.filter(p => p.category === currentProduct.category && p.id !== currentProduct.id);

        // If not enough recommendations in the same category, pad with other products
        if (filtered.length < 3) {
            const extra = allProducts.filter(p => p.id !== currentProduct.id && !filtered.includes(p));
            filtered = [...filtered, ...extra];
        }

        // Limit to top 3 recommendations
        const recommendations = filtered.slice(0, 3);

        // If there are no other products besides the current one in the entire db
        if (recommendations.length === 0) {
            recGrid.innerHTML = '<p style="grid-column: 1/-1; color: #94a3b8; font-size: 13px;">No hay otros productos recomendados.</p>';
            return;
        }

        recommendations.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'recommendation-card';
            card.setAttribute('data-id', prod.id);

            const isDiscount = prod.name.toLowerCase() === 'gorra clasica';
            const priceHTML = isDiscount
                ? `RD$1,200.00`
                : prod.price;

            card.innerHTML = `
                <div class="rec-img-wrap">
                    <img src="${encodeURI(prod.image.split(',')[0])}" alt="${prod.name}">
                </div>
                <div class="rec-details">
                    <h4>${prod.name}</h4>
                    <span class="rec-price">${priceHTML}</span>
                </div>
            `;

            // Click on recommendation updates the modal content
            card.addEventListener('click', () => {
                const nextProduct = allProducts.find(p => p.id === prod.id);
                if (nextProduct) {
                    openProductModal(nextProduct);
                    // Scroll modal container to top
                    document.querySelector('.modal-container').scrollTop = 0;
                }
            });

            recGrid.appendChild(card);
        });
    }

    // Dynamic Hero Banner Carousel Controller (supports multiple independent carousels)
    function initHeroBannerCarousel() {
        const carousels = document.querySelectorAll('.hero-carousel');
        if (!carousels || carousels.length === 0) return;

        carousels.forEach((carousel, carouselIdx) => {
            const track = carousel.querySelector('.carousel-track');
            const slides = carousel.querySelectorAll('.carousel-slide');
            const prevBtn = carousel.querySelector('.carousel-nav-btn.prev');
            const nextBtn = carousel.querySelector('.carousel-nav-btn.next');
            const indicators = carousel.querySelectorAll('.indicator-dot');

            if (!track || slides.length === 0) return;

            let currentIndex = 0;
            let slideInterval = null;
            // Slightly stagger autoplay delay between carousels so they don't slide simultaneously
            const autoPlayDelay = 4500 + (carouselIdx * 1200);

            function updateCarousel(index) {
                if (index < 0) {
                    currentIndex = slides.length - 1;
                } else if (index >= slides.length) {
                    currentIndex = 0;
                } else {
                    currentIndex = index;
                }

                track.style.transform = `translateX(-${currentIndex * 100}%)`;

                slides.forEach((slide, i) => {
                    slide.classList.toggle('active', i === currentIndex);
                });

                indicators.forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentIndex);
                });
            }

            function nextSlide() {
                updateCarousel(currentIndex + 1);
            }

            function prevSlide() {
                updateCarousel(currentIndex - 1);
            }

            function startAutoPlay() {
                stopAutoPlay();
                slideInterval = setInterval(nextSlide, autoPlayDelay);
            }

            function stopAutoPlay() {
                if (slideInterval) {
                    clearInterval(slideInterval);
                    slideInterval = null;
                }
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    nextSlide();
                    startAutoPlay();
                });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    prevSlide();
                    startAutoPlay();
                });
            }

            indicators.forEach(dot => {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetSlide = parseInt(dot.getAttribute('data-slide'), 10);
                    if (!isNaN(targetSlide)) {
                        updateCarousel(targetSlide);
                        startAutoPlay();
                    }
                });
            });

            carousel.addEventListener('mouseenter', stopAutoPlay);
            carousel.addEventListener('mouseleave', startAutoPlay);

            // Touch swipe support (Mobile)
            let touchStartX = 0;
            let touchEndX = 0;
            let isSwiping = false;

            carousel.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
                isSwiping = false;
                stopAutoPlay();
            }, { passive: true });

            carousel.addEventListener('touchmove', (e) => {
                const currentX = e.changedTouches[0].screenX;
                if (Math.abs(currentX - touchStartX) > 10) {
                    isSwiping = true;
                }
            }, { passive: true });

            carousel.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                const diffX = touchStartX - touchEndX;
                if (Math.abs(diffX) > 40) {
                    if (diffX > 0) {
                        nextSlide();
                    } else {
                        prevSlide();
                    }
                }
                startAutoPlay();
                setTimeout(() => { isSwiping = false; }, 100);
            }, { passive: true });

            // Prevent accidental link clicks when swiping
            carousel.querySelectorAll('.hero-banner-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    if (isSwiping) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });
            });

            // Keyboard navigation
            carousel.setAttribute('tabindex', '0');
            carousel.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight') {
                    nextSlide();
                    startAutoPlay();
                } else if (e.key === 'ArrowLeft') {
                    prevSlide();
                    startAutoPlay();
                }
            });

            // Initialize autoplay
            startAutoPlay();
        });
    }

    initHeroBannerCarousel();

    // 5. Shopping Cart Functions
    function updateCartUI() {
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';

        let totalQty = 0;
        let subtotal = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="cart-empty-state">
                    <i data-lucide="shopping-cart"></i>
                    <p>Tu carrito está vacío</p>
                    <button class="btn-primary" id="cart-drawer-continue" style="width: auto; padding: 12px 24px;">Seguir Comprando</button>
                </div>
            `;
            if (cartFooter) cartFooter.style.display = 'none';
            if (cartCountBadge) cartCountBadge.textContent = '0';
            const drawerCount = document.getElementById('cart-drawer-count');
            if (drawerCount) drawerCount.textContent = '0';

            // Connect continue shopping button
            const continueBtn = document.getElementById('cart-drawer-continue');
            if (continueBtn) {
                continueBtn.addEventListener('click', () => {
                    cartDrawer.classList.remove('active');
                    document.body.style.overflow = '';
                });
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        cart.forEach((item, index) => {
            totalQty += item.quantity;
            
            const numericPrice = parseNumericPrice(item.price);
            const itemSubtotal = numericPrice * item.quantity;
            subtotal += itemSubtotal;

            const cartItemEl = document.createElement('div');
            cartItemEl.className = 'cart-item';
            const colorHTML = item.color ? `, Color: <strong>${item.color}</strong>` : '';
            const rawImg = (item.image && typeof item.image === 'string') ? item.image.split(',')[0].trim().replace(/^(\.\.\/)+/, '') : 'assets/logo.jpg';
            const priceText = numericPrice > 0 ? `RD$${itemSubtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}` : 'RD$1,500.00';

            cartItemEl.innerHTML = `
                <div class="cart-item-img">
                    <img src="${encodeURI(rawImg)}" alt="${item.name}" onerror="this.onerror=null;this.src='assets/logo.jpg';">
                </div>
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-meta">Talla: <strong>${item.size}</strong>${colorHTML}</div>
                    <div class="cart-item-bottom">
                        <div class="cart-item-qty">
                           <button class="qty-btn-minus" data-index="${index}">&minus;</button>
                           <span>${item.quantity}</span>
                           <button class="qty-btn-plus" data-index="${index}">&plus;</button>
                        </div>
                        <span class="cart-item-price">${priceText}</span>
                    </div>
                </div>
                <button class="cart-item-remove" data-index="${index}" aria-label="Eliminar item">
                     <i data-lucide="trash-2"></i>
                </button>
            `;
            cartItemsContainer.appendChild(cartItemEl);
        });

        if (cartCountBadge) {
            cartCountBadge.textContent = totalQty;
            cartCountBadge.classList.add('bump');
            setTimeout(() => cartCountBadge.classList.remove('bump'), 350);
        }
        const drawerCount = document.getElementById('cart-drawer-count');
        if (drawerCount) drawerCount.textContent = totalQty;

        // Calculate shipping (free above 3500)
        const shipping = subtotal >= 3500 ? 0 : (subtotal > 0 ? 200 : 0);
        const total = subtotal + shipping;

        const subtotalEl = document.getElementById('cart-subtotal');
        const shippingEl = document.getElementById('cart-shipping');
        const totalEl = document.getElementById('cart-total');

        if (subtotalEl) subtotalEl.textContent = `RD$${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (shippingEl) shippingEl.textContent = shipping === 0 ? 'Gratis' : `RD$${shipping.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (totalEl) totalEl.textContent = `RD$${total.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        if (cartFooter) cartFooter.style.display = 'block';

        // Check settings and render PayPal if active
        checkCheckoutSettings();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // High-visibility floating cart toast notification
    function showCartToast(productName, productImage) {
        let toast = document.getElementById('kmizrd-cart-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'kmizrd-cart-toast';
            toast.className = 'kmizrd-cart-toast';
            document.body.appendChild(toast);
        }

        const cleanName = productName || 'Producto KMIZRD';
        toast.innerHTML = `
            <div class="toast-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <div class="toast-body">
                <span class="toast-title">¡Producto añadido al carrito!</span>
                <span class="toast-sub">${cleanName}</span>
            </div>
            <button class="toast-view-cart" type="button" aria-label="Ver carrito">Ver carrito &rarr;</button>
        `;

        toast.onclick = () => {
            const drawer = document.getElementById('cart-drawer');
            if (drawer) {
                drawer.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
            toast.classList.remove('active');
        };

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(40); } catch (e) {}
        }

        requestAnimationFrame(() => {
            toast.classList.add('active');
        });

        if (window.__cartToastTimer) {
            clearTimeout(window.__cartToastTimer);
        }

        window.__cartToastTimer = setTimeout(() => {
            toast.classList.remove('active');
        }, 3200);
    }

    function addToCart(product, size, colorParam) {
        if (!product) return;

        // Re-sync with latest cart from localStorage to prevent overwriting
        try {
            const stored = localStorage.getItem('kmizrd_cart');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) cart = parsed.filter(i => i && typeof i === 'object');
            }
        } catch (e) {}

        const selectedSize = size || (product.sizes && product.sizes[0]) || 'Única';
        const color = colorParam || product._selectedColor || getProductColor(product);
        const numPrice = parseNumericPrice(product.price) || 1500;
        
        let rawImg = product.image || (product.images && product.images[0]) || 'assets/logo.jpg';
        if (typeof rawImg === 'string' && rawImg.includes(',')) {
            rawImg = rawImg.split(',')[0].trim();
        }
        const cleanImg = typeof rawImg === 'string' ? rawImg.replace(/^(\.\.\/)+/, '') : 'assets/logo.jpg';

        const existingIndex = cart.findIndex(item => item && String(item.id) === String(product.id) && item.size === selectedSize && item.color === color);
        
        if (existingIndex > -1) {
            cart[existingIndex].quantity += 1;
        } else {
            cart.push({
                id: product.id || ('prod-' + Date.now()),
                name: product.name || 'Producto KMIZRD',
                price: numPrice,
                image: cleanImg,
                size: selectedSize,
                color: color,
                quantity: 1
            });
        }
        
        localStorage.setItem('kmizrd_cart', JSON.stringify(cart));
        updateCartUI();

        // Show instant visual confirmation toast
        showCartToast(product.name || 'Producto KMIZRD', cleanImg);

        // Open cart drawer and prevent page scroll
        const drawer = document.getElementById('cart-drawer');
        if (drawer) {
            drawer.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Modal Add-To-Cart listener (Always adds to cart with feedback!)
    const modalAddCartBtn = document.querySelector('.modal-add-cart-btn');
    if (modalAddCartBtn) {
        modalAddCartBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Fail-safe product resolution: use currentModalProduct or extract from open modal DOM
            const productToAdd = currentModalProduct || {
                id: document.querySelector('.product-card[data-id]')?.getAttribute('data-id') || ('prod-' + Date.now()),
                name: document.getElementById('modal-product-name')?.textContent || 'Producto KMIZRD',
                price: document.getElementById('modal-product-price')?.textContent || 'RD$1,500.00',
                image: document.getElementById('modal-product-img')?.getAttribute('src') || 'assets/logo.jpg',
                category: document.getElementById('modal-product-category')?.textContent || 'COLECCIONES'
            };
            
            // Get selected size
            const activeSizeBtn = document.querySelector('.size-badge-modal.active');
            const size = activeSizeBtn ? activeSizeBtn.textContent : 'Única';

            // Visual button confirmation state
            const originalHTML = modalAddCartBtn.innerHTML;
            modalAddCartBtn.innerHTML = '<i class="fa fa-check"></i> ¡Producto Añadido!';
            modalAddCartBtn.style.backgroundColor = '#10b981';
            modalAddCartBtn.style.borderColor = '#10b981';

            // Add item to cart!
            addToCart(productToAdd, size);

            // Close modal after brief visual confirmation and ensure drawer stays open
            setTimeout(() => {
                modalAddCartBtn.innerHTML = originalHTML;
                modalAddCartBtn.style.backgroundColor = '';
                modalAddCartBtn.style.borderColor = '';
                closeProductModal();
                const drawer = document.getElementById('cart-drawer');
                if (drawer) {
                    drawer.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            }, 300);
        });
    }

    // Header Cart click opens drawer (globally delegated)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.cart-btn, [aria-label="Cart"], .open-cart-btn');
        if (btn) {
            e.preventDefault();
            const drawer = document.getElementById('cart-drawer');
            if (drawer) {
                drawer.classList.add('active');
                document.body.style.overflow = 'hidden';
                if (typeof updateCartUI === 'function') updateCartUI();
            }
        }
    });

    // Cart Drawer close button click
    if (cartCloseBtn) {
        cartCloseBtn.addEventListener('click', () => {
            cartDrawer.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Cart Drawer Click Outside closes drawer
    if (cartDrawer) {
        cartDrawer.addEventListener('click', (e) => {
            if (e.target === cartDrawer) {
                cartDrawer.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // Cart Items click delegates for quantities and deletions
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (e) => {
            const minusBtn = e.target.closest('.qty-btn-minus');
            const plusBtn = e.target.closest('.qty-btn-plus');
            const removeBtn = e.target.closest('.cart-item-remove');

            if (minusBtn) {
                const idx = parseInt(minusBtn.getAttribute('data-index'));
                cart[idx].quantity -= 1;
                if (cart[idx].quantity <= 0) {
                    cart.splice(idx, 1);
                }
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
    }

    // Initialize Cart Count and items on load
    updateCartUI();

    // Checkout button handler
    const checkoutBtn = document.querySelector('.cart-checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            if (cart.length === 0) return;
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = 'Procesando...';

            try {
                // Fetch payment settings from Supabase
                const { data, error } = await _supabase
                    .from('store_settings')
                    .select('*')
                    .eq('id', 1)
                    .single();

                if (error) {
                    // If table settings doesn't exist yet, fall back to WhatsApp directly
                    if (error.code === 'PGRST116' || error.code === '42P01') {
                        fallbackToWhatsApp();
                        return;
                    }
                    throw error;
                }

                const subtotalText = document.getElementById('cart-subtotal').textContent;
                const shippingText = document.getElementById('cart-shipping').textContent;
                const totalText = document.getElementById('cart-total').textContent;

                // Branching logic based on active gateway
                if (data.stripe_active) {
                    await handleRealStripeCheckout(data.stripe_publishable_key, data.stripe_secret_key);
                } else if (data.azul_active) {
                    await handleRealAzulCheckout(data.azul_merchant_id, data.azul_auth_key);
                } else {
                    // WhatsApp checkout (default / WhatsApp active)
                    const number = data.whatsapp_number ? data.whatsapp_number.replace(/\D/g, '') : '18090000000';
                    
                    // Create pending order first to get an ID!
                    let orderIdText = '';
                    try {
                        const sub = parseFloat(subtotalText.replace(/[^\d.]/g, ''));
                        const sh = parseFloat(shippingText.replace(/[^\d.]/g, '')) || 0;
                        const tot = parseFloat(totalText.replace(/[^\d.]/g, ''));
                        
                        const { data: newOrder, error: orderErr } = await _supabase
                            .from('store_orders')
                            .insert([{
                                customer_name: 'Cliente WhatsApp',
                                customer_email: '',
                                items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, size: i.size, color: i.color || '', quantity: i.quantity })),
                                subtotal: sub,
                                shipping: sh,
                                total: tot,
                                payment_method: 'whatsapp',
                                payment_status: 'pending',
                                payment_reference: 'WhatsApp (Pendiente)'
                            }])
                            .select()
                            .single();
                        
                        if (newOrder) {
                            orderIdText = ` (#${newOrder.id.slice(0, 8)})`;
                        }
                    } catch (e) {
                        console.error('Error recording WhatsApp order:', e);
                    }

                    let orderTextWithId = `¡Hola KMIZRD! Me gustaría realizar un pedido${orderIdText}:\n\n`;
                    cart.forEach(item => {
                        const colorText = item.color ? `, Color: ${item.color}` : '';
                        orderTextWithId += `- ${item.quantity}x ${item.name} (Talla: ${item.size}${colorText}) - ${item.price}\n`;
                    });
                    orderTextWithId += `\nSubtotal: ${subtotalText}`;
                    orderTextWithId += `\nEnvío: ${shippingText}`;
                    orderTextWithId += `\nTotal: ${totalText}`;

                    const encodedText = encodeURIComponent(orderTextWithId);
                    const whatsappUrl = `https://wa.me/${number}?text=${encodedText}`;
                    window.open(whatsappUrl, '_blank');

                    // Clear cart
                    clearCart();
                    alert('¡Redirigiendo a WhatsApp para completar tu pedido!');
                }

            } catch (err) {
                console.error('Error procesando checkout:', err);
                fallbackToWhatsApp();
            } finally {
                checkoutBtn.disabled = false;
                checkCheckoutSettings();
            }
        });
    }

    async function handleSimulatedCheckout(method, methodName) {
        const subtotalText = document.getElementById('cart-subtotal').textContent;
        const shippingText = document.getElementById('cart-shipping').textContent;
        const totalText = document.getElementById('cart-total').textContent;
        
        const cardPrompt = prompt('Introduce los últimos 4 dígitos de tu tarjeta para la simulación:', '4242');
        if (cardPrompt === null) return; // Cancelled
        
        const cardDigits = cardPrompt.slice(-4).padStart(4, '*');
        const cardReference = `Tarjeta **** ${cardDigits}`;
        
        const namePrompt = prompt('Introduce tu nombre completo:', 'Cliente de Prueba');
        const emailPrompt = prompt('Introduce tu correo electrónico:', 'cliente@gmail.com');
        
        try {
            const sub = parseFloat(subtotalText.replace(/[^\d.]/g, ''));
            const sh = parseFloat(shippingText.replace(/[^\d.]/g, '')) || 0;
            const tot = parseFloat(totalText.replace(/[^\d.]/g, ''));
            
            const { error } = await _supabase
                .from('store_orders')
                .insert([{
                    customer_name: namePrompt || 'Cliente Anónimo',
                    customer_email: emailPrompt || 'cliente@gmail.com',
                    items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, size: i.size, color: i.color || '', quantity: i.quantity })),
                    subtotal: sub,
                    shipping: sh,
                    total: tot,
                    payment_method: method,
                    payment_status: 'approved',
                    payment_reference: cardReference
                }]);
                
            if (error) throw error;
            alert(`¡Pago simulado con éxito con ${methodName}! Tu pedido ha sido registrado.`);
            clearCart();
        } catch (e) {
            console.error('Error recording simulated order:', e);
            alert('Error al registrar la orden: ' + e.message);
        }
    }

    async function fallbackToWhatsApp() {
        let orderIdText = '';
        const subtotalText = document.getElementById('cart-subtotal').textContent;
        const shippingText = document.getElementById('cart-shipping').textContent;
        const totalText = document.getElementById('cart-total').textContent;

        try {
            const sub = parseFloat(subtotalText.replace(/[^\d.]/g, ''));
            const sh = parseFloat(shippingText.replace(/[^\d.]/g, '')) || 0;
            const tot = parseFloat(totalText.replace(/[^\d.]/g, ''));
            
            const { data: newOrder } = await _supabase
                .from('store_orders')
                .insert([{
                    customer_name: 'Cliente Respaldo WhatsApp',
                    customer_email: '',
                    items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, size: i.size, color: i.color || '', quantity: i.quantity })),
                    subtotal: sub,
                    shipping: sh,
                    total: tot,
                    payment_method: 'whatsapp',
                    payment_status: 'pending',
                    payment_reference: 'Respaldo WhatsApp (Pendiente)'
                }])
                .select()
                .single();
            
            if (newOrder) {
                orderIdText = ` (#${newOrder.id.slice(0, 8)})`;
            }
        } catch (e) {
            console.error('Error saving fallback WhatsApp order:', e);
        }

        let orderText = `¡Hola KMIZRD! Me gustaría realizar un pedido${orderIdText}:\n\n`;
        cart.forEach(item => {
            const colorText = item.color ? `, Color: ${item.color}` : '';
            const itemPrice = parseNumericPrice(item.price);
            const priceFormatted = itemPrice > 0 ? `RD$${itemPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}` : (item.price || 'RD$1,500.00');
            orderText += `- ${item.quantity}x ${item.name} (Talla: ${item.size}${colorText}) - ${priceFormatted}\n`;
        });
        orderText += `\nSubtotal: ${subtotalText}`;
        orderText += `\nEnvío: ${shippingText}`;
        orderText += `\nTotal: ${totalText}`;

        const encodedText = encodeURIComponent(orderText);
        window.open(`https://wa.me/${storeWhatsAppNumber}?text=${encodedText}`, '_blank');
        clearCart();
        alert('¡Redirigiendo a WhatsApp de respaldo para completar tu pedido!');
    }

    function clearCart() {
        cart = [];
        localStorage.setItem('kmizrd_cart', JSON.stringify(cart));
        updateCartUI();
        if (cartDrawer) {
            cartDrawer.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    async function checkCheckoutSettings() {
        const checkoutBtn = document.querySelector('.cart-checkout-btn');
        const paypalContainer = document.getElementById('paypal-button-container');
        if (!checkoutBtn || !paypalContainer) return;

        try {
            const { data, error } = await _supabase
                .from('store_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) {
                // If table doesn't exist, use WhatsApp fallback by default
                checkoutBtn.style.display = 'flex';
                checkoutBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Enviar pedido por WhatsApp';
                paypalContainer.style.display = 'none';
                return;
            }

            if (data && data.paypal_active && data.paypal_client_id) {
                // Hide default checkout button and show PayPal
                checkoutBtn.style.display = 'none';
                paypalContainer.style.display = 'block';

                if (!window.paypalScriptLoaded) {
                    window.paypalScriptLoaded = true;
                    const script = document.createElement('script');
                    script.src = `https://www.paypal.com/sdk/js?client-id=${data.paypal_client_id}&currency=USD`;
                    script.onload = () => {
                        renderPayPalButtons();
                    };
                    document.body.appendChild(script);
                } else if (window.paypal) {
                    renderPayPalButtons();
                }
            } else {
                checkoutBtn.style.display = 'flex';
                paypalContainer.style.display = 'none';

                if (data.stripe_active) {
                    checkoutBtn.innerHTML = '<i class="fab fa-stripe-s"></i> Pagar con Tarjeta (Stripe)';
                } else if (data.azul_active) {
                    checkoutBtn.innerHTML = '<i class="fa fa-credit-card"></i> Pagar con Azul';
                } else {
                    checkoutBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Enviar pedido por WhatsApp';
                }
            }
        } catch (err) {
            console.error('Error checking payment settings:', err);
            checkoutBtn.style.display = 'flex';
            paypalContainer.style.display = 'none';
        }
    }

    function renderPayPalButtons() {
        const container = document.getElementById('paypal-button-container');
        if (!container) return;
        container.innerHTML = ''; // Clear previous button instances

        // Calculate total in USD (1 USD = 59 RD$)
        const totalRD = parseFloat(document.getElementById('cart-total').textContent.replace(/[^\d.]/g, '')) || 0;
        const totalUSD = (totalRD / 59).toFixed(2);

        if (window.paypal) {
            window.paypal.Buttons({
                createOrder: function(data, actions) {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: totalUSD,
                                currency_code: 'USD'
                            },
                            description: 'Compra en Tienda KMIZRD'
                        }]
                    });
                },
                onApprove: function(data, actions) {
                    return actions.order.capture().then(async function(details) {
                        // Save approved PayPal order in database
                        try {
                            const subtotalText = document.getElementById('cart-subtotal').textContent;
                            const shippingText = document.getElementById('cart-shipping').textContent;
                            const totalText = document.getElementById('cart-total').textContent;
                            
                            const sub = parseFloat(subtotalText.replace(/[^\d.]/g, ''));
                            const sh = parseFloat(shippingText.replace(/[^\d.]/g, '')) || 0;
                            const tot = parseFloat(totalText.replace(/[^\d.]/g, ''));
                            
                            const payerName = `${details.payer.name.given_name} ${details.payer.name.surname}`;
                            const payerEmail = details.payer.email_address;
                            const payRef = `PayPal ID: ${details.id}`;

                            await _supabase
                                .from('store_orders')
                                .insert([{
                                    customer_name: payerName,
                                    customer_email: payerEmail,
                                    items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, size: i.size, quantity: i.quantity })),
                                    subtotal: sub,
                                    shipping: sh,
                                    total: tot,
                                    payment_method: 'paypal',
                                    payment_status: 'approved',
                                    payment_reference: payRef
                                }]);
                        } catch (err) {
                            console.error('Error saving PayPal order to database:', err);
                        }

                        alert('¡Pago de USD ' + totalUSD + ' realizado con éxito por ' + details.payer.name.given_name + '! Gracias por tu compra.');
                        clearCart();
                    });
                },
                onError: function(err) {
                    console.error('PayPal SDK error:', err);
                    alert('Ocurrió un error al procesar el pago con PayPal.');
                }
            }).render('#paypal-button-container');
        }
    }

    let stripeInstance = null;
    let cardElement = null;

    async function handleRealStripeCheckout(publishableKey, secretKey) {
        if (!window.Stripe) {
            alert('El SDK de Stripe no está cargado. Por favor, intenta de nuevo.');
            return;
        }

        const subtotalText = document.getElementById('cart-subtotal').textContent;
        const shippingText = document.getElementById('cart-shipping').textContent;
        const totalText = document.getElementById('cart-total').textContent;
        const totalRD = parseFloat(totalText.replace(/[^\d.]/g, '')) || 0;

        document.getElementById('stripe-modal-total').textContent = totalText;

        // Open Stripe Modal
        const stripeModal = document.getElementById('stripe-modal');
        if (stripeModal) {
            stripeModal.classList.add('active');
        }

        // Initialize Stripe
        if (!stripeInstance) {
            stripeInstance = window.Stripe(publishableKey);
            const elements = stripeInstance.elements();
            cardElement = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#0f172a',
                        fontFamily: 'Outfit, sans-serif',
                        '::placeholder': {
                            color: '#94a3b8'
                        }
                    }
                }
            });
            cardElement.mount('#stripe-card-element');
        }

        // Listen for close click
        const closeStripeBtn = document.getElementById('stripe-modal-close');
        if (closeStripeBtn) {
            closeStripeBtn.addEventListener('click', () => {
                stripeModal.classList.remove('active');
            });
        }

        const form = document.getElementById('stripe-payment-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('stripe-submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Procesando Pago...';

            try {
                // 1. Create PaymentIntent via Stripe API
                const totalCents = Math.round(totalRD * 100);
                const response = await fetch('https://api.stripe.com/v1/payment_intents', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${secretKey}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        amount: totalCents,
                        currency: 'dop',
                        description: 'Compra en Tienda KMIZRD'
                    })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error.message || 'Error de comunicación con Stripe.');
                }

                const piData = await response.json();
                const clientSecret = piData.client_secret;

                // 2. Confirm card payment with Stripe
                const result = await stripeInstance.confirmCardPayment(clientSecret, {
                    payment_method: {
                        card: cardElement
                    }
                });

                if (result.error) {
                    throw new Error(result.error.message);
                }

                if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                    // Save approved order to Supabase
                    const sub = parseFloat(subtotalText.replace(/[^\d.]/g, ''));
                    const sh = parseFloat(shippingText.replace(/[^\d.]/g, '')) || 0;
                    const tot = parseFloat(totalText.replace(/[^\d.]/g, ''));

                    const cardBrand = result.paymentIntent.charges.data[0].payment_method_details.card.brand.toUpperCase();
                    const cardLast4 = result.paymentIntent.charges.data[0].payment_method_details.card.last4;

                    await _supabase
                        .from('store_orders')
                        .insert([{
                            customer_name: 'Cliente Stripe',
                            customer_email: '',
                            items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, size: i.size, quantity: i.quantity })),
                            subtotal: sub,
                            shipping: sh,
                            total: tot,
                            payment_method: 'stripe',
                            payment_status: 'approved',
                            payment_reference: `Stripe - ${cardBrand} **** ${cardLast4}`
                        }]);

                    alert('¡Pago procesado con éxito por Stripe! Pedido registrado.');
                    stripeModal.classList.remove('active');
                    clearCart();
                }
            } catch (err) {
                console.error(err);
                document.getElementById('stripe-card-errors').textContent = err.message;
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="shield-check"></i> Pagar Ahora';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        };
    }

    async function handleRealAzulCheckout(merchantId, authKey) {
        const subtotalText = document.getElementById('cart-subtotal').textContent;
        const shippingText = document.getElementById('cart-shipping').textContent;
        const totalText = document.getElementById('cart-total').textContent;
        const totalRD = parseFloat(totalText.replace(/[^\d.]/g, '')) || 0;

        // Create pending order first to get an ID!
        let newOrder = null;
        try {
            const sub = parseFloat(subtotalText.replace(/[^\d.]/g, ''));
            const sh = parseFloat(shippingText.replace(/[^\d.]/g, '')) || 0;
            const tot = parseFloat(totalText.replace(/[^\d.]/g, ''));
            
            const { data, error } = await _supabase
                .from('store_orders')
                .insert([{
                    customer_name: 'Cliente Azul',
                    customer_email: '',
                    items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, size: i.size, quantity: i.quantity })),
                    subtotal: sub,
                    shipping: sh,
                    total: tot,
                    payment_method: 'azul',
                    payment_status: 'pending',
                    payment_reference: 'Redirigiendo a Azul'
                }])
                .select()
                .single();

            if (error) throw error;
            newOrder = data;
        } catch (e) {
            console.error('Error recording pending Azul order:', e);
            alert('Error al iniciar pedido con Azul: ' + e.message);
            return;
        }

        if (!newOrder) return;

        const amountCents = Math.round(totalRD * 100);
        const orderNumber = newOrder.id.slice(0, 8);
        const approvedUrl = window.location.origin + window.location.pathname + '?azul_status=approved';
        const declinedUrl = window.location.origin + window.location.pathname + '?azul_status=declined';
        const cancelUrl = window.location.origin + window.location.pathname + '?azul_status=cancelled';

        // Azul signature concatenation formula
        const dataToSign = `${merchantId}${orderNumber}${amountCents}${approvedUrl}${declinedUrl}${cancelUrl}`;
        
        let signature = '';
        try {
            signature = await computeHmacSha256(authKey, dataToSign);
        } catch (err) {
            console.error('Error generating signature:', err);
            alert('Ocurrió un error al firmar los datos de pago de Azul.');
            return;
        }

        // Redirect to Azul payment portal (Hosted Payment Page)
        const form = document.createElement('form');
        form.method = 'POST';
        // Azul sandbox/test URL by default, or live if configured
        form.action = 'https://test.azul.com.do/paymentpage.aspx'; 

        const fields = {
            'MerchantId': merchantId,
            'Amount': amountCents,
            'OrderNumber': orderNumber,
            'ApprovedUrl': approvedUrl,
            'DeclinedUrl': declinedUrl,
            'CancelUrl': cancelUrl,
            'AuthKey': signature
        };

        for (const [key, value] of Object.entries(fields)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
    }

    async function computeHmacSha256(key, message) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        const messageData = encoder.encode(message);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signatureBuffer = await crypto.subtle.sign(
            'HMAC',
            cryptoKey,
            messageData
        );
        
        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // ==========================================
    // SECCIÓN DE PERSONALIZACIÓN LOGIC
    // ==========================================
    const customForm = document.getElementById('custom-apparel-form');
    const customDragArea = document.getElementById('custom-drag-area');
    const customFileInput = document.getElementById('custom-image-file');
    const customPreviewContainer = document.getElementById('custom-image-preview-container');
    const customPreviewImage = document.getElementById('custom-image-preview');
    const customRemovePreviewBtn = document.getElementById('custom-remove-preview-btn');
    let customBase64Image = '';

    // Close personalization modal
    const customModalCloseBtn = document.getElementById('custom-modal-close-btn');
    const personalizationModal = document.getElementById('personalization-modal');
    if (customModalCloseBtn) {
        customModalCloseBtn.addEventListener('click', () => {
            if (personalizationModal) personalizationModal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    if (personalizationModal) {
        personalizationModal.addEventListener('click', (e) => {
            if (e.target === personalizationModal) {
                personalizationModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // ==========================================
    // Multi-Category Custom Catalog & Modal Handler
    // ==========================================
    const CUSTOM_CATALOG = {
        'CAMISETAS': {
            label: 'Camisetas',
            image: 'assets/plain_tshirt.png',
            types: [
                'Camiseta 100% Algodón',
                'Camiseta 100% Poliéster',
                'Camiseta Ojo de Ángel',
                'Camiseta Oversize Algodón',
                'Camiseta Manga Larga Algodón',
                'Camiseta Manga Larga Dryfit'
            ],
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        },
        'ABRIGOS': {
            label: 'Abrigos',
            image: 'assets/plain_hoodie.png',
            types: [
                'Hoodie Clásico con Capucha y Bolsillo',
                'Abrigo Cuello Redondo (Sweater)',
                'Hoodie Oversize Premium',
                'Abrigo con Cierre / Cremallera'
            ],
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        },
        'GORRAS': {
            label: 'Gorras',
            image: 'assets/plain_cap.png',
            types: [
                'Gorra Trucker (Malla)',
                'Gorra Clásica (Dad Cap)',
                'Gorra Plana (Snapback)',
                'Gorra Cerrada (Flexfit)'
            ],
            sizes: ['Ajustable / Talla Única']
        },
        'POLOS': {
            label: 'Polos',
            image: 'assets/plain_polo.png',
            types: [
                'Polo Piqué Clásico (Algodón)',
                'Polo Dryfit Deportivo',
                'Polo Manga Larga Piqué'
            ],
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        },
        'OTROS': {
            label: 'Otros',
            image: 'assets/plain_thermos.png',
            types: [
                'Taza Blanca de Cerámica (11 oz)',
                'Taza Mágica Personalizada',
                'Termo de Acero Inoxidable',
                'Termo Deportivo de Aluminio',
                'Bolsas Ecológicas (Tote Bags)'
            ],
            sizes: ['Estándar']
        }
    };

    function resolveCustomCategory(cat) {
        if (!cat) return 'CAMISETAS';
        const c = cat.toUpperCase();
        if (c.includes('ABRIGO') || c.includes('HOODIE')) return 'ABRIGOS';
        if (c.includes('GORRA') || c.includes('CAP') || c.includes('ACCESORIO')) return 'GORRAS';
        if (c.includes('POLO')) return 'POLOS';
        if (c.includes('OTRO') || c.includes('TAZA') || c.includes('TERMO') || c.includes('BOLSA')) return 'OTROS';
        return 'CAMISETAS';
    }

    function setupCustomModalForCategory(catKey, selectedTypeName) {
        const resolvedKey = resolveCustomCategory(catKey);
        const config = CUSTOM_CATALOG[resolvedKey] || CUSTOM_CATALOG['CAMISETAS'];

        const catSelect = document.getElementById('custom-modal-cat-select');
        if (catSelect) catSelect.value = resolvedKey;

        const catSpan = document.getElementById('custom-modal-product-cat');
        if (catSpan) catSpan.textContent = config.label.toUpperCase();

        const imgEl = document.getElementById('custom-modal-product-img');
        if (imgEl) imgEl.src = config.image;

        const typeSelect = document.getElementById('custom-modal-type-select');
        if (typeSelect) {
            typeSelect.innerHTML = config.types.map(t =>
                `<option value="${t}" ${t === selectedTypeName ? 'selected' : ''}>${t}</option>`
            ).join('');
        }

        const chosenType = (typeSelect && typeSelect.value) ? typeSelect.value : (selectedTypeName || config.types[0]);
        const modalName = document.getElementById('custom-modal-product-name');
        if (modalName) modalName.textContent = chosenType;

        const sizesContainer = document.getElementById('custom-modal-sizes');
        if (sizesContainer) {
            sizesContainer.innerHTML = config.sizes.map((s, idx) =>
                `<button type="button" class="custom-size-btn ${idx === 0 ? 'active' : ''}" style="font-size: 10px; padding: 4px 8px; border: 1px solid ${idx === 0 ? 'var(--accent-color)' : '#475569'}; background: ${idx === 0 ? 'var(--accent-color)' : 'transparent'}; color: ${idx === 0 ? '#0f172a' : '#fff'}; font-weight: 700; border-radius: 4px; cursor: pointer;">${s}</button>`
            ).join('');
            customCurrentSize = config.sizes[0] || 'Única';

            sizesContainer.querySelectorAll('.custom-size-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    sizesContainer.querySelectorAll('.custom-size-btn').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'transparent';
                        b.style.color = '#fff';
                        b.style.borderColor = '#475569';
                    });
                    btn.classList.add('active');
                    btn.style.background = 'var(--accent-color)';
                    btn.style.color = '#0f172a';
                    btn.style.borderColor = 'var(--accent-color)';
                    customCurrentSize = btn.textContent.trim();
                });
            });
        }

        customCurrentProduct = {
            name: chosenType,
            category: config.label,
            image: config.image
        };
        customBase64Image = config.image;

        const previewImg = document.getElementById('custom-image-preview');
        const previewCont = document.getElementById('custom-image-preview-container');
        const customDragArea = document.getElementById('custom-drag-area');
        if (previewImg) previewImg.src = config.image;
        if (customDragArea) {
            const di = customDragArea.querySelector('.drag-icon');
            const dt = customDragArea.querySelector('.drag-text');
            if (di) di.style.display = 'none';
            if (dt) dt.style.display = 'none';
        }
        if (previewCont) previewCont.style.display = 'flex';
    }

    // Modal Category & Type Select Change Listeners
    const modalCatSelect = document.getElementById('custom-modal-cat-select');
    if (modalCatSelect) {
        modalCatSelect.addEventListener('change', (e) => {
            setupCustomModalForCategory(e.target.value);
        });
    }

    const modalTypeSelect = document.getElementById('custom-modal-type-select');
    if (modalTypeSelect) {
        modalTypeSelect.addEventListener('change', (e) => {
            const modalName = document.getElementById('custom-modal-product-name');
            if (modalName) modalName.textContent = e.target.value;
            if (customCurrentProduct) customCurrentProduct.name = e.target.value;
        });
    }

    // Navigation Custom Items Click handler
    document.querySelectorAll('.nav-custom-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const cat = item.getAttribute('data-product-cat') || 'CAMISETAS';
            const name = item.getAttribute('data-product-name') || '';

            const personalizationModal = document.getElementById('personalization-modal');
            if (personalizationModal) {
                setupCustomModalForCategory(cat, name);

                // Reset color picker
                const customColorsContainer = document.getElementById('custom-colors');
                if (customColorsContainer) {
                    customColorsContainer.querySelectorAll('.color-circle').forEach(b => b.classList.remove('active'));
                    const firstColor = customColorsContainer.querySelector('.color-circle');
                    if (firstColor) firstColor.classList.add('active');
                }
                
                // Reset preview color overlay
                const overlay = document.getElementById('custom-modal-product-overlay');
                if (overlay) overlay.style.backgroundColor = 'transparent';

                // Reset description
                const descTextarea = document.getElementById('custom-desc');
                if (descTextarea) descTextarea.value = '';

                personalizationModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    // Smooth scroll for catalog nav links
    document.querySelectorAll('.catalog-nav-link, .catalog-card-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = document.getElementById('catalog-section');
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Variables to track which product is being personalized
    let customCurrentProduct = null;
    let customCurrentSize = 'Única';

    // Custom Size toggle
    const customSizesContainer = document.getElementById('custom-sizes');
    if (customSizesContainer) {
        customSizesContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.custom-size-btn');
            if (btn) {
                customSizesContainer.querySelectorAll('.custom-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    }

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

    // Custom Color picker circle toggle
    const customColorsContainer = document.getElementById('custom-colors');
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

    // Custom Drag & Drop reference image
    if (customDragArea && customFileInput) {
        customDragArea.addEventListener('click', (e) => {
            if (e.target.closest('#custom-remove-preview-btn')) return;
            customFileInput.click();
        });

        customDragArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            customDragArea.style.borderColor = 'var(--accent-color)';
            customDragArea.style.backgroundColor = '#f0f9ff';
        });

        customDragArea.addEventListener('dragleave', () => {
            customDragArea.style.borderColor = '#cbd5e1';
            customDragArea.style.backgroundColor = '';
        });

        customDragArea.addEventListener('drop', (e) => {
            e.preventDefault();
            customDragArea.style.borderColor = '#cbd5e1';
            customDragArea.style.backgroundColor = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleCustomImageFile(file);
            }
        });

        customFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleCustomImageFile(file);
            }
        });
    }

    function handleCustomImageFile(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            customBase64Image = event.target.result;
            if (customPreviewImage) customPreviewImage.src = customBase64Image;
            
            // Toggle view visibility
            const dragIcon = customDragArea.querySelector('.drag-icon');
            const dragText = customDragArea.querySelector('.drag-text');
            if (dragIcon) dragIcon.style.display = 'none';
            if (dragText) dragText.style.display = 'none';
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
            
            const dragIcon = customDragArea.querySelector('.drag-icon');
            const dragText = customDragArea.querySelector('.drag-text');
            if (dragIcon) dragIcon.style.display = 'block';
            if (dragText) dragText.style.display = 'block';
            if (customPreviewContainer) customPreviewContainer.style.display = 'none';
        });
    }

    // Submit Customization form
    if (customForm) {
        customForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = customForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Enviando...';

            // Use product context stored when the modal was opened
            const prodType = customCurrentProduct ? customCurrentProduct.category : 'Personalizado';
            const size = customCurrentSize || 'Única';
            const activeColorBtn = customColorsContainer ? customColorsContainer.querySelector('.color-circle.active') : null;
            const color = activeColorBtn ? activeColorBtn.getAttribute('data-color') : 'Negro';
            const desc = document.getElementById('custom-desc').value;
            const name = document.getElementById('custom-name').value;
            const phone = document.getElementById('custom-phone').value;
            const email = document.getElementById('custom-email').value;
            const productName = customCurrentProduct ? customCurrentProduct.name : '';
            const referenceImage = customBase64Image || (customCurrentProduct ? customCurrentProduct.image : '');

            try {
                const { error } = await _supabase
                    .from('custom_requests')
                    .insert([{
                        customer_name: name,
                        customer_phone: phone,
                        customer_email: email,
                        product_type: prodType,
                        product_name: productName,
                        color: color,
                        size: size,
                        description: desc,
                        reference_image: referenceImage,
                        status: 'pending'
                    }]);

                if (error) throw error;

                alert('¡Tu solicitud de personalización ha sido enviada con éxito! Nuestro equipo revisará el diseño y te contactará pronto.');

                // Close modal and reset
                if (personalizationModal) {
                    personalizationModal.classList.remove('active');
                    document.body.style.overflow = '';
                }
                customForm.reset();
                customCurrentProduct = null;
                customCurrentSize = 'Única';
                if (customRemovePreviewBtn) customRemovePreviewBtn.click();
            } catch (err) {
                console.error(err);
                alert('Ocurrió un error al registrar la solicitud: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="send" style="width: 18px; height: 18px;"></i> Enviar Solicitud';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    // 6. Subscribe to real-time changes (auto-updates the shop when products change on any device)
    _supabase
        .channel('shop-products-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            (payload) => {
                console.log('Realtime update detected in shop:', payload);
                loadProducts();
            }
        )
        .subscribe();
});

// Mobile Menu & Accordion Dropdown Logic
document.addEventListener('DOMContentLoaded', () => {
    let backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'mobile-menu-backdrop';
        document.body.appendChild(backdrop);
    }

    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const closeBtn = document.querySelector('.mobile-menu-close');

    function openMobileMenu() {
        if (navLinks) navLinks.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
        if (navLinks) navLinks.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (navLinks && navLinks.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMobileMenu();
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', closeMobileMenu);
    }

    // Dropdown accordion behavior for mobile screens (<= 991px)
    document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            if (window.innerWidth <= 991) {
                e.preventDefault();
                e.stopPropagation();
                const parentDropdown = trigger.closest('.dropdown');
                if (parentDropdown) {
                    const isOpen = parentDropdown.classList.contains('active');
                    document.querySelectorAll('.dropdown.active').forEach(d => {
                        if (d !== parentDropdown) d.classList.remove('active');
                    });
                    if (isOpen) {
                        parentDropdown.classList.remove('active');
                    } else {
                        parentDropdown.classList.add('active');
                    }
                }
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (navLinks && navLinks.classList.contains('active')) {
            if (!navLinks.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
                closeMobileMenu();
            }
        }
    });

    if (navLinks) {
        navLinks.querySelectorAll('a:not(.dropdown-trigger)').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 991) {
                    closeMobileMenu();
                }
            });
        });
    }
});

// ==========================================
// Custom Modal: Type and Size Logic
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const typeSelect = document.getElementById('custom-modal-type-select');
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            const modalName = document.getElementById('custom-modal-product-name');
            if (modalName) {
                modalName.textContent = e.target.value;
            }
        });
    }

    const sizeBtns = document.querySelectorAll('.custom-size-btn');
    sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = '#fff';
            });
            btn.classList.add('active');
            btn.style.background = 'var(--accent-color)';
            btn.style.color = '#0f172a';
        });
    });
});

// ==========================================
// Interactive Scroll-Driven Video Showcase
// ==========================================
function initPremiumScrollVideo() {
    const showcase = document.getElementById('premium-showcase');
    const video = document.getElementById('premium-scroll-video');
    const tag = document.getElementById('ps-tag');
    const heading = document.getElementById('ps-heading');
    const btnWrap = document.getElementById('ps-btn-wrap');
    const progressBar = document.getElementById('premium-scroll-progress');
    const scrollHint = document.getElementById('ps-scroll-hint');

    if (!showcase || !video) return;

    const isMobile = () => window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024);

    let hasLoadedSource = false;
    function ensureVideoPreload() {
        if (!hasLoadedSource) {
            hasLoadedSource = true;
            if (video.preload === 'none') {
                video.preload = 'metadata';
            }
        }
    }

    if ('IntersectionObserver' in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
                    ensureVideoPreload();
                    if (isMobile()) {
                        video.play().catch(() => {});
                    }
                } else if (!entry.isIntersecting || entry.intersectionRatio < 0.1) {
                    if (isMobile() && !video.paused) {
                        video.pause();
                    }
                }
            });
        }, { threshold: [0, 0.2, 0.5] });
        videoObserver.observe(showcase);
    } else {
        ensureVideoPreload();
    }

    if (isMobile()) {
        if (tag) { tag.style.opacity = '1'; tag.style.transform = 'none'; }
        if (heading) { heading.style.opacity = '1'; heading.style.transform = 'none'; }
        if (btnWrap) { btnWrap.style.opacity = '1'; btnWrap.style.transform = 'none'; }
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
    } else {
        video.pause();
        video.currentTime = 0;
    }

    let targetTime = 0;
    let currentTime = 0;
    let isVideoReady = false;
    let isTicking = false;

    function handleVideoReady() {
        if (!isVideoReady && video.duration && !isNaN(video.duration)) {
            isVideoReady = true;
            if (!isMobile()) {
                video.pause();
                onScroll();
            }
        }
    }

    video.addEventListener('loadedmetadata', handleVideoReady);
    video.addEventListener('canplay', handleVideoReady);
    video.addEventListener('canplaythrough', handleVideoReady);

    if (video.readyState >= 1) {
        handleVideoReady();
    }

    // Scroll calculations
    function calculateProgress() {
        const rect = showcase.getBoundingClientRect();
        const maxScroll = showcase.offsetHeight - window.innerHeight;
        if (maxScroll <= 0) return 0;

        const scrolled = -rect.top;
        const progress = Math.max(0, Math.min(1, scrolled / maxScroll));
        return progress;
    }

    function onScroll() {
        if (isMobile()) {
            if (tag) { tag.style.opacity = '1'; tag.style.transform = 'none'; }
            if (heading) { heading.style.opacity = '1'; heading.style.transform = 'none'; }
            if (btnWrap) { btnWrap.style.opacity = '1'; btnWrap.style.transform = 'none'; }
            const rect = showcase.getBoundingClientRect();
            const isInView = rect.top < window.innerHeight && rect.bottom > 0;
            if (video && hasLoadedSource) {
                if (isInView && video.paused) {
                    video.play().catch(() => {});
                } else if (!isInView && !video.paused) {
                    video.pause();
                }
            }
            return;
        }

        const progress = calculateProgress();

        if (video.duration && !isNaN(video.duration)) {
            // Map progress (0.0 to 1.0) directly to video duration (0s to 10s)
            targetTime = progress * video.duration;
        }

        // Scroll Hint fades away as soon as user begins scrolling
        if (scrollHint) {
            const hintOpacity = Math.max(0, 1 - progress / 0.05);
            scrollHint.style.opacity = hintOpacity;
            scrollHint.style.transform = `translateX(-50%) translateY(${(1 - hintOpacity) * 8}px)`;
        }

        // Animate editorial text elements smoothly based on progress
        const tagProgress = Math.max(0, Math.min(1, (progress - 0.08) / 0.18));
        if (tag) {
            tag.style.opacity = tagProgress;
            tag.style.transform = `translateY(${(1 - tagProgress) * 18}px)`;
        }

        const headProgress = Math.max(0, Math.min(1, (progress - 0.20) / 0.25));
        if (heading) {
            heading.style.opacity = headProgress;
            heading.style.transform = `translateY(${(1 - headProgress) * 22}px)`;
        }

        const btnProgress = Math.max(0, Math.min(1, (progress - 0.38) / 0.27));
        if (btnWrap) {
            btnWrap.style.opacity = btnProgress;
            btnWrap.style.transform = `translateY(${(1 - btnProgress) * 18}px)`;
        }

        // Subtle glowing progress line
        if (progressBar) {
            progressBar.style.width = `${progress * 100}%`;
        }
    }

    // Smooth RAF loop: interpolates currentTime towards targetTime for slow, butter-smooth scrubbing
    function render() {
        if (!isMobile() && isVideoReady && video.duration && !isNaN(video.duration)) {
            const diff = targetTime - currentTime;
            if (Math.abs(diff) > 0.005) {
                currentTime += diff * 0.15; // Smooth cushioned easing
                const safeTime = Math.max(0, Math.min(video.duration - 0.04, currentTime));
                video.currentTime = safeTime;
            }
        }
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // Passive scroll listener for optimal 60fps performance
    window.addEventListener('scroll', () => {
        if (!isTicking) {
            requestAnimationFrame(() => {
                onScroll();
                isTicking = false;
            });
            isTicking = true;
        }
    }, { passive: true });

    window.addEventListener('resize', onScroll, { passive: true });

    // Initial call
    onScroll();
}

// ==========================================
// Lazy Load Instagram Embed Iframes on Scroll
// ==========================================
function initLazyInstagramIframes() {
    const igSection = document.querySelector('.instagram-carousel-section');
    if (!igSection) return;

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const iframes = igSection.querySelectorAll('iframe[data-src]');
                    iframes.forEach((iframe, idx) => {
                        setTimeout(() => {
                            if (iframe.dataset.src) {
                                iframe.src = iframe.dataset.src;
                                delete iframe.dataset.src;
                            }
                        }, idx * 120);
                    });
                    obs.unobserve(entry.target);
                }
            });
        }, { rootMargin: '350px 0px' });
        observer.observe(igSection);
    } else {
        igSection.querySelectorAll('iframe[data-src]').forEach(iframe => {
            iframe.src = iframe.dataset.src;
        });
    }
}

// Run on DOMContentLoaded or immediately if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPremiumScrollVideo();
        initLazyInstagramIframes();
    });
} else {
    initPremiumScrollVideo();
    initLazyInstagramIframes();
}
