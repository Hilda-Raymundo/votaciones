// Credenciales de Supabase
const supabaseUrl = 'https://xrtuydrbmqitfzuxdhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhydHV5ZHJibXFpdGZ6dXhkaGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDI2MzYsImV4cCI6MjA3MTk3ODYzNn0.PcNGmdzwXMfKinTBT5Ia_7ZkuAsKyFlLN0H9P7NHBxo';

// Crear cliente
const { createClient } = supabase;
const db = createClient(supabaseUrl, supabaseKey);

console.log("✅ Cliente Supabase creado:", db);

// 🔎 Test de conexión
async function probarConexion() {
  const { data, error } = await db.from('usuarios').select('*').limit(1);

  if (error) {
    console.error("❌ Error al conectar con la BD:", error);
  } else {
    console.log("✅ Conexión correcta. Datos de prueba:", data);
  }
}
probarConexion();

// --- Funciones de la app ---

// Insertar usuario
async function insertarUsuario(nombre) {
  const { data, error } = await db.from('usuarios').insert([{ nombre }]);

  if (error) {
    console.error('❌ Error insertando:', error);
  } else {
    console.log('✅ Usuario insertado:', data);
    obtenerUsuarios(); // refrescar lista
  }
}

// Obtener usuarios
async function obtenerUsuarios() {
  const { data, error } = await db.from('usuarios').select('*');

  if (error) {
    console.error('❌ Error obteniendo:', error);
  } else {
    mostrarUsuarios(data);
  }
}

// Renderizar lista de usuarios
function mostrarUsuarios(usuarios) {
  const lista = document.getElementById('listaUsuarios');
  lista.innerHTML = '';
  usuarios.forEach(u => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = `${u.id} - ${u.nombre}`;
    lista.appendChild(li);
  });
}

// --- Eventos ---
document.getElementById('formulario').addEventListener('submit', function (e) {
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  console.log("🔎 Intentando insertar:", nombre);
  if (nombre) {
    insertarUsuario(nombre);
    document.getElementById('nombre').value = '';
  }
});

// Cargar usuarios al iniciar
obtenerUsuarios();
