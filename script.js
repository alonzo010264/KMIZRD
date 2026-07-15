// Initialize Supabase Client
const supabaseUrl = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const supabaseKey = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let allProducts = [];
let currentModalProduct = null;
let cart = JSON.parse(localStorage.getItem('kmizrd_cart')) || [];

document.addEventListener('DOMContentLoaded', () => {
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

    // 1. Fetch dynamic products from Supabase
    async function loadProducts() {
        if (!productGrid) return;

        try {
            const { data, error } = await _supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            allProducts = (data || []).map(p => ({
                id: p.id,
                name: p.name,
                price: p.price.toString().startsWith('RD$') ? p.price : `RD$${parseFloat(p.price).toLocaleString('en-US', {minimumFractionDigits: 2})}`,
                category: p.category,
                desc: p.description,
                sizes: p.sizes || ['Única'],
                image: p.image
            }));

            renderProducts();
        } catch (err) {
            console.error('Error cargando productos de Supabase:', err);
            allProducts = [];
            renderProducts();
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

        allProducts.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.setAttribute('data-id', prod.id);

            // Check if product is static or db
            const isDiscount = prod.name.toLowerCase() === 'gorra clasica';
            const badgeHTML = isDiscount 
                ? `<span class="badge sale">-20%</span>` 
                : `<span class="badge">NUEVO</span>`;
            
            const priceHTML = isDiscount
                ? `<span class="old-price">RD$1,500.00</span> RD$1,200.00`
                : prod.price;

            card.innerHTML = `
                <div class="product-image-wrap">
                    ${badgeHTML}
                    <button class="wishlist-btn"><i data-lucide="heart"></i></button>
                    <img src="${prod.image}" alt="${prod.name}">
                </div>
                <div class="product-details">
                    <h3>${prod.name}</h3>
                    <p class="price">${priceHTML}</p>
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

    // 2. Event delegation for product clicks and wishlist clicks
    if (productGrid) {
        productGrid.addEventListener('click', (e) => {
            // Check if wishlist button was clicked
            const wishlistBtn = e.target.closest('.wishlist-btn');
            if (wishlistBtn) {
                e.preventDefault();
                e.stopPropagation(); // Prevent opening modal
                const icon = wishlistBtn.querySelector('i');
                if (icon.getAttribute('fill') === 'currentColor') {
                    icon.setAttribute('fill', 'none');
                    wishlistBtn.style.color = '#999';
                } else {
                    icon.setAttribute('fill', 'currentColor');
                    wishlistBtn.style.color = '#ff3366';
                }
                return;
            }

            // Otherwise, check if a product card was clicked
            const card = e.target.closest('.product-card');
            if (card) {
                const prodId = card.getAttribute('data-id');
                const product = allProducts.find(p => p.id === prodId);
                if (product) {
                    openProductModal(product);
                }
            }
        });
    }

    // 3. Modal details populator and controller
    function openProductModal(product) {
        if (!modal) return;
        currentModalProduct = product;

        // Populate details
        document.getElementById('modal-product-img').src = product.image;
        document.getElementById('modal-product-img').alt = product.name;
        document.getElementById('modal-product-category').textContent = product.category;
        document.getElementById('modal-product-name').textContent = product.name;
        
        const isDiscount = product.name.toLowerCase() === 'gorra clasica';
        document.getElementById('modal-product-price').innerHTML = isDiscount 
            ? `<span class="old-price" style="font-size: 18px;">RD$1,500.00</span> RD$1,200.00`
            : product.price;
        document.getElementById('modal-product-desc').textContent = product.desc;

        // Toggle button styling for customization request
        const modalAddCartBtn = document.querySelector('.modal-add-cart-btn');
        if (modalAddCartBtn) {
            const catLower = (product.category || '').toLowerCase();
            const isColeccion = catLower === 'colección' || catLower === 'colecciones' || catLower === 'coleccion';
            
            if (!isColeccion) {
                modalAddCartBtn.innerHTML = '<i class="fas fa-palette"></i> Solicitar Personalización';
                modalAddCartBtn.classList.add('personalize-btn');
            } else {
                modalAddCartBtn.innerHTML = '<i class="fa fa-shopping-cart"></i> Añadir al Carrito';
                modalAddCartBtn.classList.remove('personalize-btn');
            }
        }

        // Populate sizes
        const sizesContainer = document.getElementById('modal-sizes-container');
        sizesContainer.innerHTML = '';
        product.sizes.forEach((size, idx) => {
            const btn = document.createElement('button');
            btn.className = `size-badge-modal ${idx === 0 ? 'active' : ''}`;
            btn.textContent = size;
            btn.addEventListener('click', () => {
                sizesContainer.querySelectorAll('.size-badge-modal').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            sizesContainer.appendChild(btn);
        });

        // Load recommendations
        renderRecommendations(product);

        // Open modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Lock background scroll
    }

    function closeProductModal() {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
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
                    <img src="${prod.image}" alt="${prod.name}">
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

    // Simple interaction for hero carousel dots
    const dots = document.querySelectorAll('.dot');
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            document.querySelector('.dot.active').classList.remove('active');
            dot.classList.add('active');
        });
    });

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
            
            // Extract numeric price (e.g. "RD$2,000.00" -> 2000.00)
            const numericPrice = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
            const itemSubtotal = numericPrice * item.quantity;
            subtotal += itemSubtotal;

            const cartItemEl = document.createElement('div');
            cartItemEl.className = 'cart-item';
            cartItemEl.innerHTML = `
                <div class="cart-item-img">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-meta">Talla: <strong>${item.size}</strong></div>
                    <div class="cart-item-bottom">
                        <div class="cart-item-qty">
                           <button class="qty-btn-minus" data-index="${index}">&minus;</button>
                           <span>${item.quantity}</span>
                           <button class="qty-btn-plus" data-index="${index}">&plus;</button>
                        </div>
                        <span class="cart-item-price">RD$${itemSubtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
                <button class="cart-item-remove" data-index="${index}" aria-label="Eliminar item">
                    <i data-lucide="trash-2"></i>
                </button>
            `;
            cartItemsContainer.appendChild(cartItemEl);
        });

        if (cartCountBadge) cartCountBadge.textContent = totalQty;
        const drawerCount = document.getElementById('cart-drawer-count');
        if (drawerCount) drawerCount.textContent = totalQty;

        // Calculate shipping (free above 3500)
        const shipping = subtotal >= 3500 ? 0 : 200;
        const total = subtotal + shipping;

        document.getElementById('cart-subtotal').textContent = `RD$${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('cart-shipping').textContent = shipping === 0 ? 'Gratis' : `RD$${shipping.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('cart-total').textContent = `RD$${total.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        if (cartFooter) cartFooter.style.display = 'block';

        // Check settings and render PayPal if active
        checkCheckoutSettings();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function addToCart(product, size) {
        const existingIndex = cart.findIndex(item => item.id === product.id && item.size === size);
        
        if (existingIndex > -1) {
            cart[existingIndex].quantity += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                size: size,
                quantity: 1
            });
        }
        
        localStorage.setItem('kmizrd_cart', JSON.stringify(cart));
        updateCartUI();

        // Open cart drawer
        if (cartDrawer) {
            cartDrawer.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Modal Add-To-Cart / Personalize listener
    const modalAddCartBtn = document.querySelector('.modal-add-cart-btn');
    if (modalAddCartBtn) {
        modalAddCartBtn.addEventListener('click', () => {
            if (!currentModalProduct) return;
            
            // Get selected size
            const activeSizeBtn = document.querySelector('.size-badge-modal.active');
            const size = activeSizeBtn ? activeSizeBtn.textContent : 'Única';

            const catLower = (currentModalProduct.category || '').toLowerCase();
            const isColeccion = catLower === 'colección' || catLower === 'colecciones' || catLower === 'coleccion';

            if (!isColeccion) {
                // Open personalization modal
                const personalizationModal = document.getElementById('personalization-modal');
                if (personalizationModal) {
                    // Fill left product preview panel
                    const modalImg = document.getElementById('custom-modal-product-img');
                    const modalCat = document.getElementById('custom-modal-product-cat');
                    const modalName = document.getElementById('custom-modal-product-name');
                    const modalSize = document.getElementById('custom-modal-product-size');

                    if (modalImg) modalImg.src = currentModalProduct.image;
                    if (modalCat) modalCat.textContent = currentModalProduct.category;
                    if (modalName) modalName.textContent = currentModalProduct.name;
                    if (modalSize) modalSize.textContent = size !== 'Única' ? `Talla: ${size}` : '';

                    // Initialize preview overlay color
                    const activeColorBtn = customColorsContainer ? customColorsContainer.querySelector('.color-circle.active') : null;
                    const chosenColor = activeColorBtn ? activeColorBtn.getAttribute('data-color') : 'Negro';
                    updateOverlayColor(chosenColor);

                    // Pre-fill description
                    const descTextarea = document.getElementById('custom-desc');
                    if (descTextarea) descTextarea.value = '';

                    // Pre-load product image as reference (optional)
                    if (currentModalProduct.image) {
                        customBase64Image = currentModalProduct.image;
                        const previewImg = document.getElementById('custom-image-preview');
                        const previewCont = document.getElementById('custom-image-preview-container');
                        const dragIcon = customDragArea ? customDragArea.querySelector('.drag-icon') : null;
                        const dragText = customDragArea ? customDragArea.querySelector('.drag-text') : null;
                        if (previewImg) previewImg.src = currentModalProduct.image;
                        if (dragIcon) dragIcon.style.display = 'none';
                        if (dragText) dragText.style.display = 'none';
                        if (previewCont) previewCont.style.display = 'flex';
                    }

                    // Store product context for form submit
                    customCurrentProduct = currentModalProduct;
                    customCurrentSize = size;

                    // Close product detail modal, then open personalization modal
                    closeProductModal();
                    personalizationModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            } else {
                // Add item
                addToCart(currentModalProduct, size);

                // Close modal details
                closeProductModal();
            }
        });
    }

    // Header Cart click opens drawer
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            cartDrawer.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

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
                                items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, size: i.size, quantity: i.quantity })),
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
                        orderTextWithId += `- ${item.quantity}x ${item.name} (Talla: ${item.size}) - ${item.price}\n`;
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
                    items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, size: i.size, quantity: i.quantity })),
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
                    items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, size: i.size, quantity: i.quantity })),
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
            orderText += `- ${item.quantity}x ${item.name} (Talla: ${item.size}) - ${item.price}\n`;
        });
        orderText += `\nSubtotal: ${subtotalText}`;
        orderText += `\nEnvío: ${shippingText}`;
        orderText += `\nTotal: ${totalText}`;

        const encodedText = encodeURIComponent(orderText);
        window.open(`https://wa.me/18090000000?text=${encodedText}`, '_blank');
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
