// ============================================================
// AUTH.JS - Login & Register con Supabase
// ============================================================

// Verificar si ya hay sesión activa
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
    }
}
checkSession();

// Cambiar entre tabs
function showTab(tab) {
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

// Mostrar/ocultar contraseña
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.querySelector('i').className = isText ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
}

// LOGIN
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errorEl = document.getElementById('login-error');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    errorEl.classList.remove('show');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Ingresando...';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        errorEl.textContent = traducirError(error.message);
        errorEl.classList.add('show');
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'Entrar al Dashboard';
        return;
    }

    window.location.href = 'dashboard.html';
}

// Generar slug automáticamente desde el nombre del restaurante
function generateSlug(nombre) {
    return nombre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
        .replace(/[^a-z0-9\s-]/g, '')  // solo letras, números, espacios y guiones
        .trim()
        .replace(/\s+/g, '-')          // espacios → guiones
        .replace(/-+/g, '-');          // guiones dobles → uno
}

// REGISTER
async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('register-btn');
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');

    const nombre = document.getElementById('reg-nombre').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    errorEl.classList.remove('show');
    successEl.classList.remove('show');

    // Generar slug automáticamente
    let slug = generateSlug(nombre);
    if (!slug) {
        errorEl.textContent = 'El nombre del restaurante no es válido.';
        errorEl.classList.add('show');
        return;
    }

    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Creando cuenta...';

    // Si el slug ya existe, agregar un número aleatorio
    const { data: existing } = await supabase
        .from('restaurantes')
        .select('id')
        .eq('slug', slug)
        .single();

    if (existing) {
        slug = slug + '-' + Math.floor(Math.random() * 9000 + 1000);
    }

    // Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { nombre, slug } // metadata del usuario
        }
    });

    if (error) {
        errorEl.textContent = traducirError(error.message);
        errorEl.classList.add('show');
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'Crear cuenta gratis';
        return;
    }

    // Crear registro en tabla restaurantes
    const { error: dbError } = await supabase.from('restaurantes').insert({
        user_id: data.user.id,
        slug,
        nombre,
        color_primario: '#e63946',
        color_secundario: '#f4a261',
        domicilio: 5000,
        redes: { instagram: '', facebook: '', tiktok: '' },
        banners: []
    });

    if (dbError) {
        errorEl.textContent = 'Error al crear el restaurante: ' + dbError.message;
        errorEl.classList.add('show');
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'Crear cuenta gratis';
        return;
    }

    successEl.textContent = '✅ ¡Cuenta creada! Revisa tu correo para confirmar tu cuenta y luego inicia sesión.';
    successEl.classList.add('show');
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Crear cuenta gratis';

    // Si no requiere confirmación de email (según config de Supabase), redirigir
    if (data.session) {
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
    }
}

// Traducir errores de Supabase al español
function traducirError(msg) {
    if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (msg.includes('Email not confirmed')) return 'Debes confirmar tu correo antes de entrar.';
    if (msg.includes('User already registered')) return 'Este correo ya tiene una cuenta. Inicia sesión.';
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (msg.includes('Unable to validate email')) return 'El correo ingresado no es válido.';
    return msg;
}
