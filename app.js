// Estado de la aplicación
const state = {
    carrito: [],
    sedeSeleccionada: null,
    productoSeleccionado: null // Para el modal
};

// Utilidades
const formatMoney = (amount) => {
    return '$ ' + new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(amount);
};

// Elementos del DOM
const DOM = {
    ciudadSelect: document.getElementById('ciudad-select'),
    sedeSelect: document.getElementById('sede-select'),
    menuContainer: document.getElementById('menu-container'),
    cartSidebar: document.getElementById('cart-sidebar'),
    cartItemsContainer: document.getElementById('cart-items'),
    closeCartBtn: document.getElementById('close-cart-btn'),
    backdrop: document.getElementById('backdrop'),

    // Mobile floating cart
    mobileFloatingCart: document.getElementById('mobile-floating-cart'),
    floatingCartBadge: document.getElementById('floating-cart-badge'),
    floatingCartTotal: document.getElementById('floating-cart-total'),

    cartSubtotal: document.getElementById('cart-subtotal'),
    cartDomicilio: document.getElementById('cart-domicilio'),
    cartTotal: document.getElementById('cart-total'),
    checkoutBtn: document.getElementById('checkout-btn'),

    // Product Modal
    productModal: document.getElementById('product-modal'),
    closeProductModal: document.getElementById('close-product-modal'),
    productModalBody: document.getElementById('product-modal-body'),
    modalQtyMinus: document.getElementById('modal-qty-minus'),
    modalQtyPlus: document.getElementById('modal-qty-plus'),
    modalQty: document.getElementById('modal-qty'),
    modalTotalPrice: document.getElementById('modal-total-price'),
    addToCartBtn: document.getElementById('add-to-cart-btn'),

    // Checkout Modal
    checkoutModal: document.getElementById('checkout-modal'),
    closeCheckoutModal: document.getElementById('close-checkout-modal'),
    checkoutForm: document.getElementById('checkout-form'),
    tipoServicioRadios: document.getElementsByName('tipo_servicio'),
    direccionGroup: document.getElementById('direccion-group'),
    clienteDireccion: document.getElementById('cliente-direccion'),
    checkoutFinalTotal: document.getElementById('checkout-final-total'),

    // Welcome Modal
    welcomeModal: document.getElementById('welcome-modal'),
    welcomeCiudadSelect: document.getElementById('welcome-ciudad-select'),
    welcomeSedeSelect: document.getElementById('welcome-sede-select'),
    welcomeContinueBtn: document.getElementById('welcome-continue-btn')
};

// Funciones de integración con landing.html (localStorage)
function checkPreselectedSede() {
    const savedSedeRaw = localStorage.getItem('sedeSeleccionada');
    if (!savedSedeRaw) return;

    try {
        const savedSede = JSON.parse(savedSedeRaw);
        if (!savedSede || !savedSede.id) return;

        // Buscar a qué ciudad/grupo pertenece esta sede en data.js
        let ciudadIdx = -1;
        let foundSede = null;

        for (let i = 0; i < sedes.length; i++) {
            const grupo = sedes[i];
            const s = grupo.sedes.find(item => item.id === savedSede.id);
            if (s) {
                ciudadIdx = i;
                foundSede = s;
                break;
            }
        }

        if (ciudadIdx !== -1 && foundSede) {
            // Establecer estado
            state.sedeSeleccionada = {
                id: foundSede.id,
                telefono: foundSede.telefono,
                nombre: foundSede.nombre
            };

            // Sincronizar selectores del header
            DOM.ciudadSelect.value = ciudadIdx;

            // Llenar y habilitar el select de sedes
            const grupo = sedes[ciudadIdx];
            let sedeHtml = '<option value="" disabled selected>Sede</option>';
            grupo.sedes.forEach(s => {
                const selectedAttr = s.id === foundSede.id ? 'selected' : '';
                sedeHtml += `<option value="${s.id}" data-telefono="${s.telefono}" ${selectedAttr}>${s.nombre}</option>`;
            });
            DOM.sedeSelect.innerHTML = sedeHtml;
            DOM.sedeSelect.disabled = false;

            // Ocultar modal de bienvenida
            if (DOM.welcomeModal) {
                DOM.welcomeModal.classList.remove('active');
            }
        }
    } catch (e) {
        console.error('Error al cargar la sede preseleccionada:', e);
    }
}

