// ============================================================
// DASHBOARD.JS - Lógica completa del panel de administración
// ============================================================

// Estado global del dashboard
const DB = {
    restaurante: null,
    categorias: [],
    productos: [],
    sedes: []
};

// ============================================================
// INICIALIZACIÓN
// ============================================================
async function init() {
    // Verificar sesión
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Cargar datos del restaurante del usuario
    const { data: restaurante, error } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

    if (error || !restaurante) {
        showToast('Error al cargar el restaurante', 'error');
        return;
    }

    DB.restaurante = restaurante;

    // Actualizar UI con datos del restaurante
    document.getElementById('sidebar-name').textContent = restaurante.nombre;
    document.getElementById('sidebar-slug').textContent = '/' + restaurante.slug;
    if (restaurante.logo_url) {
        document.getElementById('sidebar-avatar').innerHTML = `<img src="${restaurante.logo_url}" alt="logo">`;
    }

    // Enlace público
    const publicLink = `${window.location.origin.replace('/admin', '')}/${window.location.pathname.includes('admin') ? '../' : ''}index.html?r=${restaurante.slug}`;
    const cleanLink = window.location.href.replace('/admin/dashboard.html', '/index.html') + `?r=${restaurante.slug}`;
    document.getElementById('public-link').value = cleanLink;

    // Botones de preview
    document.getElementById('preview-btn').onclick = () => window.open(cleanLink, '_blank');
    document.getElementById('topbar-preview-btn').onclick = () => window.open(cleanLink, '_blank');

    // Cargar todas las secciones
    await Promise.all([
        loadCategorias(),
        loadProductos(),
        loadSedes()
    ]);

    loadBanners();
    loadConfig();
    updateStats();
}

// ============================================================
// NAVEGACIÓN
// ============================================================
const sectionTitles = {
    inicio:     ['Inicio', 'Resumen de tu restaurante'],
    menu:       ['Productos', 'Gestiona los productos de tu menú'],
    categorias: ['Categorías', 'Organiza tu menú por categorías'],
    sedes:      ['Sedes', 'Gestiona las ubicaciones de tu restaurante'],
    banners:    ['Banners', 'Imágenes del carrusel principal'],
    config:     ['Configuración', 'Personaliza tu restaurante']
};

