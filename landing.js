document.addEventListener('DOMContentLoaded', () => {
    initAccordion();
    renderSedesInAccordion();
    setupGalleryClicks();
});

// Inicialización del Acordeón
function initAccordion() {
    const headers = document.querySelectorAll('.region-header');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const tab = header.parentElement;
            const content = tab.querySelector('.region-content');
            
            // Cerrar otros acordeones si están abiertos
            document.querySelectorAll('.region-tab').forEach(otherTab => {
                if (otherTab !== tab && otherTab.classList.contains('active')) {
                    otherTab.classList.remove('active');
                    otherTab.querySelector('.region-content').style.maxHeight = null;
                }
            });
            
            // Toggle actual
            tab.classList.toggle('active');
            if (tab.classList.contains('active')) {
                // Establecer max-height dinámico según el contenido
                content.style.maxHeight = content.scrollHeight + "px";
            } else {
                content.style.maxHeight = null;
            }
        });
    });
}

// Clasificación de sedes según la estructura de la landing page
function renderSedesInAccordion() {
    // Antioquia
    const orienteSedes = [];
    const surAburraSedes = [];
    const centroAburraSedes = [];
    const norteAburraSedes = [];
    const urabaSedes = [];
    const masAntioquiaSedes = [];

    // + Colombia
    const bogotaSedes = [];
    const ejeCafeteroSedes = [];
    const valleCaucaSedes = [];
    const costaSedes = [];
    const santanderSedes = [];
    const masColombiaSedes = [];

    // Clasificar sedes de data.js
    sedes.forEach(grupo => {
        const ciudad = grupo.ciudad;
        
        grupo.sedes.forEach(s => {
            const id = s.id.toLowerCase();
            const address = s.direccion.toLowerCase();
            
            if (ciudad === "Medellín") {
                // Medellín es Centro Valle de Aburrá
                centroAburraSedes.push(s);
            } 
            else if (ciudad === "Valle de Aburrá") {
                // Dividir Valle de Aburrá en Norte y Sur
                const isNorte = id.includes('bello') || id.includes('copacabana') || id.includes('girardota') || id.includes('barbosa');
                if (isNorte) {
                    norteAburraSedes.push(s);
                } else {
                    surAburraSedes.push(s);
                }
            } 
            else if (ciudad === "Oriente Antioqueño") {
                orienteSedes.push(s);
            } 
            else if (ciudad === "Urabá y Otras Regiones (Ant.)") {
                // Dividir Urabá de otras regiones (ej. Puerto Berrio, Caucasia)
                const isUraba = id.includes('chigorod') || id.includes('carepa') || id.includes('apartad') || id.includes('turbo');
                if (isUraba) {
                    urabaSedes.push(s);
                } else {
                    masAntioquiaSedes.push(s);
                }
            } 
            else if (ciudad === "Bogotá y Sabana") {
                bogotaSedes.push(s);
            } 
            else if (ciudad === "Eje Cafetero") {
                ejeCafeteroSedes.push(s);
            } 
            else if (ciudad === "Valle del Cauca") {
                valleCaucaSedes.push(s);
            } 
            else if (ciudad === "Costa Caribe") {
                costaSedes.push(s);
            } 
            else if (ciudad === "Santanderes, Tolima, Huila & Magdalena Medio") {
                // Dividir Santanderes del resto (Tolima/Huila/Magdalena Medio)
                const isSantander = id.includes('bucaramanga') || id.includes('piedecuesta') || id.includes('barrancabermeja');
                if (isSantander) {
                    santanderSedes.push(s);
                } else {
                    masColombiaSedes.push(s);
                }
            }
        });
    });

    // Mapear divs del HTML
    const renderList = (elementId, list) => {
        const container = document.getElementById(elementId);
        if (!container) return;
        
        if (list.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.85rem; padding: 4px 10px;">Próximamente...</div>';
            return;
        }

        container.innerHTML = list.map(s => `
            <a class="sede-pill" href="#" onclick="selectSedeAndRedirect('${s.id}', '${s.nombre}', '${s.telefono}', event)">
                <i class="fa-solid fa-location-dot"></i> ${s.nombre.replace('Tierra Querida ', '')}
            </a>
        `).join('');
    };

    // Antioquia
    renderList('list-oriente', orienteSedes);
    renderList('list-sur-aburra', surAburraSedes);
    renderList('list-centro-aburra', centroAburraSedes);
    renderList('list-norte-aburra', norteAburraSedes);
    renderList('list-uraba', urabaSedes);
    renderList('list-mas-antioquia', masAntioquiaSedes);

    // + Colombia
    renderList('list-bogota', bogotaSedes);
    renderList('list-eje-cafetero', ejeCafeteroSedes);
    renderList('list-valle-cauca', valleCaucaSedes);
    renderList('list-costa', costaSedes);
    renderList('list-santander', santanderSedes);
    renderList('list-mas-colombia', masColombiaSedes);
}

// Guardar sede en localStorage y redirigir
window.selectSedeAndRedirect = function(id, nombre, telefono, event) {
    if (event) event.preventDefault();
    
    const selected = { id, nombre, telefono };
    localStorage.setItem('sedeSeleccionada', JSON.stringify(selected));
    
    // Redirigir al menú online
    window.location.href = 'index.html';
};

// Configurar clics en la galería de combos
function setupGalleryClicks() {
    const cards = document.querySelectorAll('.gallery-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.getAttribute('data-product-id');
            if (productId) {
                // Guardar el producto a abrir automáticamente
                localStorage.setItem('autoAddProduct', productId);
                // Redirigir al menú
                window.location.href = 'index.html';
            }
        });
    });
}