function checkAutoAddProduct() {
    const productId = localStorage.getItem('autoAddProduct');
    if (!productId) return;

    // Solo abrir si ya se seleccionó una sede
    if (!state.sedeSeleccionada) return;

    localStorage.removeItem('autoAddProduct'); // Limpiar cola

    // Abrir el modal del producto
    setTimeout(() => {
        openProductModal(productId);
    }, 400);
}

// Inicialización
function init() {
    renderSedes();
    renderMenu();
    setupEventListeners();
    updateCartUI();
    initCarousel();
    checkPreselectedSede();
    checkAutoAddProduct();
}

// Lógica del Carrusel
function initCarousel() {
    let slideIndex = 0;
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    const container = document.querySelector('.carousel-container');

    if (slides.length === 0) return;

    let slideInterval;

    function showSlide(index) {
        slides.forEach(slide => slide.style.display = "none");
        dots.forEach(dot => dot.classList.remove("active"));

        if (index > slides.length - 1) slideIndex = 0;
        else if (index < 0) slideIndex = slides.length - 1;
        else slideIndex = index;

        slides[slideIndex].style.display = "block";
        dots[slideIndex].classList.add("active");
    }

    function nextSlide() {
        showSlide(slideIndex + 1);
    }

    function startAutoSlide() {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 3000); // Cambia imagen cada 3 segundos
    }

    // Inicializar
    showSlide(0);
    startAutoSlide();

    // Soporte para Swipe (deslizar) en móviles
    let touchStartX = 0;
    let touchEndX = 0;

    container.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        clearInterval(slideInterval); // pausar transición automática mientras se toca
    }, { passive: true });

    container.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
        startAutoSlide(); // reanudar transición
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50; // mínima distancia para considerarlo swipe
        if (touchEndX < touchStartX - swipeThreshold) {
            showSlide(slideIndex + 1); // deslizar a la izquierda (siguiente)
        }
        if (touchEndX > touchStartX + swipeThreshold) {
            showSlide(slideIndex - 1); // deslizar a la derecha (anterior)
        }
    }

    // Soporte para clicks en los puntitos
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            startAutoSlide();
        });
    });
}

function renderSedes() {
    let ciudadHtml = '<option value="" disabled selected>Ciudad</option>';
    let welcomeCiudadHtml = '<option value="" disabled selected>Selecciona tu ciudad</option>';

    if (sedes.length > 0 && sedes[0].ciudad) {
        sedes.forEach((grupo, idx) => {
            ciudadHtml += `<option value="${idx}">${grupo.ciudad}</option>`;
            welcomeCiudadHtml += `<option value="${idx}">${grupo.ciudad}</option>`;
        });
    }

    DOM.ciudadSelect.innerHTML = ciudadHtml;
    DOM.sedeSelect.innerHTML = '<option value="" disabled selected>Sede</option>';
    DOM.sedeSelect.disabled = true;

    if (DOM.welcomeCiudadSelect) {
        DOM.welcomeCiudadSelect.innerHTML = welcomeCiudadHtml;
        DOM.welcomeSedeSelect.innerHTML = '<option value="" disabled selected>Primero selecciona una ciudad</option>';
    }

    state.sedeSeleccionada = null;
}

