// ============================================================
// APP.JS - Menú Digital Público (Multi-restaurante con Supabase)
// ============================================================

// Estado de la aplicación
const state = {
    carrito: [],
    sedeSeleccionada: null,
    productoSeleccionado: null,
    restaurante: null,
    categorias: [],
    productos: [],
    sedes: []
};

// Utilidades
const formatMoney = (amount) => {
    return '$ ' + new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(amount);
};

// Leer slug del restaurante desde la URL (?r=slug)
function getSlug() {
    const params = new URLSearchParams(window.location.search);
    return params.get('r');
}

// ============================================================
// CARGAR DATOS DESDE SUPABASE
// ============================================================
async function loadRestauranteData(slug) {
    // 1. Datos del restaurante
    const { data: restaurante, error: rError } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('slug', slug)
        .single();

    if (rError || !restaurante) {
        showNotFound(`No se encontró el restaurante "${slug}".`);
        return null;
    }

    // 2. Sedes, categorías y productos en paralelo
    const [
        { data: sedesData },
        { data: categoriasData },
        { data: productosData }
    ] = await Promise.all([
        supabase.from('sedes').select('*').eq('restaurante_id', restaurante.id).order('orden'),
        supabase.from('categorias').select('*').eq('restaurante_id', restaurante.id).order('orden'),
        supabase.from('productos').select('*').eq('restaurante_id', restaurante.id).eq('disponible', true).order('orden')
    ]);

    state.restaurante = restaurante;
    state.sedes = sedesData || [];
    state.categorias = categoriasData || [];
    state.productos = productosData || [];

    return restaurante;
}