function showSection(name) {
    // Actualizar secciones
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${name}`).classList.add('active');

    // Actualizar nav items
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Actualizar topbar
    const [title, subtitle] = sectionTitles[name] || ['', ''];
    document.getElementById('topbar-title').textContent = title;
    document.getElementById('topbar-subtitle').textContent = subtitle;
}

// ============================================================
// STATS
// ============================================================
function updateStats() {
    document.getElementById('stat-productos').textContent = DB.productos.filter(p => p.disponible).length;
    document.getElementById('stat-categorias').textContent = DB.categorias.length;
    document.getElementById('stat-sedes').textContent = DB.sedes.length;
    document.getElementById('stat-banners').textContent = (DB.restaurante.banners || []).length;
}

// ============================================================
// CATEGORÍAS
// ============================================================
async function loadCategorias() {
    const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('restaurante_id', DB.restaurante.id)
        .order('orden');

    if (error) { showToast('Error al cargar categorías', 'error'); return; }
    DB.categorias = data || [];
    renderCategoriasTable();
}

function renderCategoriasTable() {
    const wrapper = document.getElementById('categorias-table-wrapper');
    if (DB.categorias.length === 0) {
        wrapper.innerHTML = `<div class="empty-state"><i class="fa-solid fa-tags"></i><h3>Sin categorías</h3><p>Agrega tu primera categoría para organizar el menú.</p></div>`;
        return;
    }
    wrapper.innerHTML = `
        <table class="data-table">
            <thead><tr>
                <th>Nombre</th>
                <th>Orden</th>
                <th>Productos</th>
                <th>Acciones</th>
            </tr></thead>
            <tbody>
                ${DB.categorias.map(cat => `
                    <tr>
                        <td><span class="product-name-cell">${cat.nombre}</span></td>
                        <td>${cat.orden}</td>
                        <td><span class="badge badge-cat">${DB.productos.filter(p => p.categoria_id === cat.id).length} productos</span></td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-ghost btn-sm" onclick="editCategoria('${cat.id}')"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn btn-danger btn-sm" onclick="deleteCategoria('${cat.id}')"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function openCategoryModal(id = null) {
    document.getElementById('cat-id').value = '';
    document.getElementById('cat-nombre').value = '';
    document.getElementById('cat-orden').value = DB.categorias.length;
    document.getElementById('modal-cat-title').textContent = 'Agregar categoría';
    if (id) {
        const cat = DB.categorias.find(c => c.id === id);
        if (cat) {
            document.getElementById('cat-id').value = cat.id;
            document.getElementById('cat-nombre').value = cat.nombre;
            document.getElementById('cat-orden').value = cat.orden;
            document.getElementById('modal-cat-title').textContent = 'Editar categoría';
        }
    }
    openModal('modal-categoria');
}

function editCategoria(id) { openCategoryModal(id); }

async function saveCategoria() {
    const id = document.getElementById('cat-id').value;
    const nombre = document.getElementById('cat-nombre').value.trim();
    const orden = parseInt(document.getElementById('cat-orden').value) || 0;

    if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

    const payload = { nombre, orden, restaurante_id: DB.restaurante.id };

    let error;
    if (id) {
        ({ error } = await supabase.from('categorias').update({ nombre, orden }).eq('id', id));
    } else {
        ({ error } = await supabase.from('categorias').insert(payload));
    }

    if (error) { showToast('Error al guardar: ' + error.message, 'error'); return; }
    showToast(id ? 'Categoría actualizada' : 'Categoría creada', 'success');
    closeModal('modal-categoria');
    await loadCategorias();
    populateCategoriasSelect();
    updateStats();
}

async function deleteCategoria(id) {
    if (!confirm('¿Eliminar esta categoría? Los productos quedarán sin categoría.')) return;
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) { showToast('Error al eliminar', 'error'); return; }
    showToast('Categoría eliminada', 'success');
    await loadCategorias();
    updateStats();
}

// ============================================================
// PRODUCTOS
// ============================================================
async function loadProductos() {
    const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('restaurante_id', DB.restaurante.id)
        .order('orden');

    if (error) { showToast('Error al cargar productos', 'error'); return; }
    DB.productos = data || [];
    renderProductosTable();
}

function renderProductosTable() {
    const wrapper = document.getElementById('productos-table-wrapper');
    if (DB.productos.length === 0) {
        wrapper.innerHTML = `<div class="empty-state"><i class="fa-solid fa-utensils"></i><h3>Sin productos</h3><p>Agrega tu primer producto al menú.</p></div>`;
        return;
    }

    const catMap = {};
    DB.categorias.forEach(c => { catMap[c.id] = c.nombre; });

    wrapper.innerHTML = `
        <table class="data-table">
            <thead><tr>
                <th class="col-img"></th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr></thead>
            <tbody>
                ${DB.productos.map(p => `
                    <tr>
                        <td><img class="product-thumb" src="${p.imagen_url || 'https://placehold.co/42x42/16161f/6b6889?text=📦'}" alt="${p.nombre}"></td>
                        <td><span class="product-name-cell">${p.nombre}</span><br><small style="color:var(--text-muted)">${formatMoney(p.precio)}</small></td>
                        <td><span class="badge badge-cat">${catMap[p.categoria_id] || 'Sin categoría'}</span></td>
                        <td style="color:var(--text-primary); font-weight:700">${formatMoney(p.precio)}</td>
                        <td><span class="badge ${p.disponible ? 'badge-active' : 'badge-inactive'}">${p.disponible ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-ghost btn-sm" onclick="editProducto('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn btn-danger btn-sm" onclick="deleteProducto('${p.id}')"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function openProductModal(id = null) {
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-precio').value = '';
    document.getElementById('prod-descripcion').value = '';
    document.getElementById('prod-imagen').value = '';
    document.getElementById('prod-img-preview').src = '';
    document.getElementById('prod-disponible').checked = true;
    document.getElementById('modal-producto-title').textContent = 'Agregar producto';
    populateCategoriasSelect();

    if (id) {
        const p = DB.productos.find(x => x.id === id);
        if (p) {
            document.getElementById('prod-id').value = p.id;
            document.getElementById('prod-nombre').value = p.nombre;
            document.getElementById('prod-precio').value = p.precio;
            document.getElementById('prod-descripcion').value = p.descripcion || '';
            document.getElementById('prod-categoria').value = p.categoria_id || '';
            document.getElementById('prod-imagen').value = p.imagen_url || '';
            document.getElementById('prod-img-preview').src = p.imagen_url || '';
            document.getElementById('prod-disponible').checked = p.disponible;
            document.getElementById('modal-producto-title').textContent = 'Editar producto';
        }
    }
    openModal('modal-producto');
}

function editProducto(id) { openProductModal(id); }

function populateCategoriasSelect() {
    const sel = document.getElementById('prod-categoria');
    sel.innerHTML = '<option value="">— Sin categoría —</option>' +
        DB.categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

async function saveProducto() {
    const id = document.getElementById('prod-id').value;
    const nombre = document.getElementById('prod-nombre').value.trim();
    const precio = parseInt(document.getElementById('prod-precio').value);
    const descripcion = document.getElementById('prod-descripcion').value.trim();
    const categoria_id = document.getElementById('prod-categoria').value || null;
    const imagen_url = document.getElementById('prod-imagen').value.trim();
    const disponible = document.getElementById('prod-disponible').checked;

    if (!nombre || isNaN(precio)) { showToast('Nombre y precio son obligatorios', 'error'); return; }

    const payload = { nombre, precio, descripcion, categoria_id, imagen_url, disponible, restaurante_id: DB.restaurante.id };

    let error;
    if (id) {
        ({ error } = await supabase.from('productos').update({ nombre, precio, descripcion, categoria_id, imagen_url, disponible }).eq('id', id));
    } else {
        ({ error } = await supabase.from('productos').insert(payload));
    }

    if (error) { showToast('Error al guardar: ' + error.message, 'error'); return; }
    showToast(id ? 'Producto actualizado' : 'Producto creado ✅', 'success');
    closeModal('modal-producto');
    await loadProductos();
    updateStats();
}

async function deleteProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) { showToast('Error al eliminar', 'error'); return; }
    showToast('Producto eliminado', 'success');
    await loadProductos();
    updateStats();
}

// ============================================================
// SEDES
// ============================================================
async function loadSedes() {
    const { data, error } = await supabase
        .from('sedes')
        .select('*')
        .eq('restaurante_id', DB.restaurante.id)
        .order('orden');

    if (error) { showToast('Error al cargar sedes', 'error'); return; }
    DB.sedes = data || [];
    renderSedesGrid();
}

function renderSedesGrid() {
    const grid = document.getElementById('sedes-grid');
    if (DB.sedes.length === 0) {
        grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-map-location-dot"></i><h3>Sin sedes</h3><p>Agrega la primera ubicación de tu restaurante.</p></div>`;
        return;
    }
    grid.innerHTML = DB.sedes.map(sede => `
        <div class="sede-card">
            <div class="sede-card-header">
                <div>
                    <div class="sede-card-name">${sede.nombre}</div>
                    <div class="sede-card-city"><i class="fa-solid fa-city"></i> ${sede.ciudad}</div>
                </div>
            </div>
            <div class="sede-card-info">
                <div class="sede-info-row"><i class="fa-brands fa-whatsapp"></i> ${sede.telefono}</div>
                ${sede.direccion ? `<div class="sede-info-row"><i class="fa-solid fa-location-dot"></i> ${sede.direccion}</div>` : ''}
                ${sede.horario ? `<div class="sede-info-row"><i class="fa-solid fa-clock"></i> ${sede.horario}</div>` : ''}
            </div>
            <div class="sede-card-footer">
                <button class="btn btn-ghost btn-sm" onclick="editSede('${sede.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteSede('${sede.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function openSedeModal(id = null) {
    document.getElementById('sede-id').value = '';
    document.getElementById('sede-ciudad').value = '';
    document.getElementById('sede-nombre').value = '';
    document.getElementById('sede-telefono').value = '';
    document.getElementById('sede-direccion').value = '';
    document.getElementById('sede-horario').value = '';
    document.getElementById('modal-sede-title').textContent = 'Agregar sede';

    if (id) {
        const sede = DB.sedes.find(s => s.id === id);
        if (sede) {
            document.getElementById('sede-id').value = sede.id;
            document.getElementById('sede-ciudad').value = sede.ciudad;
            document.getElementById('sede-nombre').value = sede.nombre;
            document.getElementById('sede-telefono').value = sede.telefono;
            document.getElementById('sede-direccion').value = sede.direccion || '';
            document.getElementById('sede-horario').value = sede.horario || '';
            document.getElementById('modal-sede-title').textContent = 'Editar sede';
        }
    }
    openModal('modal-sede');
}

function editSede(id) { openSedeModal(id); }

async function saveSede() {
    const id = document.getElementById('sede-id').value;
    const ciudad = document.getElementById('sede-ciudad').value.trim();
    const nombre = document.getElementById('sede-nombre').value.trim();
    const telefono = document.getElementById('sede-telefono').value.trim();
    const direccion = document.getElementById('sede-direccion').value.trim();
    const horario = document.getElementById('sede-horario').value.trim();

    if (!ciudad || !nombre || !telefono) { showToast('Ciudad, nombre y teléfono son obligatorios', 'error'); return; }

    const payload = { ciudad, nombre, telefono, direccion, horario, restaurante_id: DB.restaurante.id };

    let error;
    if (id) {
        ({ error } = await supabase.from('sedes').update({ ciudad, nombre, telefono, direccion, horario }).eq('id', id));
    } else {
        ({ error } = await supabase.from('sedes').insert(payload));
    }

    if (error) { showToast('Error al guardar: ' + error.message, 'error'); return; }
    showToast(id ? 'Sede actualizada' : 'Sede creada ✅', 'success');
    closeModal('modal-sede');
    await loadSedes();
    updateStats();
}

async function deleteSede(id) {
    if (!confirm('¿Eliminar esta sede?')) return;
    const { error } = await supabase.from('sedes').delete().eq('id', id);
    if (error) { showToast('Error al eliminar', 'error'); return; }
    showToast('Sede eliminada', 'success');
    await loadSedes();
    updateStats();
}

// ============================================================
// BANNERS
// ============================================================
function loadBanners() {
    const banners = DB.restaurante.banners || [];
    const list = document.getElementById('banners-list');

    if (banners.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding:30px"><i class="fa-solid fa-images"></i><h3>Sin banners</h3><p>Agrega imágenes para el carrusel.</p></div>`;
        return;
    }

    list.innerHTML = banners.map((url, i) => `
        <div class="banner-item">
            <img class="banner-thumb" src="${url}" alt="Banner ${i+1}" onerror="this.src='https://placehold.co/80x42/16161f/6b6889?text=Error'">
            <span class="banner-url">${url}</span>
            <button class="btn btn-danger btn-sm" onclick="deleteBanner(${i})"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join('');
}

function openBannerModal() {
    document.getElementById('banner-url').value = '';
    document.getElementById('banner-img-preview').src = '';
    openModal('modal-banner');
}

async function saveBanner() {
    const url = document.getElementById('banner-url').value.trim();
    if (!url) { showToast('La URL es obligatoria', 'error'); return; }

    const banners = [...(DB.restaurante.banners || []), url];
    const { error } = await supabase.from('restaurantes').update({ banners }).eq('id', DB.restaurante.id);
    if (error) { showToast('Error al guardar', 'error'); return; }

    DB.restaurante.banners = banners;
    showToast('Banner agregado ✅', 'success');
    closeModal('modal-banner');
    loadBanners();
    updateStats();
}

async function deleteBanner(index) {
    if (!confirm('¿Eliminar este banner?')) return;
    const banners = (DB.restaurante.banners || []).filter((_, i) => i !== index);
    const { error } = await supabase.from('restaurantes').update({ banners }).eq('id', DB.restaurante.id);
    if (error) { showToast('Error al eliminar', 'error'); return; }
    DB.restaurante.banners = banners;
    showToast('Banner eliminado', 'success');
    loadBanners();
    updateStats();
}

// ============================================================
// CONFIGURACIÓN
// ============================================================
function loadConfig() {
    const r = DB.restaurante;
    document.getElementById('cfg-nombre').value = r.nombre || '';
    document.getElementById('cfg-web').value = r.sitio_web || '';
    document.getElementById('cfg-logo').value = r.logo_url || '';
    document.getElementById('logo-preview').src = r.logo_url || '';
    document.getElementById('cfg-color1').value = r.color_primario || '#e63946';
    document.getElementById('cfg-color1-picker').value = r.color_primario || '#e63946';
    document.getElementById('cfg-color2').value = r.color_secundario || '#f4a261';
    document.getElementById('cfg-color2-picker').value = r.color_secundario || '#f4a261';
    document.getElementById('cfg-domicilio').value = r.domicilio || 0;
    document.getElementById('cfg-whatsapp').value = r.whatsapp_cs || '';
    const redes = r.redes || {};
    document.getElementById('cfg-instagram').value = redes.instagram || '';
    document.getElementById('cfg-facebook').value = redes.facebook || '';
    document.getElementById('cfg-tiktok').value = redes.tiktok || '';
}

async function saveConfig(e) {
    e.preventDefault();
    const payload = {
        nombre: document.getElementById('cfg-nombre').value.trim(),
        sitio_web: document.getElementById('cfg-web').value.trim(),
        logo_url: document.getElementById('cfg-logo').value.trim(),
        color_primario: document.getElementById('cfg-color1').value.trim(),
        color_secundario: document.getElementById('cfg-color2').value.trim(),
        domicilio: parseInt(document.getElementById('cfg-domicilio').value) || 0,
        whatsapp_cs: document.getElementById('cfg-whatsapp').value.trim(),
        redes: {
            instagram: document.getElementById('cfg-instagram').value.trim(),
            facebook: document.getElementById('cfg-facebook').value.trim(),
            tiktok: document.getElementById('cfg-tiktok').value.trim()
        }
    };

    const { error } = await supabase.from('restaurantes').update(payload).eq('id', DB.restaurante.id);
    if (error) { showToast('Error al guardar: ' + error.message, 'error'); return; }

    Object.assign(DB.restaurante, payload);
    document.getElementById('sidebar-name').textContent = payload.nombre;
    if (payload.logo_url) {
        document.getElementById('sidebar-avatar').innerHTML = `<img src="${payload.logo_url}" alt="logo">`;
    }
    showToast('Configuración guardada ✅', 'success');
}

function previewLogo(url) {
    document.getElementById('logo-preview').src = url;
}

// ============================================================
// MODALES (helpers)
// ============================================================
function openModal(id) {
    document.getElementById(id).classList.add('active');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Cerrar modales al hacer clic fuera
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ============================================================
// UTILIDADES
// ============================================================
function previewImage(inputId, previewId) {
    const url = document.getElementById(inputId).value;
    document.getElementById(previewId).src = url;
}

function copyPublicLink() {
    const input = document.getElementById('public-link');
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('Enlace copiado al portapapeles 📋', 'success');
    });
}

function formatMoney(amount) {
    return '$ ' + new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(amount);
}

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Logout
async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Start
init();