function renderMenu() {
    let html = '';

    categorias.forEach(categoria => {
        const prods = productos.filter(p => p.categoria === categoria.id);
        if (prods.length > 0) {
            html += `
                <h2 class="category-title">${categoria.nombre}</h2>
                <div class="products-grid">
                    ${prods.map(p => `
                        <div class="product-card" onclick="openProductModal('${p.id}')">
                            <img src="${p.imagen}" alt="${p.nombre}" class="product-img">
                            <div class="product-info">
                                <h3 class="product-name">${p.nombre}</h3>
                                <p class="product-desc">${p.descripcion}</p>
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

    DOM.menuContainer.innerHTML = html;
}

// Modal de Producto
function openProductModal(productId) {
    const producto = productos.find(p => p.id === productId);
    if (!producto) return;

    state.productoSeleccionado = {
        ...producto,
        cantidad: 1,
        selecciones: {} // Para guardar opciones escogidas
    };

    let bodyHtml = `
        <img src="${producto.imagen}" class="product-modal-img">
        <div class="product-modal-details">
            <h2 class="product-modal-title">${producto.nombre}</h2>
            <p class="product-modal-desc">${producto.descripcion}</p>
    `;

    if (producto.personalizable && producto.opciones) {
        producto.opciones.forEach((grupo, groupIndex) => {
            bodyHtml += `
                <div class="option-group">
                    <div class="option-group-title">
                        ${grupo.nombre}
                        ${grupo.obligatorio ? '<span class="required-badge">Obligatorio</span>' : ''}
                    </div>
            `;

            grupo.items.forEach((item, itemIndex) => {
                const inputType = grupo.tipo; // 'radio' o 'checkbox'
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

    DOM.modalQty.innerText = "1";
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
    const producto = productos.find(p => p.id === state.productoSeleccionado.id);

    if (producto.personalizable && producto.opciones) {
        producto.opciones.forEach((grupo, groupIndex) => {
            const inputs = document.querySelectorAll(`input[name="group_${groupIndex}"]:checked`);
            inputs.forEach(input => {
                const itemIndex = input.value;
                const item = grupo.items[itemIndex];
                total += item.precio;
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

    const productoOriginal = productos.find(p => p.id === state.productoSeleccionado.id);
    let selecciones = [];
    let precioUnitario = productoOriginal.precio;

    if (productoOriginal.personalizable && productoOriginal.opciones) {
        productoOriginal.opciones.forEach((grupo, groupIndex) => {
            const inputs = document.querySelectorAll(`input[name="group_${groupIndex}"]`);

            // Para checkboxes de "Ingredientes Incluidos", ver qué se desmarcó (Sin X)
            if (grupo.tipo === 'checkbox' && grupo.nombre === 'Ingredientes Incluidos') {
                inputs.forEach(input => {
                    if (!input.checked) {
                        const item = grupo.items[input.value];
                        selecciones.push({ nombre: `Sin ${item.nombre}`, precio: 0 });
                    }
                });
            } else {
                // Para radios y checkboxes normales (Adiciones)
                inputs.forEach(input => {
                    if (input.checked) {
                        const item = grupo.items[input.value];
                        // Solo agregamos al nombre si tiene costo o si es radio (ej. Tipo de pan)
                        if (item.precio > 0 || grupo.tipo === 'radio') {
                            selecciones.push({ nombre: item.nombre, precio: item.precio });
                            precioUnitario += item.precio;
                        }
                    }
                });
            }
        });
    }

    const cartItem = {
        id: Date.now().toString(),
        productoId: productoOriginal.id,
        nombre: productoOriginal.nombre,
        imagen: productoOriginal.imagen,
        cantidad: parseInt(DOM.modalQty.innerText),
        precioUnitario: precioUnitario,
        selecciones: selecciones
    };

    state.carrito.push(cartItem);
    closeProductModal();
    updateCartUI();

    // Solo abrir el carrito automáticamente en computadoras, no en móviles
    if (window.innerWidth >= 1024) {
        openCart();
    }
}

// Carrito
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
                <img src="${item.imagen}" class="cart-item-img">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.cantidad}x ${item.nombre}</div>
                    ${item.selecciones.length > 0 ?
                `<div class="cart-item-options">
                            ${item.selecciones.map(opt => `+1 ${opt.nombre}`).join('<br>')}
                        </div>` : ''
            }
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
    const isDomicilio = document.querySelector('input[name="tipo_servicio"]:checked').value === 'Domicilio';

    const count = state.carrito.reduce((acc, item) => acc + item.cantidad, 0);
    if (DOM.floatingCartBadge) DOM.floatingCartBadge.innerText = count;

    const subtotal = state.carrito.reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);

    // Si el subtotal es de $100.000 o más, el domicilio es gratis
    const esGratis = subtotal >= 100000;
    const domicilio = isDomicilio && state.carrito.length > 0 && !esGratis ? configuraciones.domicilio : 0;

    const total = subtotal + domicilio;

    DOM.cartSubtotal.innerText = formatMoney(subtotal);

    // Mostrar "Gratis" en verde si aplica
    if (isDomicilio && state.carrito.length > 0 && esGratis) {
        DOM.cartDomicilio.innerText = "Gratis";
        DOM.cartDomicilio.style.color = "#22c55e"; // Verde llamativo
        DOM.cartDomicilio.style.fontWeight = "800";
    } else {
        DOM.cartDomicilio.innerText = formatMoney(domicilio);
        DOM.cartDomicilio.style.color = ""; // Color original
        DOM.cartDomicilio.style.fontWeight = "";
    }

    if (DOM.cartTotal) DOM.cartTotal.innerText = formatMoney(total);
    if (DOM.checkoutFinalTotal) DOM.checkoutFinalTotal.innerText = formatMoney(total);
    if (DOM.floatingCartTotal) DOM.floatingCartTotal.innerText = formatMoney(subtotal);

    return { subtotal, domicilio, total };
}

// Checkout
function openCheckout() {
    if (state.carrito.length === 0) return;
    closeCart();
    DOM.checkoutModal.classList.add('active');
    calculateTotals(); // update based on current radio selection
}

function closeCheckout() {
    DOM.checkoutModal.classList.remove('active');
}

// Emojis generados en memoria
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

// Generador de Mensaje WhatsApp
function generateWhatsAppMessage(datosCliente, totales) {
    const d = new Date();
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    const timeStr = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const orderId = `CO-${Math.floor(Math.random() * 10000000000)}`;

    let msg = `${E.wave} Vengo de https://tierraquerida.com\n`;
    msg += `${orderId}\n`;
    msg += `${E.calendar} ${dateStr} ${E.clock} ${timeStr}\n\n`;

    msg += `*Tipo de servicio: ${datosCliente.tipoServicio}*\n\n`;
    msg += `Nombre: ${datosCliente.nombre}\n`;
    msg += `Teléfono: ${datosCliente.telefono}\n`;
    if (datosCliente.tipoServicio === 'Domicilio') {
        msg += `Dirección: ${datosCliente.direccion}\n`;
    }
    msg += `\n*${E.memo} Productos*\n`;

    state.carrito.forEach(item => {
        msg += `*X${item.cantidad} ${E.circle} ${item.nombre} ${formatMoney(item.precioUnitario)}*\n`;
        msg += `    ${item.cantidad} Unidad(es) ${formatMoney(item.precioUnitario)}\n`;
        item.selecciones.forEach(opt => {
            msg += `    +1 ${opt.nombre}\n`;
        });
        msg += `\n`;
    });

    msg += `Subtotal: ${formatMoney(totales.subtotal)}\n`;
    if (datosCliente.tipoServicio === 'Domicilio') {
        msg += `Domicilio: ${totales.domicilio === 0 ? 'Gratis' : formatMoney(totales.domicilio)}\n`;
    }
    msg += `*Total: ${formatMoney(totales.total)}*\n\n`;

    msg += `*${E.dollar} Pago*\n`;
    msg += `Estado del pago: No pagado\n`;
    msg += `*Total a pagar: ${formatMoney(totales.total)}*\n`;
    msg += `Transferencia ${totales.total}\n`;

    if (datosCliente.metodoPago === 'Transferencia') {
        msg += `${E.money} *Transferencia bancaria:* Cuenta de\n`;
        msg += `Ahorros Bancolombia # 54940500012\n\n`;
    }

    msg += `${E.point} Envíanos este mensaje ahora. En cuanto lo recibamos estaremos atendiéndole.`;

    return encodeURIComponent(msg);
}

// Event Listeners
function setupEventListeners() {
    DOM.ciudadSelect.addEventListener('change', (e) => {
        const idx = e.target.value;
        const grupo = sedes[idx];
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

    // Welcome Modal Logic
    if (DOM.welcomeCiudadSelect) {
        DOM.welcomeCiudadSelect.addEventListener('change', (e) => {
            const idx = e.target.value;
            const grupo = sedes[idx];
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
            if (e.target.value) {
                DOM.welcomeContinueBtn.disabled = false;
            }
        });

        DOM.welcomeContinueBtn.addEventListener('click', () => {
            const ciudadIdx = DOM.welcomeCiudadSelect.value;
            DOM.ciudadSelect.value = ciudadIdx;

            const grupo = sedes[ciudadIdx];
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

            // Guardar en localStorage para recordar la sede
            localStorage.setItem('sedeSeleccionada', JSON.stringify(state.sedeSeleccionada));

            DOM.welcomeModal.classList.remove('active');

            // Si el usuario venía de seleccionar un producto, abrirlo ahora que ya tiene sede
            checkAutoAddProduct();
        });
    }

    if (DOM.mobileFloatingCart) {
        DOM.mobileFloatingCart.addEventListener('click', openCart);
    }
    DOM.closeCartBtn.addEventListener('click', closeCart);
    DOM.backdrop.addEventListener('click', () => {
        closeCart();
    });

    DOM.closeProductModal.addEventListener('click', closeProductModal);

    // Cerrar modal de producto al hacer clic fuera
    DOM.productModal.addEventListener('click', (e) => {
        if (e.target === DOM.productModal) {
            closeProductModal();
        }
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
            closeCheckout();
            if (window.innerWidth < 1024) {
                closeCart(); // Solo cerrar carrito con Esc en móviles, en desktop es fijo
            }
        }
    });

    DOM.modalQtyMinus.addEventListener('click', () => {
        let qty = parseInt(DOM.modalQty.innerText);
        if (qty > 1) {
            DOM.modalQty.innerText = qty - 1;
            calculateModalTotal();
        }
    });

    DOM.modalQtyPlus.addEventListener('click', () => {
        let qty = parseInt(DOM.modalQty.innerText);
        DOM.modalQty.innerText = qty + 1;
        calculateModalTotal();
    });

    DOM.addToCartBtn.addEventListener('click', addToCart);

    DOM.checkoutBtn.addEventListener('click', openCheckout);
    DOM.closeCheckoutModal.addEventListener('click', closeCheckout);

    // Cerrar modal de checkout al hacer clic fuera
    DOM.checkoutModal.addEventListener('click', (e) => {
        if (e.target === DOM.checkoutModal) {
            closeCheckout();
        }
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

        const tipoServicio = document.querySelector('input[name="tipo_servicio"]:checked').value;
        const nombre = document.getElementById('cliente-nombre').value;
        const telefono = document.getElementById('cliente-telefono').value;
        const direccion = document.getElementById('cliente-direccion').value;
        const metodoPago = document.getElementById('metodo-pago').value;

        const datosCliente = { tipoServicio, nombre, telefono, direccion, metodoPago };
        const totales = calculateTotals();

        const msgCodificado = generateWhatsAppMessage(datosCliente, totales);

        // Obtener teléfono de la sede seleccionada
        const telefonoSede = state.sedeSeleccionada.telefono;

        const url = `https://api.whatsapp.com/send?phone=${telefonoSede}&text=${msgCodificado}`;

        // Abrir WhatsApp en nueva pestaña
        window.open(url, '_blank');
    });
}

// Start app
init();