function showNotFound(msg) {
    document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'Outfit',sans-serif;background:#0a0a0f;color:#fff;text-align:center;padding:24px;">
            <div>
                <div style="font-size:64px;margin-bottom:24px;">🍽️</div>
                <h1 style="font-size:24px;margin-bottom:12px;">Restaurante no encontrado</h1>
                <p style="color:#888;font-size:14px;">${msg}</p>
            </div>
        </div>
    `;
}

// Aplicar colores del restaurante como variables CSS
function applyTheme(restaurante) {
    const root = document.documentElement;
    if (restaurante.color_primario) root.style.setProperty('--color-primary', restaurante.color_primario);
    if (restaurante.color_secundario) root.style.setProperty('--color-secondary', restaurante.color_secundario);
}

// Agrupar sedes por ciudad (formato que espera la UI)
function buildSedesGrouped() {
    const grouped = {};
    state.sedes.forEach(sede => {
        if (!grouped[sede.ciudad]) grouped[sede.ciudad] = { ciudad: sede.ciudad, sedes: [] };
        grouped[sede.ciudad].sedes.push(sede);
    });
    return Object.values(grouped);
}

// ============================================================
// ELEMENTOS DEL DOM
// ============================================================
const DOM = {
    ciudadSelect: document.getElementById('ciudad-select'),
    sedeSelect: document.getElementById('sede-select'),
    menuContainer: document.getElementById('menu-container'),
    cartSidebar: document.getElementById('cart-sidebar'),
    cartItemsContainer: document.getElementById('cart-items'),
    closeCartBtn: document.getElementById('close-cart-btn'),
    backdrop: document.getElementById('backdrop'),

    mobileFloatingCart: document.getElementById('mobile-floating-cart'),
    floatingCartBadge: document.getElementById('floating-cart-badge'),
    floatingCartTotal: document.getElementById('floating-cart-total'),

    cartSubtotal: document.getElementById('cart-subtotal'),
    cartDomicilio: document.getElementById('cart-domicilio'),
    cartTotal: document.getElementById('cart-total'),
    checkoutBtn: document.getElementById('checkout-btn'),

    productModal: document.getElementById('product-modal'),
    closeProductModal: document.getElementById('close-product-modal'),
    productModalBody: document.getElementById('product-modal-body'),
    modalQtyMinus: document.getElementById('modal-qty-minus'),
    modalQtyPlus: document.getElementById('modal-qty-plus'),
    modalQty: document.getElementById('modal-qty'),
    modalTotalPrice: document.getElementById('modal-total-price'),
    addToCartBtn: document.getElementById('add-to-cart-btn'),

    checkoutModal: document.getElementById('checkout-modal'),
    closeCheckoutModal: document.getElementById('close-checkout-modal'),
    checkoutForm: document.getElementById('checkout-form'),
    tipoServicioRadios: document.getElementsByName('tipo_servicio'),
    direccionGroup: document.getElementById('direccion-group'),
    clienteDireccion: document.getElementById('cliente-direccion'),
    checkoutFinalTotal: document.getElementById('checkout-final-total'),

    welcomeModal: document.getElementById('welcome-modal'),
    welcomeCiudadSelect: document.getElementById('welcome-ciudad-select'),
    welcomeSedeSelect: document.getElementById('welcome-sede-select'),
    welcomeContinueBtn: document.getElementById('welcome-continue-btn')
};

// ============================================================
// INICIALIZACIÓN
// ============================================================
async function init() {
    const slug = getSlug();

    if (!slug) {
        // Sin slug → redirigir a página de selección
        window.location.href = 'restaurantes.html';
        return;
    }

    // Mostrar loading
    DOM.menuContainer.innerHTML = '<div style="text-align:center;padding:60px;color:#888"><div class="spinner-public"></div><p style="margin-top:16px">Cargando menú...</p></div>';

    const restaurante = await loadRestauranteData(slug);
    if (!restaurante) return;

    // Aplicar tema visual
    applyTheme(restaurante);

    // Actualizar título y meta
    document.title = `${restaurante.nombre} - Menú Online`;
    updateHeaderBranding(restaurante);

    // Inicializar UI
    renderSedes();
    renderMenu();
    setupEventListeners();
    updateCartUI();
    initCarousel(restaurante.banners || []);
    checkPreselectedSede();
    checkAutoAddProduct();
}

function updateHeaderBranding(restaurante) {
    // Logo
    const logoEl = document.querySelector('.logo');
    if (logoEl && restaurante.logo_url) {
        logoEl.src = restaurante.logo_url;
        logoEl.alt = restaurante.nombre + ' Logo';
    }
    // Footer
    const footerTagline = document.querySelector('.footer-tagline');
    if (footerTagline) footerTagline.textContent = restaurante.nombre;
    const footerCopy = document.querySelector('.footer-bottom p');
    if (footerCopy) footerCopy.textContent = `© ${new Date().getFullYear()} ${restaurante.nombre}. Todos los derechos reservados.`;

    // Redes sociales
    const redes = restaurante.redes || {};
    const igLink = document.querySelector('a[href*="instagram"]');
    if (igLink && redes.instagram) igLink.href = `https://www.instagram.com/${redes.instagram.replace('@', '')}`;
    const fbLink = document.querySelector('a[href*="facebook"]');
    if (fbLink && redes.facebook) fbLink.href = `https://www.facebook.com/${redes.facebook.replace('@', '')}`;
    const ttLink = document.querySelector('a[href*="tiktok"]');
    if (ttLink && redes.tiktok) ttLink.href = `https://www.tiktok.com/${redes.tiktok.startsWith('@') ? redes.tiktok : '@' + redes.tiktok}`;

    // Welcome modal
    const welcomeTitle = document.querySelector('#welcome-modal h2');
    if (welcomeTitle) welcomeTitle.textContent = `¡Bienvenido a ${restaurante.nombre}!`;
}

// ============================================================
// CARRUSEL
// ============================================================
function initCarousel(banners) {
    const container = document.querySelector('.carousel-container');
    if (!container) return;

    if (!banners || banners.length === 0) {
        container.style.display = 'none';
        return;
    }

    // Renderizar slides dinámicamente
    container.innerHTML = banners.map((url, i) => `
        <div class="carousel-slide fade" ${i > 0 ? 'style="display:none"' : ''}>
            <img src="${url}" alt="Banner ${i+1}">
        </div>
    `).join('') + `
        <div class="carousel-dots">
            ${banners.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
        </div>
    `;

    let slideIndex = 0;
    const slides = container.querySelectorAll('.carousel-slide');
    const dots = container.querySelectorAll('.dot');
    let slideInterval;

    function showSlide(index) {
        slides.forEach(s => s.style.display = 'none');
        dots.forEach(d => d.classList.remove('active'));
        if (index >= slides.length) slideIndex = 0;
        else if (index < 0) slideIndex = slides.length - 1;
        else slideIndex = index;
        slides[slideIndex].style.display = 'block';
        dots[slideIndex].classList.add('active');
    }

    function startAutoSlide() {
        clearInterval(slideInterval);
        slideInterval = setInterval(() => showSlide(slideIndex + 1), 3000);
    }

    showSlide(0);
    startAutoSlide();

    let touchStartX = 0;
    container.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; clearInterval(slideInterval); }, { passive: true });
    container.addEventListener('touchend', e => {
        const diff = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(diff) > 50) showSlide(slideIndex + (diff < 0 ? 1 : -1));
        startAutoSlide();
    }, { passive: true });

    dots.forEach((dot, i) => dot.addEventListener('click', () => { showSlide(i); startAutoSlide(); }));
}

