let currentUser = null;
let redirectAfterLogin = null;
const DEMO_SEED_EMAIL = "demo@libroai.app";

function isSeedDemoUser(user) {
    return !!user && String(user.email || "").trim().toLowerCase() === DEMO_SEED_EMAIL;
}

async function checkSession() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        
        if (data && data.user) {
            if (isSeedDemoUser(data.user)) {
                // Nunca mostrar la cuenta seed/demo en UI de usuario final.
                await fetch('/api/auth/logout', { method: 'POST' });
                currentUser = null;
                document.getElementById('authBtns').style.display = 'flex';
                document.getElementById('userMenu').style.display = 'none';
                return;
            }
            currentUser = data.user;
            updateUI(data.user);
        } else {
            currentUser = null;
            document.getElementById('authBtns').style.display = 'flex';
            document.getElementById('userMenu').style.display = 'none';
        }
    } catch (e) {
        console.error("Error checking session", e);
    }
}

function handleStartWriting() {
    if (!currentUser) {
        // No está logueado -> Guardamos intención y abrimos login
        redirectAfterLogin = '/vender';
        openLoginModal();
    } else if (currentUser.is_seller || currentUser.is_admin) {
        // Ya es escritor -> Al escritorio
        window.location.href = '/escribir';
    } else {
        // Logueado pero no es escritor -> Al formulario de venta
        window.location.href = '/vender';
    }
}

function updateUI(user) {
    // ... (keep existing updateUI logic)
    document.getElementById('authBtns').style.display = 'none';
    const userMenu = document.getElementById('userMenu');
    userMenu.style.display = 'flex';
    
    document.getElementById('userEmailDisplay').textContent = user.email;
    if (user.avatar_url) {
        document.getElementById('userAvatar').src = user.avatar_url;
    } else {
        document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${user.email}&background=641220&color=fff`;
    }

    if (user.is_admin) {
        document.getElementById('adminLink').style.display = 'flex';
    }
    if (user.is_seller) {
        document.getElementById('writerLink').style.display = 'flex';
        document.getElementById('sellerDashLink').style.display = 'flex';
    }
}

function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    redirectAfterLogin = null; // Limpiar si cierra sin loguear
}

function setAuthMode(mode) {
    currentAuthMode = mode;
    document.getElementById('tabLogin').classList.toggle('active', mode === 'login');
    document.getElementById('tabRegister').classList.toggle('active', mode === 'register');
    document.getElementById('confirmPassGroup').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('authSubmitBtn').textContent = mode === 'register' ? 'Crear Cuenta' : 'Entrar';
}

function toggleUserDropdown() {
    const dd = document.getElementById('userDropdown');
    dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
}

async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
}

async function handleGoogleLogin() {
    const errorDiv = document.getElementById('authError');
    if (!window.firebaseAuth || !window.firebaseSignInWithPopup || !window.firebaseGoogleProvider) {
        errorDiv.textContent = "Firebase no está listo. Intenta de nuevo en unos segundos.";
        return;
    }
    
    try {
        errorDiv.textContent = "Abriendo Google...";
        const result = await window.firebaseSignInWithPopup(window.firebaseAuth, window.firebaseGoogleProvider);
        const token = await result.user.getIdToken();
        
        errorDiv.textContent = "Verificando cuenta...";
        const res = await fetch("/api/auth/firebase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        });
        
        if (res.ok) {
            if (redirectAfterLogin) {
                window.location.href = redirectAfterLogin;
            } else {
                window.location.reload();
            }
        } else {
            const data = await res.json();
            errorDiv.textContent = data.error || "Error al verificar con el servidor";
        }
    } catch (err) {
        console.error(err);
        errorDiv.textContent = err.message || "Error al iniciar sesión con Google";
    }
}

document.getElementById('landingAuthForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const password2 = document.getElementById('authPassword2').value;
    const errorDiv = document.getElementById('authError');
    
    if (currentAuthMode === 'register' && password !== password2) {
        errorDiv.textContent = "Las contraseñas no coinciden.";
        return;
    }

    const path = currentAuthMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    
    try {
        const res = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            if (redirectAfterLogin) {
                window.location.href = redirectAfterLogin;
            } else {
                window.location.reload();
            }
        } else {
            errorDiv.textContent = data.error || "Error en la autenticación";
        }
    } catch (err) {
        errorDiv.textContent = "Error de conexión con el servidor.";
    }
});

// Cerrar dropdown al hacer click fuera
window.addEventListener('click', (e) => {
    if (!document.getElementById('userMenu').contains(e.target)) {
        document.getElementById('userDropdown').style.display = 'none';
    }
    if (e.target === document.getElementById('loginModal')) {
        closeLoginModal();
    }
});

checkSession();
