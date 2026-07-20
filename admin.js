// Initialize Supabase Client
const supabaseUrl = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const supabaseKey = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('admin-login-overlay');
    const adminContainer = document.querySelector('.admin-container');
    const loginForm = document.getElementById('admin-login-form');
    const loginError = document.getElementById('login-error-msg');
    const logoutBtn = document.getElementById('admin-logout-btn');

    if (adminContainer) adminContainer.style.display = 'none';
    if (loginOverlay) loginOverlay.style.display = 'flex';

    let isPanelInitialized = false;

    async function checkAuth() {
        try {
            const { data: { session }, error } = await _supabase.auth.getSession();
            if (error) throw error;
            if (session) {
                if (loginOverlay) loginOverlay.style.display = 'none';
                if (adminContainer) adminContainer.style.display = 'flex';
                initializePanel();
            } else {
                if (loginOverlay) loginOverlay.style.display = 'flex';
                if (adminContainer) adminContainer.style.display = 'none';
            }
        } catch (err) {
            console.error('Error checking auth:', err);
            if (loginOverlay) loginOverlay.style.display = 'flex';
            if (adminContainer) adminContainer.style.display = 'none';
        }
    }

    // ---- AUTH MODE TOGGLE REMOVED ----
    // The admin panel now only supports login; registration is handled via the Users Management section.
    // authMode variable and toggle button have been removed.

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            if (loginError) loginError.style.display = 'none';

            
            const submitBtn = loginForm.querySelector('.login-submit-btn');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Verificando...';

            // Gather client info
            const clientDevice = navigator.userAgent || 'Unknown';
            let clientIp = '';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                clientIp = ipData.ip || '';
            } catch (e) {
                console.warn('Could not retrieve IP:', e);
            }

            try {
                const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (loginOverlay) loginOverlay.style.display = 'none';
                if (adminContainer) adminContainer.style.display = 'flex';
                // Log login attempt for admin approval
                await _supabase.from('admin_logins').insert({
                    email: email,
                    ip: clientIp,
                    device: clientDevice,
                    status: 'pending'
                });
                initializePanel();
            } catch (err) {
                console.error('Auth error:', err);
                if (loginError) {
                    loginError.textContent = err.message || 'Error en autenticación. Verifica tus datos.';
                    loginError.style.display = 'block';
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('¿Estás seguro de que quieres cerrar la sesión?')) {
                try {
                    await _supabase.auth.signOut();
                    window.location.reload();
                } catch (err) {
                    console.error('Error signing out:', err);
                }
            }
        });
    }

    checkAuth();

    function initializePanel() {
        if (isPanelInitialized) return;
        isPanelInitialized = true;

        // Navigation Tabs Toggle
        const navItems = document.querySelectorAll('.admin-nav-item[data-target]');
    const sections = document.querySelectorAll('.admin-content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');

            // Remove active classes
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            // Add active classes
            item.classList.add('active');
            document.getElementById(targetId).classList.add('active');
            
            // Update hash without scrolling
            history.pushState(null, null, `#${targetId}`);

            if (targetId === 'faq-section') {
                initFaqAdmin();
            }
        });
    });

    // Check hash on load to switch tab
    if (window.location.hash === '#manage-section') {
        const manageTab = document.querySelector('.admin-nav-item[data-target="manage-section"]');
        if (manageTab) {
            // Wait slightly for layout to settle
            setTimeout(() => {
                manageTab.click();
            }, 100);
        }
    } else if (window.location.hash === '#faq-section') {
        const faqTab = document.querySelector('.admin-nav-item[data-target="faq-section"]');
        if (faqTab) {
            setTimeout(() => {
                faqTab.click();
            }, 100);
        }
    }

    // Size Selector Toggle
    const sizeButtons = document.querySelectorAll('.size-btn');
    sizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
        });
    });

    // Image Upload and Drag & Drop
    const dragArea = document.getElementById('image-drag-area');
    const fileInput = document.getElementById('prod-image-file');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImage = document.getElementById('image-preview');
    const removePreviewBtn = document.getElementById('remove-preview-btn');
    let base64Image = '';

    // Click on drag area triggers file input
    dragArea.addEventListener('click', (e) => {
        // Prevent click if clicking the remove button
        if (e.target.closest('#remove-preview-btn')) return;
        fileInput.click();
    });

    // Drag over styling
    dragArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragArea.classList.add('dragover');
    });

    dragArea.addEventListener('dragleave', () => {
        dragArea.classList.remove('dragover');
    });

    dragArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dragArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            handleImageFile(file);
        }
    });

    removePreviewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetImageUpload();
    });

    function handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            base64Image = e.target.result;
            previewImage.src = base64Image;
            previewContainer.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    function resetImageUpload() {
        base64Image = '';
        previewImage.src = '';
        previewContainer.style.display = 'none';
        fileInput.value = '';
    }

    // Form Submission
    const productForm = document.getElementById('product-form');
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!base64Image) {
            alert('Por favor, selecciona una imagen para el producto.');
            return;
        }

        const name = document.getElementById('prod-name').value;
        const price = parseFloat(document.getElementById('prod-price').value).toFixed(2);
        const category = document.getElementById('prod-category').value;
        const desc = document.getElementById('prod-desc').value;

        // Get selected sizes
        const selectedSizes = [];
        document.querySelectorAll('.size-btn.active').forEach(btn => {
            selectedSizes.push(btn.getAttribute('data-size'));
        });

        // Save to Supabase
        try {
            const { data, error } = await _supabase
                .from('products')
                .insert([
                    {
                        name: name,
                        price: parseFloat(price),
                        category: category,
                        description: desc,
                        sizes: selectedSizes,
                        image: base64Image
                    }
                ]);

            if (error) throw error;

            alert('¡Producto publicado con éxito en la base de datos!');

            // Reset form and UI states
            productForm.reset();
            resetImageUpload();
            sizeButtons.forEach(btn => btn.classList.remove('active'));

            // Refresh inventory table
            renderInventory();

            // Switch tab to Manage Inventory
            const manageTab = document.querySelector('.admin-nav-item[data-target="manage-section"]');
            if (manageTab) {
                manageTab.click();
            }
        } catch (err) {
            alert('Error publicando el producto: ' + err.message);
            console.error(err);
        }
    });

    // Reset Form button
    const resetFormBtn = document.getElementById('btn-reset-form');
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', () => {
            resetImageUpload();
            sizeButtons.forEach(btn => btn.classList.remove('active'));
        });
    }

    // Render Inventory Table
    const tbody = document.getElementById('admin-products-tbody');
    const emptyState = document.getElementById('no-products-msg');
    const searchInput = document.getElementById('admin-search-input');

    async function renderInventory(searchQuery = '') {
        try {
            const { data, error } = await _supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            tbody.innerHTML = '';

            const filteredProducts = (data || []).filter(prod => 
                prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                prod.category.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filteredProducts.length === 0) {
                emptyState.style.display = 'flex';
                return;
            }

            emptyState.style.display = 'none';

            filteredProducts.forEach(prod => {
                const tr = document.createElement('tr');
                
                const sizesBadges = prod.sizes && prod.sizes.length > 0 
                    ? prod.sizes.map(s => `<span class="table-size-badge">${s}</span>`).join('')
                    : '<span class="table-size-badge">-</span>';

                const formattedPrice = prod.price.toString().startsWith('RD$') 
                    ? prod.price 
                    : `RD$${parseFloat(prod.price).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

                let rawImg = prod.image || '';
                if (rawImg.includes(',')) {
                    rawImg = rawImg.split(',')[0].trim();
                }
                const imgSrc = (rawImg && !rawImg.startsWith('data:') && !rawImg.startsWith('http')) 
                    ? `../${rawImg}` 
                    : rawImg;

                tr.innerHTML = `
                    <td><img src="${imgSrc}" alt="${prod.name}" class="table-img"></td>
                    <td>
                        <div class="table-prod-name">${prod.name}</div>
                        <div class="table-prod-desc">${prod.description}</div>
                    </td>
                    <td><span class="table-tag">${prod.category}</span></td>
                    <td><span class="table-price">${formattedPrice}</span></td>
                    <td><div class="table-sizes">${sizesBadges}</div></td>
                    <td>
                        <button class="btn-edit" data-id="${prod.id}" title="Editar Producto" style="background: #3b82f6; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; margin-right: 5px;">
                            <i data-lucide="edit-2"></i>
                        </button>
                        <button class="btn-delete" data-id="${prod.id}" title="Eliminar Producto">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                `;

                tbody.appendChild(tr);
            });

            // Re-initialize Lucide Icons for dynamic content
            lucide.createIcons();

            // Attach delete event listeners
            const deleteButtons = tbody.querySelectorAll('.btn-delete');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const prodId = btn.getAttribute('data-id');
                    deleteProduct(prodId);
                });
            });

            // Attach edit event listeners
            const editButtons = tbody.querySelectorAll('.btn-edit');
            editButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const prodId = btn.getAttribute('data-id');
                    const prod = filteredProducts.find(p => p.id == prodId);
                    if (prod) openEditModal(prod);
                });
            });
        } catch (err) {
            console.error('Error cargando inventario de Supabase:', err);
        }
    }

    // ==========================================
    // EDIT PRODUCT LOGIC
    // ==========================================
    const editModal = document.getElementById('edit-product-modal');
    const closeEditBtn = document.getElementById('close-edit-modal');
    const editForm = document.getElementById('edit-product-form');
    
    // Size selection for edit
    const editSizeButtons = document.querySelectorAll('.edit-size-btn');
    editSizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
        });
    });

    closeEditBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    function openEditModal(prod) {
        document.getElementById('edit-prod-id').value = prod.id;
        document.getElementById('edit-prod-name').value = prod.name;
        document.getElementById('edit-prod-price').value = prod.price;
        document.getElementById('edit-prod-desc').value = prod.description;
        
        const categorySelect = document.getElementById('edit-prod-category');
        if([...categorySelect.options].some(opt => opt.value === prod.category)) {
            categorySelect.value = prod.category;
        } else {
            categorySelect.value = 'COLECCIONES'; // Fallback
        }

        editSizeButtons.forEach(btn => {
            if (prod.sizes && prod.sizes.includes(btn.getAttribute('data-size'))) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        editModal.style.display = 'flex';
    }

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-prod-id').value;
        
        const activeSizes = [];
        editSizeButtons.forEach(btn => {
            if (btn.classList.contains('active')) activeSizes.push(btn.getAttribute('data-size'));
        });

        const updatedData = {
            name: document.getElementById('edit-prod-name').value,
            price: parseFloat(document.getElementById('edit-prod-price').value),
            category: document.getElementById('edit-prod-category').value,
            description: document.getElementById('edit-prod-desc').value,
            sizes: activeSizes
        };

        const submitBtn = editForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Guardando...';
        submitBtn.disabled = true;

        try {
            const { error } = await _supabase
                .from('products')
                .update(updatedData)
                .eq('id', id);

            if (error) throw error;
            
            editModal.style.display = 'none';
            renderInventory(searchInput.value);
            alert('Producto actualizado correctamente.');
        } catch (err) {
            alert('Error actualizando producto: ' + err.message);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    async function deleteProduct(id) {
        if (confirm('¿Estás seguro de que deseas eliminar este producto de la base de datos?')) {
            try {
                const { error } = await _supabase
                    .from('products')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                
                renderInventory(searchInput.value);
            } catch (err) {
                alert('Error eliminando el producto: ' + err.message);
            }
        }
    }

    // Search filter keyup
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderInventory(e.target.value);
        });
    }

    // ==========================================
    // AJUSTES DE PASARELA DE PAGO LOGIC
    // ==========================================
    const settingsForm = document.getElementById('payment-settings-form');

    async function loadSettings() {
        if (!settingsForm) return;
        try {
            const { data, error } = await _supabase
                .from('store_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Row doesn't exist, insert default row
                    await _supabase
                        .from('store_settings')
                        .insert([{ id: 1, whatsapp_active: true, whatsapp_number: '18090000000' }]);
                    return;
                }
                throw error;
            }

            if (data) {
                document.getElementById('setting-whatsapp-active').checked = data.whatsapp_active;
                document.getElementById('setting-whatsapp-number').value = data.whatsapp_number || '';
                document.getElementById('setting-paypal-active').checked = data.paypal_active;
                document.getElementById('setting-paypal-client-id').value = data.paypal_client_id || '';
                document.getElementById('setting-stripe-active').checked = data.stripe_active;
                document.getElementById('setting-stripe-pk').value = data.stripe_publishable_key || '';
                document.getElementById('setting-stripe-sk').value = data.stripe_secret_key || '';
                document.getElementById('setting-azul-active').checked = data.azul_active;
                document.getElementById('setting-azul-merchant-id').value = data.azul_merchant_id || '';
                document.getElementById('setting-azul-auth-key').value = data.azul_auth_key || '';
            }
        } catch (err) {
            console.error('Error cargando ajustes de pago:', err);
        }
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const whatsappActive = document.getElementById('setting-whatsapp-active').checked;
            const whatsappNumber = document.getElementById('setting-whatsapp-number').value;
            const paypalActive = document.getElementById('setting-paypal-active').checked;
            const paypalClientId = document.getElementById('setting-paypal-client-id').value;
            const stripeActive = document.getElementById('setting-stripe-active').checked;
            const stripePk = document.getElementById('setting-stripe-pk').value;
            const stripeSk = document.getElementById('setting-stripe-sk').value;
            const azulActive = document.getElementById('setting-azul-active').checked;
            const azulMerchantId = document.getElementById('setting-azul-merchant-id').value;
            const azulAuthKey = document.getElementById('setting-azul-auth-key').value;

            try {
                const { error } = await _supabase
                    .from('store_settings')
                    .upsert({
                        id: 1,
                        whatsapp_active: whatsappActive,
                        whatsapp_number: whatsappNumber,
                        paypal_active: paypalActive,
                        paypal_client_id: paypalClientId,
                        stripe_active: stripeActive,
                        stripe_publishable_key: stripePk,
                        stripe_secret_key: stripeSk,
                        azul_active: azulActive,
                        azul_merchant_id: azulMerchantId,
                        azul_auth_key: azulAuthKey,
                        updated_at: new Date().toISOString()
                    });

                if (error) throw error;
                alert('¡Ajustes de pago guardados con éxito!');
            } catch (err) {
                alert('Error al guardar ajustes: ' + err.message);
                console.error(err);
            }
        });

        // Load initial settings
        loadSettings();
    }

    // ==========================================
    // VENTAS Y RECIBOS LOGIC
    // ==========================================
    const ordersTbody = document.getElementById('admin-orders-tbody');
    const noOrdersMsg = document.getElementById('no-orders-msg');

    async function loadOrders() {
        if (!ordersTbody) return;
        try {
            const { data, error } = await _supabase
                .from('store_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // If table doesn't exist yet, just log and exit
                if (error.code === '42P01') {
                    if (noOrdersMsg) noOrdersMsg.style.display = 'block';
                    const table = document.querySelector('#orders-section .admin-table');
                    if (table) table.style.display = 'none';
                    return;
                }
                throw error;
            }

            ordersTbody.innerHTML = '';
            
            if (!data || data.length === 0) {
                if (noOrdersMsg) noOrdersMsg.style.display = 'block';
                const table = document.querySelector('#orders-section .admin-table');
                if (table) table.style.display = 'none';
                updateOrderMetrics([]);
                return;
            }

            if (noOrdersMsg) noOrdersMsg.style.display = 'none';
            const table = document.querySelector('#orders-section .admin-table');
            if (table) table.style.display = 'table';

            data.forEach(order => {
                const tr = document.createElement('tr');
                
                // Format items list
                const itemsList = (order.items || []).map(item => `${item.quantity}x ${item.name} (${item.size})`).join(', ');
                
                // Format payment method badge
                let methodHTML = '';
                if (order.payment_method === 'whatsapp') {
                    methodHTML = `<span class="badge" style="background-color: #25d366; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px;">WhatsApp</span>`;
                } else if (order.payment_method === 'paypal') {
                    methodHTML = `<span class="badge" style="background-color: #003087; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px;">PayPal</span>`;
                } else if (order.payment_method === 'stripe') {
                    methodHTML = `<span class="badge" style="background-color: #635bff; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px;">Stripe</span>`;
                } else if (order.payment_method === 'azul') {
                    methodHTML = `<span class="badge" style="background-color: #007bc1; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px;">Azul</span>`;
                } else {
                    methodHTML = `<span class="badge" style="background-color: #64748b; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${order.payment_method}</span>`;
                }

                // Format status badge
                let statusHTML = '';
                if (order.payment_status === 'approved') {
                    statusHTML = `<span class="status-badge" style="background-color: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 20px; font-size: 11px; font-weight: 700;">Aprobado</span>`;
                } else if (order.payment_status === 'pending') {
                    statusHTML = `<span class="status-badge" style="background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 20px; font-size: 11px; font-weight: 700;">Pendiente</span>`;
                } else {
                    statusHTML = `<span class="status-badge" style="background-color: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 20px; font-size: 11px; font-weight: 700;">Fallido</span>`;
                }

                // Format Date
                const date = new Date(order.created_at).toLocaleString('es-DO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                tr.innerHTML = `
                    <td style="font-weight: 700; font-family: monospace; font-size: 11px;">#${order.id.slice(0, 8)}</td>
                    <td>
                        <div style="font-weight: 700;">${order.customer_name}</div>
                        <div style="font-size: 11px; color: #64748b;">${order.customer_email || ''}</div>
                    </td>
                    <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itemsList}">${itemsList}</td>
                    <td style="font-weight: 800; color: var(--accent-color);">RD$${parseFloat(order.total).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    <td>${methodHTML}</td>
                    <td style="font-weight: 600; font-family: monospace; font-size: 12px; color: #475569;">${order.payment_reference || 'N/A'}</td>
                    <td>${statusHTML}</td>
                    <td style="font-size: 12px; color: #64748b;">${date}</td>
                `;
                ordersTbody.appendChild(tr);
            });

            updateOrderMetrics(data);

        } catch (err) {
            console.error('Error cargando ventas:', err);
        }
    }

    function updateOrderMetrics(orders) {
        let totalSales = 0;
        let approvedCount = 0;
        
        orders.forEach(order => {
            if (order.payment_status === 'approved') {
                totalSales += parseFloat(order.total) || 0;
                approvedCount++;
            }
        });

        const totalSalesEl = document.getElementById('metric-total-sales');
        const totalOrdersEl = document.getElementById('metric-total-orders');
        const approvedPaymentsEl = document.getElementById('metric-approved-payments');

        if (totalSalesEl) totalSalesEl.textContent = `RD$${totalSales.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (totalOrdersEl) totalOrdersEl.textContent = orders.length;
        if (approvedPaymentsEl) approvedPaymentsEl.textContent = approvedCount;
    }

    async function loadCustomRequests() {
        const customTbody = document.getElementById('admin-custom-requests-tbody');
        const emptyMsg = document.getElementById('no-custom-requests-msg');
        if (!customTbody) return;

        try {
            const { data: requests, error } = await _supabase
                .from('custom_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            customTbody.innerHTML = '';

            if (!requests || requests.length === 0) {
                emptyMsg.style.display = 'block';
                return;
            } else {
                emptyMsg.style.display = 'none';
            }

            requests.forEach(req => {
                const tr = document.createElement('tr');
                const date = new Date(req.created_at).toLocaleDateString('es-DO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // reference image rendering
                let imgHtml = '<span style="color:#94a3b8; font-size:12px;">Sin Imagen</span>';
                if (req.reference_image) {
                    imgHtml = `<img src="${req.reference_image}" alt="Ref" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px; border: 1px solid #cbd5e1; cursor: pointer;" onclick="window.open('${req.reference_image}', '_blank')">`;
                }

                // WhatsApp template link for admin
                const waMessage = `¡Hola ${req.customer_name}! Te escribimos de KMIZRD respecto a tu solicitud de personalización de un/a ${req.product_type} (${req.color}, talla ${req.size}). Queremos coordinar los detalles del diseño contigo.`;
                const cleanPhone = req.customer_phone.replace(/\D/g, '');
                const waUrl = `https://wa.me/${cleanPhone.startsWith('1') ? cleanPhone : '1' + cleanPhone}?text=${encodeURIComponent(waMessage)}`;

                tr.innerHTML = `
                    <td style="font-weight: 500; font-size: 13px;">${date}</td>
                    <td style="font-weight: 700; color: #0f172a;">${req.customer_name}</td>
                    <td>
                        <div style="font-weight:600;">${req.customer_phone}</div>
                        <div style="font-size:12px; color:#64748b;">${req.customer_email || 'Sin correo'}</div>
                    </td>
                    <td><span class="badge" style="background-color: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1;">${req.product_type}</span></td>
                    <td style="font-weight: 500;">${req.color}</td>
                    <td><span class="size-badge" style="display:inline-block; padding: 4px 8px; background:#0f172a; color:#fff; border-radius: 4px; font-weight:700; font-size:12px;">${req.size}</span></td>
                    <td style="font-size: 13px; max-width: 250px; word-break: break-word;">${req.description}</td>
                    <td>${imgHtml}</td>
                    <td>
                        <div style="display:flex; gap: 8px;">
                            <a href="${waUrl}" target="_blank" class="btn-action edit" title="Hablar por WhatsApp" style="background-color:#25d366; color:#fff; border:none; padding:8px 12px; border-radius:6px; display:inline-flex; align-items:center; gap:6px; text-decoration:none; font-size:12px; font-weight:700; transition: transform 0.2s;">
                                <i class="fab fa-whatsapp"></i> Contactar
                            </a>
                            <button class="btn-action delete" title="Eliminar Solicitud" data-id="${req.id}" style="background-color:#ef4444; color:#fff; border:none; padding:8px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; transition: transform 0.2s;">
                                <i class="fa fa-trash"></i> Borrar
                            </button>
                        </div>
                    </td>
                `;

                // Add delete handler
                const deleteBtn = tr.querySelector('.btn-action.delete');
                deleteBtn.addEventListener('click', async () => {
                    if (confirm('¿Estás seguro de que deseas eliminar esta solicitud de personalización?')) {
                        try {
                            const { error } = await _supabase
                                .from('custom_requests')
                                .delete()
                                .eq('id', req.id);
                            if (error) throw error;
                            alert('Solicitud eliminada.');
                            loadCustomRequests();
                        } catch (err) {
                            alert('Error al eliminar: ' + err.message);
                        }
                    }
                });

                customTbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error cargando solicitudes personalizadas:', err);
        }
    }

    // Initial renders
    renderInventory();
    loadOrders();
    loadCustomRequests();

    // ==========================================
    // USER MANAGEMENT LOGIC
    // ==========================================
    async function loadAdminUsers() {
        const tbody = document.getElementById('admin-users-tbody');
        const noUsersMsg = document.getElementById('no-users-msg');
        if (!tbody) return;

        try {
            const { data, error } = await _supabase
                .from('admin_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // Table might not exist yet
                if (error.code === '42P01') {
                    if (noUsersMsg) noUsersMsg.style.display = 'block';
                    return;
                }
                throw error;
            }

            tbody.innerHTML = '';

            if (!data || data.length === 0) {
                if (noUsersMsg) noUsersMsg.style.display = 'block';
                return;
            }

            if (noUsersMsg) noUsersMsg.style.display = 'none';

            // Get current session user to protect their own row
            const { data: { session } } = await _supabase.auth.getSession();
            const currentUserEmail = session?.user?.email || '';

            data.forEach(user => {
                const tr = document.createElement('tr');
                const createdDate = user.created_at 
                    ? new Date(user.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 'N/A';
                const lastLogin = user.last_login
                    ? new Date(user.last_login).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Nunca';
                const isCurrentUser = user.email === currentUserEmail;
                const statusBadge = isCurrentUser
                    ? `<span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">Tú (Activo)</span>`
                    : `<span style="background:#dbeafe;color:#1e40af;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">Admin</span>`;

                tr.innerHTML = `
                    <td style="font-weight:700;color:#0f172a;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:14px;flex-shrink:0;">
                                ${user.email.charAt(0).toUpperCase()}
                            </div>
                            ${user.email}
                        </div>
                    </td>
                    <td style="color:#64748b;font-size:13px;">${createdDate}</td>
                    <td style="color:#64748b;font-size:13px;">${lastLogin}</td>
                    <td>${statusBadge}</td>
                    <td>
                        ${isCurrentUser 
                            ? `<span style="font-size:12px;color:#94a3b8;font-style:italic;">Tu cuenta activa</span>`
                            : `<button class="btn-delete-user" data-id="${user.id}" data-email="${user.email}" 
                                style="background:#ef4444;color:#fff;border:none;padding:7px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;" title="Eliminar usuario">
                                <i class="fa fa-trash"></i> Eliminar
                               </button>`
                        }
                    </td>
                `;

                if (!isCurrentUser) {
                    const deleteBtn = tr.querySelector('.btn-delete-user');
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', async () => {
                            const email = deleteBtn.getAttribute('data-email');
                            if (confirm(`¿Estás seguro de que deseas eliminar el usuario "${email}"? Esta acción no se puede deshacer.`)) {
                                try {
                                    const { error: delError } = await _supabase
                                        .from('admin_users')
                                        .delete()
                                        .eq('id', user.id);
                                    if (delError) throw delError;
                                    alert(`Usuario "${email}" eliminado correctamente. Nota: Para revocar completamente el acceso, también debes eliminarlo desde el panel de Supabase Auth.`);
                                    loadAdminUsers();
                                } catch (err) {
                                    alert('Error al eliminar usuario: ' + err.message);
                                }
                            }
                        });
                    }
                }

                tbody.appendChild(tr);
            });

            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (err) {
            console.error('Error cargando usuarios admin:', err);
        }
    }

    // Create new admin user form
    const createUserForm = document.getElementById('create-user-form');
    const createUserMsg = document.getElementById('create-user-msg');
    if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('new-user-email').value.trim();
            const password = document.getElementById('new-user-password').value;

            if (password.length < 8) {
                if (createUserMsg) {
                    createUserMsg.textContent = 'La contraseña debe tener al menos 8 caracteres.';
                    createUserMsg.style.background = '#fee2e2';
                    createUserMsg.style.color = '#991b1b';
                    createUserMsg.style.display = 'block';
                }
                return;
            }

            const submitBtn = createUserForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creando...';
            if (createUserMsg) createUserMsg.style.display = 'none';

            try {
                // Create the user in Supabase Auth
                const { data: authData, error: authError } = await _supabase.auth.signUp({
                    email,
                    password
                });

                if (authError) throw authError;

                // Also register in our admin_users table for tracking
                await _supabase.from('admin_users').upsert({
                    email: email,
                    auth_uid: authData.user?.id || null,
                    created_at: new Date().toISOString()
                }, { onConflict: 'email' });

                if (createUserMsg) {
                    createUserMsg.textContent = `✅ Usuario "${email}" creado correctamente. Ya puede iniciar sesión en el panel.`;
                    createUserMsg.style.background = '#dcfce7';
                    createUserMsg.style.color = '#166534';
                    createUserMsg.style.display = 'block';
                }
                createUserForm.reset();
                loadAdminUsers();
            } catch (err) {
                if (createUserMsg) {
                    createUserMsg.textContent = '❌ Error: ' + (err.message || 'No se pudo crear el usuario.');
                    createUserMsg.style.background = '#fee2e2';
                    createUserMsg.style.color = '#991b1b';
                    createUserMsg.style.display = 'block';
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    // Refresh users button
    const refreshUsersBtn = document.getElementById('refresh-users-btn');
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener('click', () => loadAdminUsers());
    }

    // Load users when users-section tab is clicked
    document.querySelectorAll('.admin-nav-item[data-target="users-section"]').forEach(item => {
        item.addEventListener('click', () => {
            setTimeout(loadAdminUsers, 50);
        });
    });

    // Subscribe to real-time changes
    _supabase
        .channel('admin-db-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            (payload) => {
                console.log('Realtime products update detected in admin:', payload);
                renderInventory(searchInput ? searchInput.value : '');
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'store_orders' },
            (payload) => {
                console.log('Realtime orders update detected in admin:', payload);
                loadOrders();
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'custom_requests' },
            (payload) => {
                console.log('Realtime custom requests update detected in admin:', payload);
                loadCustomRequests();
            }
        )
        .subscribe();

        // Real-time admin login notifications
        _supabase
            .channel('admin-login-notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_logins' }, async (payload) => {
                const newLogin = payload.new;
                if (newLogin && newLogin.status === 'pending') {
                    const emailEl = document.getElementById('notif-email');
                    const ipEl = document.getElementById('notif-ip');
                    const deviceEl = document.getElementById('notif-device');
                    if (emailEl) emailEl.textContent = newLogin.email || '';
                    if (ipEl) ipEl.textContent = newLogin.ip || 'N/A';
                    if (deviceEl) deviceEl.textContent = newLogin.device || 'N/A';
                    const modal = document.getElementById('admin-login-notif-modal');
                    if (modal) modal.style.display = 'flex';
                    const approveBtn = document.getElementById('approve-login-btn');
                    const denyBtn = document.getElementById('deny-login-btn');
                    if (approveBtn) {
                        approveBtn.onclick = async () => {
                            await _supabase.from('admin_logins').update({ status: 'approved' }).eq('id', newLogin.id);
                            modal.style.display = 'none';
                        };
                    }
                    if (denyBtn) {
                        denyBtn.onclick = async () => {
                            await _supabase.from('admin_logins').update({ status: 'denied' }).eq('id', newLogin.id);
                            modal.style.display = 'none';
                        };
                    }
                }
            })
            .subscribe();
    }
});

// =============================================
// FAQ ADMIN MANAGEMENT
// =============================================

const DEFAULT_FAQS = [
    { question: '¿Cuánto tiempo tarda el envío?', answer: 'Los envíos se realizan en 3 a 5 días hábiles dentro de República Dominicana. Para pedidos fuera del país, el tiempo puede variar entre 7 y 15 días hábiles.' },
    { question: '¿Puedo personalizar mi prenda?', answer: 'Sí. Ofrecemos servicio de personalización con bordado o sublimación. Puedes solicitar tu prenda personalizada directamente desde la sección "Artículos Personalizados" o contactarnos por WhatsApp.' },
    { question: '¿Cuáles son las formas de pago?', answer: 'Aceptamos pagos con tarjeta de crédito/débito (Visa, Mastercard) a través de Stripe, así como transferencias bancarias y pagos por WhatsApp.' },
    { question: '¿Puedo cambiar o devolver un producto?', answer: 'Aceptamos cambios dentro de los 7 días posteriores a la recepción del pedido, siempre que el artículo esté en perfectas condiciones y sin uso. Contáctanos por WhatsApp para gestionar el cambio.' },
    { question: '¿Cómo sé cuál talla elegir?', answer: 'Todas nuestras prendas son de corte oversize. Si tienes dudas, te recomendamos elegir una talla menor a la que usas normalmente. También puedes escribirnos por WhatsApp y te asesoramos.' },
    { question: '¿Tienen tienda física?', answer: 'Por el momento operamos exclusivamente en línea. Puedes hacer tu pedido desde nuestra tienda web y lo recibirás en la puerta de tu casa.' }
];

async function initFaqAdmin() {
    const form = document.getElementById('faq-form');
    if (!form) return;

    await loadFaqAdmin();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('faq-edit-id').value;
        const question = document.getElementById('faq-question').value.trim();
        const answer = document.getElementById('faq-answer').value.trim();
        const msg = document.getElementById('faq-msg');

        if (!question || !answer) return;

        msg.textContent = 'Guardando...';
        msg.style.color = '#64748b';

        let error;
        if (id) {
            ({ error } = await _supabase.from('products').update({ name: question, description: answer }).eq('id', id));
        } else {
            // Get max order
            const { data: existing } = await _supabase.from('products').select('price').eq('category', 'FAQ').order('price', { ascending: false }).limit(1);
            const nextOrder = existing && existing.length > 0 ? (existing[0].price + 1) : 1;
            ({ error } = await _supabase.from('products').insert([{
                name: question,
                description: answer,
                price: nextOrder,
                category: 'FAQ',
                sizes: [],
                image: 'assets/logo.jpg'
            }]));
        }

        if (error) {
            msg.textContent = 'Error: ' + error.message;
            msg.style.color = '#ef4444';
        } else {
            msg.textContent = id ? '✅ Pregunta actualizada.' : '✅ Pregunta guardada.';
            msg.style.color = '#16a34a';
            resetFaqForm();
            await loadFaqAdmin();
            setTimeout(() => { msg.textContent = ''; }, 3000);
        }
    });

    document.getElementById('faq-cancel-btn').addEventListener('click', resetFaqForm);
}

function resetFaqForm() {
    document.getElementById('faq-edit-id').value = '';
    document.getElementById('faq-question').value = '';
    document.getElementById('faq-answer').value = '';
    document.getElementById('faq-save-btn').innerHTML = '<i class="fa fa-save"></i> Guardar Pregunta';
    document.getElementById('faq-cancel-btn').style.display = 'none';
}

async function loadFaqAdmin() {
    const list = document.getElementById('faq-admin-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="3" style="text-align: center; color:#94a3b8; padding: 20px;">Cargando...</td></tr>';

    const { data, error } = await _supabase.from('products').select('*').eq('category', 'FAQ').order('price', { ascending: true });
    if (error) {
        list.innerHTML = '<tr><td colspan="3" style="text-align: center; color:#ef4444; padding: 20px;">Error al cargar: ' + error.message + '</td></tr>';
        return;
    }

    // If empty, seed default FAQs
    if (!data || data.length === 0) {
        const rows = DEFAULT_FAQS.map((f, i) => ({
            name: f.question,
            description: f.answer,
            price: i + 1,
            category: 'FAQ',
            sizes: [],
            image: 'assets/logo.jpg'
        }));
        await _supabase.from('products').insert(rows);
        return loadFaqAdmin();
    }

    list.innerHTML = '';
    data.forEach(faq => {
        const tr = document.createElement('tr');
        // Ensure quotes around UUID strings to prevent JavaScript parse errors
        const escapedName = faq.name.replace(/`/g, '\\`').replace(/'/g, "\\'");
        const escapedDesc = faq.description.replace(/`/g, '\\`').replace(/'/g, "\\'");
        tr.innerHTML = `
            <td style="font-weight: 700; color: #0f172a; padding: 12px 15px; font-size: 13.5px; vertical-align: top;">${faq.name}</td>
            <td style="color: #475569; line-height: 1.5; padding: 12px 15px; font-size: 13.5px; vertical-align: top;">${faq.description}</td>
            <td style="text-align: center; padding: 12px 15px; vertical-align: top; white-space: nowrap;">
                <button onclick="editFaq('${faq.id}', \`${escapedName}\`, \`${escapedDesc}\`)" class="admin-btn btn-primary" style="padding: 6px 10px; font-size: 12px; font-weight: 700; margin-right: 4px;"><i class="fa fa-edit"></i></button>
                <button onclick="deleteFaq('${faq.id}')" class="admin-btn btn-secondary" style="padding: 6px 10px; font-size: 12px; font-weight: 700; background: #ef4444; color: #fff; border-color: #ef4444;"><i class="fa fa-trash"></i></button>
            </td>
        `;
        list.appendChild(tr);
    });
}

window.editFaq = function(id, question, answer) {
    document.getElementById('faq-edit-id').value = id;
    document.getElementById('faq-question').value = question;
    document.getElementById('faq-answer').value = answer;
    document.getElementById('faq-save-btn').innerHTML = '<i class="fa fa-save"></i> Actualizar Pregunta';
    document.getElementById('faq-cancel-btn').style.display = 'inline-flex';
    document.getElementById('faq-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteFaq = async function(id) {
    if (!confirm('¿Seguro que quieres eliminar esta pregunta?')) return;
    const { error } = await _supabase.from('products').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    await loadFaqAdmin();
};