// ============================================================
// RENDER SEDES (desde state.sedes)
// ============================================================
function renderSedes() {
    const sedesGrouped = buildSedesGrouped();

    let ciudadHtml = '<option value="" disabled selected>Ciudad</option>';
    let welcomeCiudadHtml = '<option value="" disabled selected>Selecciona tu ciudad</option>';

    sedesGrouped.forEach((grupo, idx) => {
        ciudadHtml += `<option value="${idx}">${grupo.ciudad}</option>`;
        welcomeCiudadHtml += `<option value="${idx}">${grupo.ciudad}</option>`;
    });

    DOM.ciudadSelect.innerHTML = ciudadHtml;
    DOM.sedeSelect.innerHTML = '<option value="" disabled selected>Sede</option>';
    DOM.sedeSelect.disabled = true;

    if (DOM.welcomeCiudadSelect) {
        DOM.welcomeCiudadSelect.innerHTML = welcomeCiudadHtml;
        DOM.welcomeSedeSelect.innerHTML = '<option value="" disabled selected>Primero selecciona una ciudad</option>';
    }

    state.sedeSeleccionada = null;
    // Guardar grupos para uso posterior
    state.sedesGrouped = sedesGrouped;
}

// ============================================================
// RENDER MENÚ
// ============================================================
function renderMenu() {
    let html = '';

    state.categorias.forEach(categoria => {
        const prods = state.productos.filter(p => p.categoria_id === categoria.id);
        if (prods.length > 0) {
            html += `
                <h2 class="category-title">${categoria.nombre}</h2>
                <div class="products-grid">
                    ${prods.map(p => `
                        <div class="product-card" onclick="openProductModal('${p.id}')">
                            <img src="${p.imagen_url || 'https://placehold.co/300x200/1c1c28/888?text=Producto'}" alt="${p.nombre}" class="product-img">
                            <div class="product-info">
                                <h3 class="product-name">${p.nombre}</h3>
                                <p class="product-desc">${p.descripcion || ''}</p>
                                <div class="product-footer">
                                    <span class="product-price">${formatMoney(p.precio)}</span>
                                    <button class="add-btn"><i class="fa-solid fa-plus"></i></button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    });

    // Productos sin categoría
    const sinCategoria = state.productos.filter(p => !p.categoria_id);
    if (sinCategoria.length > 0) {
        html += `
            <h2 class="category-title">Otros</h2>
            <div class="products-grid">
                ${sinCategoria.map(p => `
                    <div class="product-card" onclick="openProductModal('${p.id}')">
                        <img src="${p.imagen_url || 'https://placehold.co/300x200/1c1c28/888?text=Producto'}" alt="${p.nombre}" class="product-img">
                        <div class="product-info">
                            <h3 class="product-name">${p.nombre}</h3>
                            <p class="product-desc">${p.descripcion || ''}</p>
                            <div class="product-footer">
                                <span class="product-price">${formatMoney(p.precio)}</span>
                                <button class="add-btn"><i class="fa-solid fa-plus"></i></button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    DOM.menuContainer.innerHTML = html || '<div style="text-align:center;padding:60px;color:#888">No hay productos disponibles aún.</div>';
}

// ============================================================
// MODAL DE PRODUCTO
// ============================================================
function openProductModal(productId) {
    const producto = state.productos.find(p => p.id === productId);
    if (!producto) return;

    state.productoSeleccionado = { ...producto, cantidad: 1, selecciones: {} };

    let bodyHtml = `
        <img src="${producto.imagen_url || 'https://placehold.co/600x300/1c1c28/888?text=Producto'}" class="product-modal-img">
        <div class="product-modal-details">
            <h2 class="product-modal-title">${producto.nombre}</h2>
            <p class="product-modal-desc">${producto.descripcion || ''}</p>
    `;

    const opciones = producto.opciones || [];
    if (producto.personalizable && opciones.length > 0) {
        opciones.forEach((grupo, groupIndex) => {
            bodyHtml += `
                <div class="option-group">
                    <div class="option-group-title">
                        ${grupo.nombre}
                        ${grupo.obligatorio ? '<span class="required-badge">Obligatorio</span>' : ''}
                    </div>
            `;
            (grupo.items || []).forEach((item, itemIndex) => {
                const inputType = grupo.tipo || 'radio';
                const inputName = `group_${groupIndex}`;
                const inputId = `opt_${groupIndex}_${itemIndex}`;
                const checked = item.seleccionado ? 'checked' : '';
                bodyHtml += `
                    <div class="option-item">
                        <label class="option-label" for="${inputId}">
                            <input type="${inputType}" name="${inputName}" id="${inputId}"
                                value="${itemIndex}" data-group="${groupIndex}" ${checked}
                                onchange="calculateModalTotal()">
                            ${item.nombre}
                        </label>
                        ${item.precio > 0 ? `<span class="option-price">+${formatMoney(item.precio)}</span>` : ''}
                    </div>
                `;
            });
            bodyHtml += `</div>`;
        });
    }

    bodyHtml += `</div>`;
    DOM.productModalBody.innerHTML = bodyHtml;
    DOM.modalQty.innerText = '1';
    calculateModalTotal();
    DOM.productModal.classList.add('active');
}

function closeProductModal() {
    DOM.productModal.classList.remove('active');
    state.productoSeleccionado = null;
}

function calculateModalTotal() {
    if (!state.productoSeleccionado) return;
    let total = state.productoSeleccionado.precio;
    const producto = state.productos.find(p => p.id === state.productoSeleccionado.id);
    const opciones = (producto && producto.opciones) || [];

    if (producto && producto.personalizable && opciones.length > 0) {
        opciones.forEach((grupo, groupIndex) => {
            const inputs = document.querySelectorAll(`input[name="group_${groupIndex}"]:checked`);
            inputs.forEach(input => {
                const item = grupo.items[input.value];
                if (item) total += item.precio || 0;
            });
        });
    }

    const cantidad = parseInt(DOM.modalQty.innerText);
    total *= cantidad;
    DOM.modalTotalPrice.innerText = formatMoney(total);
    return total;
}

function addToCart() {
    if (!state.productoSeleccionado) return;
    const productoOriginal = state.productos.find(p => p.id === state.productoSeleccionado.id);
    let selecciones = [];
    let precioUnitario = productoOriginal.precio;
    const opciones = (productoOriginal && productoOriginal.opciones) || [];

    if (productoOriginal.personalizable && opciones.length > 0) {
        opciones.forEach((grupo, groupIndex) => {
            const inputs = document.querySelectorAll(`input[name="group_${groupIndex}"]`);
            if (grupo.tipo === 'checkbox' && grupo.nombre === 'Ingredientes Incluidos') {
                inputs.forEach(input => {
                    if (!input.checked) {
                        const item = grupo.items[input.value];
                        selecciones.push({ nombre: `Sin ${item.nombre}`, precio: 0 });
                    }
                });
            } else {
                inputs.forEach(input => {
                    if (input.checked) {
                        const item = grupo.items[input.value];
                        if (item.precio > 0 || grupo.tipo === 'radio') {
                            selecciones.push({ nombre: item.nombre, precio: item.precio || 0 });
                            precioUnitario += item.precio || 0;
                        }
                    }
                });
            }
        });
    }

    state.carrito.push({
        id: Date.now().toString(),
        productoId: productoOriginal.id,
        nombre: productoOriginal.nombre,
        imagen: productoOriginal.imagen_url || '',
        cantidad: parseInt(DOM.modalQty.innerText),
        precioUnitario,
        selecciones
    });

    closeProductModal();
    updateCartUI();
    if (window.innerWidth >= 1024) openCart();
}

// ============================================================
// CARRITO
// ============================================================
function openCart() {
    DOM.cartSidebar.classList.add('active');
    DOM.backdrop.classList.add('active');
}

function closeCart() {
    DOM.cartSidebar.classList.remove('active');
    DOM.backdrop.classList.remove('active');
}

function updateCartUI() {
    if (state.carrito.length === 0) {
        DOM.cartItemsContainer.innerHTML = '<div class="empty-cart-message">Tu carrito está vacío 🍔</div>';
        DOM.checkoutBtn.disabled = true;
    } else {
        DOM.cartItemsContainer.innerHTML = state.carrito.map(item => `
            <div class="cart-item">
                <img src="${item.imagen || 'https://placehold.co/52x52/1c1c28/888?text=📦'}" class="cart-item-img">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.cantidad}x ${item.nombre}</div>
                    ${item.selecciones.length > 0 ? `<div class="cart-item-options">${item.selecciones.map(opt => `+1 ${opt.nombre}`).join('<br>')}</div>` : ''}
                    <div class="cart-item-bottom">
                        <span class="cart-item-price">${formatMoney(item.precioUnitario * item.cantidad)}</span>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('');
        DOM.checkoutBtn.disabled = false;
    }
    calculateTotals();
}

function removeFromCart(id) {
    state.carrito = state.carrito.filter(item => item.id !== id);
    updateCartUI();
}

function calculateTotals() {
    const tipoServicioInput = document.querySelector('input[name="tipo_servicio"]:checked');
    const isDomicilio = tipoServicioInput ? tipoServicioInput.value === 'Domicilio' : true;
    const costoDomicilio = (state.restaurante && state.restaurante.domicilio) || 5000;

    const count = state.carrito.reduce((acc, item) => acc + item.cantidad, 0);
    if (DOM.floatingCartBadge) DOM.floatingCartBadge.innerText = count;

    const subtotal = state.carrito.reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
    const esGratis = subtotal >= 100000;
    const domicilio = isDomicilio && state.carrito.length > 0 && !esGratis ? costoDomicilio : 0;
    const total = subtotal + domicilio;

    DOM.cartSubtotal.innerText = formatMoney(subtotal);
    if (isDomicilio && state.carrito.length > 0 && esGratis) {
        DOM.cartDomicilio.innerText = 'Gratis';
        DOM.cartDomicilio.style.color = '#22c55e';
        DOM.cartDomicilio.style.fontWeight = '800';
    } else {
        DOM.cartDomicilio.innerText = formatMoney(domicilio);
        DOM.cartDomicilio.style.color = '';
        DOM.cartDomicilio.style.fontWeight = '';
    }
    if (DOM.cartTotal) DOM.cartTotal.innerText = formatMoney(total);
    if (DOM.checkoutFinalTotal) DOM.checkoutFinalTotal.innerText = formatMoney(total);
    if (DOM.floatingCartTotal) DOM.floatingCartTotal.innerText = formatMoney(subtotal);

    return { subtotal, domicilio, total };
}

// ============================================================
// CHECKOUT
// ============================================================
function openCheckout() {
    if (state.carrito.length === 0) return;
    closeCart();
    DOM.checkoutModal.classList.add('active');
    calculateTotals();
}

function closeCheckout() {
    DOM.checkoutModal.classList.remove('active');
}

// ============================================================
// WHATSAPP
// ============================================================
var E = {
    wave:     String.fromCodePoint(0x1F44B),
    calendar: String.fromCodePoint(0x1F5D3, 0xFE0F),
    clock:    String.fromCodePoint(0x23F0),
    memo:     String.fromCodePoint(0x1F4DD),
    circle:   String.fromCodePoint(0x1F7E1),
    dollar:   String.fromCodePoint(0x1F4B2),
    money:    String.fromCodePoint(0x1F4B0),
    point:    String.fromCodePoint(0x1F446)
};

function generateWhatsAppMessage(datosCliente, totales) {
    const d = new Date();
    const dateStr = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
    const timeStr = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const orderId = `CO-${Math.floor(Math.random() * 10000000000)}`;
    const sitio = (state.restaurante && state.restaurante.sitio_web) || window.location.hostname;

    let msg = `${E.wave} Vengo de ${sitio}\n${orderId}\n${E.calendar} ${dateStr} ${E.clock} ${timeStr}\n\n`;
    msg += `*Tipo de servicio: ${datosCliente.tipoServicio}*\n\n`;
    msg += `Nombre: ${datosCliente.nombre}\nTeléfono: ${datosCliente.telefono}\n`;
    if (datosCliente.tipoServicio === 'Domicilio') msg += `Dirección: ${datosCliente.direccion}\n`;
    msg += `\n*${E.memo} Productos*\n`;

    state.carrito.forEach(item => {
        msg += `*X${item.cantidad} ${E.circle} ${item.nombre} ${formatMoney(item.precioUnitario)}*\n`;
        msg += `    ${item.cantidad} Unidad(es) ${formatMoney(item.precioUnitario)}\n`;
        item.selecciones.forEach(opt => { msg += `    +1 ${opt.nombre}\n`; });
        msg += '\n';
    });

    msg += `Subtotal: ${formatMoney(totales.subtotal)}\n`;
    if (datosCliente.tipoServicio === 'Domicilio') msg += `Domicilio: ${totales.domicilio === 0 ? 'Gratis' : formatMoney(totales.domicilio)}\n`;
    msg += `*Total: ${formatMoney(totales.total)}*\n\n`;
    msg += `*${E.dollar} Pago*\nEstado del pago: No pagado\n*Total a pagar: ${formatMoney(totales.total)}*\n`;

    if (datosCliente.metodoPago === 'Transferencia') {
        msg += `${E.money} *Transferencia bancaria*\n`;
    }
    msg += `\n${E.point} Envíanos este mensaje ahora.`;
    return encodeURIComponent(msg);
}

// ============================================================
// INTEGRACIÓN CON WELCOME MODAL
// ============================================================
function checkPreselectedSede() {
    const savedSedeRaw = localStorage.getItem('sedeSeleccionada_' + getSlug());
    if (!savedSedeRaw) return;
    try {
        const savedSede = JSON.parse(savedSedeRaw);
        if (!savedSede || !savedSede.id) return;
        const sedesGrouped = state.sedesGrouped || [];
        let ciudadIdx = -1, foundSede = null;
        for (let i = 0; i < sedesGrouped.length; i++) {
            const s = sedesGrouped[i].sedes.find(item => item.id === savedSede.id);
            if (s) { ciudadIdx = i; foundSede = s; break; }
        }
        if (ciudadIdx !== -1 && foundSede) {
            state.sedeSeleccionada = { id: foundSede.id, telefono: foundSede.telefono, nombre: foundSede.nombre };
            DOM.ciudadSelect.value = ciudadIdx;
            const grupo = sedesGrouped[ciudadIdx];
            let sedeHtml = '<option value="" disabled selected>Sede</option>';
            grupo.sedes.forEach(s => {
                sedeHtml += `<option value="${s.id}" data-telefono="${s.telefono}" ${s.id === foundSede.id ? 'selected' : ''}>${s.nombre}</option>`;
            });
            DOM.sedeSelect.innerHTML = sedeHtml;
            DOM.sedeSelect.disabled = false;
            if (DOM.welcomeModal) DOM.welcomeModal.classList.remove('active');
        }
    } catch(e) { console.error(e); }
}

function checkAutoAddProduct() {
    const productId = localStorage.getItem('autoAddProduct');
    if (!productId || !state.sedeSeleccionada) return;
    localStorage.removeItem('autoAddProduct');
    setTimeout(() => openProductModal(productId), 400);
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners() {
    const sedesGrouped = state.sedesGrouped || [];

    DOM.ciudadSelect.addEventListener('change', (e) => {
        const idx = e.target.value;
        const grupo = sedesGrouped[idx];
        let sedeHtml = '<option value="" disabled selected>Sede</option>';
        if (grupo && grupo.sedes) {
            grupo.sedes.forEach(s => {
                sedeHtml += `<option value="${s.id}" data-telefono="${s.telefono}">${s.nombre}</option>`;
            });
            DOM.sedeSelect.innerHTML = sedeHtml;
            DOM.sedeSelect.disabled = false;
        } else {
            DOM.sedeSelect.innerHTML = sedeHtml;
            DOM.sedeSelect.disabled = true;
        }
        state.sedeSeleccionada = null;
    });

    DOM.sedeSelect.addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        state.sedeSeleccionada = { id: e.target.value, telefono: option.dataset.telefono, nombre: option.innerText };
    });

    if (DOM.welcomeCiudadSelect) {
        DOM.welcomeCiudadSelect.addEventListener('change', (e) => {
            const idx = e.target.value;
            const grupo = sedesGrouped[idx];
            let sedeHtml = '<option value="" disabled selected>Selecciona tu sede</option>';
            if (grupo && grupo.sedes) {
                grupo.sedes.forEach(s => {
                    sedeHtml += `<option value="${s.id}" data-telefono="${s.telefono}">${s.nombre}</option>`;
                });
                DOM.welcomeSedeSelect.innerHTML = sedeHtml;
                DOM.welcomeSedeSelect.disabled = false;
            }
            DOM.welcomeContinueBtn.disabled = true;
        });

        DOM.welcomeSedeSelect.addEventListener('change', (e) => {
            if (e.target.value) DOM.welcomeContinueBtn.disabled = false;
        });

        DOM.welcomeContinueBtn.addEventListener('click', () => {
            const ciudadIdx = DOM.welcomeCiudadSelect.value;
            DOM.ciudadSelect.value = ciudadIdx;
            const grupo = sedesGrouped[ciudadIdx];
            let sedeHtml = '<option value="" disabled selected>Sede</option>';
            if (grupo && grupo.sedes) {
                grupo.sedes.forEach(s => {
                    sedeHtml += `<option value="${s.id}" data-telefono="${s.telefono}">${s.nombre}</option>`;
                });
                DOM.sedeSelect.innerHTML = sedeHtml;
                DOM.sedeSelect.disabled = false;
            }
            DOM.sedeSelect.value = DOM.welcomeSedeSelect.value;
            const option = DOM.welcomeSedeSelect.options[DOM.welcomeSedeSelect.selectedIndex];
            state.sedeSeleccionada = { id: option.value, telefono: option.dataset.telefono, nombre: option.innerText };
            localStorage.setItem('sedeSeleccionada_' + getSlug(), JSON.stringify(state.sedeSeleccionada));
            DOM.welcomeModal.classList.remove('active');
            checkAutoAddProduct();
        });
    }

    if (DOM.mobileFloatingCart) DOM.mobileFloatingCart.addEventListener('click', openCart);
    DOM.closeCartBtn.addEventListener('click', closeCart);
    DOM.backdrop.addEventListener('click', closeCart);
    DOM.closeProductModal.addEventListener('click', closeProductModal);

    DOM.productModal.addEventListener('click', (e) => {
        if (e.target === DOM.productModal) closeProductModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
            closeCheckout();
            if (window.innerWidth < 1024) closeCart();
        }
    });

    DOM.modalQtyMinus.addEventListener('click', () => {
        let qty = parseInt(DOM.modalQty.innerText);
        if (qty > 1) { DOM.modalQty.innerText = qty - 1; calculateModalTotal(); }
    });
    DOM.modalQtyPlus.addEventListener('click', () => {
        DOM.modalQty.innerText = parseInt(DOM.modalQty.innerText) + 1;
        calculateModalTotal();
    });

    DOM.addToCartBtn.addEventListener('click', addToCart);
    DOM.checkoutBtn.addEventListener('click', openCheckout);
    DOM.closeCheckoutModal.addEventListener('click', closeCheckout);

    DOM.checkoutModal.addEventListener('click', (e) => {
        if (e.target === DOM.checkoutModal) closeCheckout();
    });

    DOM.tipoServicioRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'Domicilio') {
                DOM.direccionGroup.style.display = 'block';
                DOM.clienteDireccion.required = true;
            } else {
                DOM.direccionGroup.style.display = 'none';
                DOM.clienteDireccion.required = false;
            }
            calculateTotals();
        });
    });

    DOM.checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!state.sedeSeleccionada) {
            alert('Por favor selecciona una sede antes de continuar.');
            return;
        }
        const tipoServicio = document.querySelector('input[name="tipo_servicio"]:checked').value;
        const nombre = document.getElementById('cliente-nombre').value;
        const telefono = document.getElementById('cliente-telefono').value;
        const direccion = document.getElementById('cliente-direccion').value;
        const metodoPago = document.getElementById('metodo-pago').value;
        const datosCliente = { tipoServicio, nombre, telefono, direccion, metodoPago };
        const totales = calculateTotals();
        const msgCodificado = generateWhatsAppMessage(datosCliente, totales);
        window.open(`https://api.whatsapp.com/send?phone=${state.sedeSeleccionada.telefono}&text=${msgCodificado}`, '_blank');
    });
}

// Start
init();
