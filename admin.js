// Initialize Supabase Client
const supabaseUrl = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const supabaseKey = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
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

                tr.innerHTML = `
                    <td><img src="${prod.image}" alt="${prod.name}" class="table-img"></td>
                    <td>
                        <div class="table-prod-name">${prod.name}</div>
                        <div class="table-prod-desc">${prod.description}</div>
                    </td>
                    <td><span class="table-tag">${prod.category}</span></td>
                    <td><span class="table-price">${formattedPrice}</span></td>
                    <td><div class="table-sizes">${sizesBadges}</div></td>
                    <td>
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
        } catch (err) {
            console.error('Error cargando inventario de Supabase:', err);
        }
    }

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
});
