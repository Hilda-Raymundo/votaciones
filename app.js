// ================================
//  Configuración Supabase
// ================================
const supabaseUrl = 'https://xrtuydrbmqitfzuxdhil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhydHV5ZHJibXFpdGZ6dXhkaGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDI2MzYsImV4cCI6MjA3MTk3ODYzNn0.PcNGmdzwXMfKinTBT5Ia_7ZkuAsKyFlLN0H9P7NHBxo';
const { createClient } = supabase;
const db = createClient(supabaseUrl, supabaseKey);

// Datos de tu bucket
const PROJECT_REF = "xrtuydrbmqitfzuxdhil";
const BUCKET = "candidatos";

// Función utilitaria para construir la URL pública de las fotos
function buildFotoUrl(filename) {
  if (!filename) {
    return "https://via.placeholder.com/300x200.png?text=Candidato";
  }
  return `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/${BUCKET}/${filename}`;
}

// ------------------- Departamentos -------------------
async function obtenerDepartamentosYllenarSelect() {
  const selectEl = document.getElementById('nombre');
  if (!selectEl) return;

  try {
    const { data, error } = await db
      .from('departamentos')
      .select('*')
      .order('nombre');

    if (error) throw error;
    if (!data || !data.length) {
      selectEl.innerHTML = '<option value="" disabled>No hay departamentos</option>';
      return;
    }

    selectEl.innerHTML = '<option value="" selected disabled>Seleccione departamento</option>';
    data.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id;
      o.textContent = d.nombre;
      selectEl.appendChild(o);
    });

  } catch (err) {
    console.error('Error al cargar departamentos:', err.message);
    selectEl.innerHTML = '<option value="" disabled>Error cargando departamentos</option>';
  }

  // Manejar selección
  selectEl.addEventListener('change', async (e) => {
    const deptoId = parseInt(e.target.value);
    if (document.getElementById('rolesContainer')) {
      const roles = await obtenerRolesPorDepartamento(deptoId);
      mostrarRolesHtml(roles, deptoId);
    }
  });
}


async function obtenerRolesPorDepartamento(deptoId) {
  const { data, error } = await db
    .from('roles_por_departamento')
    .select('roles(id,nombre)')
    .eq('departamento_id', deptoId);

  if (error) { console.error(error); return []; }
  return data.map(r => r.roles);
}

function mostrarRolesHtml(roles, departamentoId) {
  const container = document.getElementById('rolesContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!roles.length) {
    container.innerHTML = '<p>No hay roles para este departamento.</p>';
    return;
  }

  const sel = document.createElement('select');
  sel.id = 'rol';
  sel.className = 'form-control';
  sel.innerHTML = '<option value="" selected disabled>Seleccione rol</option>';
  roles.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.nombre;
    sel.appendChild(opt);
  });
  container.appendChild(sel);

  const form = document.getElementById('formulario');
  if (!form) return;

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const deptId = document.getElementById('nombre').value;
    const rolId = document.getElementById('rol').value;
    if (!deptId || !rolId) { alert('Seleccione departamento y rol'); return; }
    window.location.href = `votaciones.html?departamento=${deptId}&rol=${rolId}`;
  });
}

function mostrarCandidatosHtml(candidatos, contenedorId = 'candidatosContainer') {
  const cont = document.getElementById(contenedorId);
  if (!cont) return;
  cont.innerHTML = '';

  if (!candidatos || candidatos.length === 0) {
    cont.innerHTML = '<p>No hay candidatos disponibles.</p>';
    const btn = document.getElementById('btnVotar');
    if (btn) btn.disabled = true;
    return;
  }

  candidatos.forEach(c => {
    const div = document.createElement('div');
    div.className = 'col-md-2 mb-3';
    div.innerHTML = `
      <div class="card h-10 shadow-sm candidato-card" data-id="${c.id}" role="button" style="border:1px solid transparent;">
        <img src="${buildFotoUrl(c.foto)}" class="card-img-top" alt="${c.nombre}" style="width:150px; height:150px; object-fit:cover; margin:auto; border-radius:10px;">
        <div class="card-body text-center">
          <h5 class="card-title mb-0">${c.nombre}</h5>
          <input class="candidatoRadio" type="radio" name="candidato" id="cand_${c.id}" value="${c.id}" hidden>
        </div>
      </div>
    `;
    cont.appendChild(div);
  });

  // Deselecciona todos al cargar
  cont.querySelectorAll('.candidatoRadio').forEach(r => r.checked = false);
  cont.querySelectorAll('.candidato-card').forEach(c => c.classList.remove('selected'));

  // Manejar selección
  cont.querySelectorAll('.candidato-card').forEach(card => {
    card.addEventListener('click', () => {
      // deselect all
      cont.querySelectorAll('.candidato-card').forEach(c => {
        c.classList.remove('selected');
        c.querySelector('.candidatoRadio').checked = false;
      });
      // seleccionar este
      card.classList.add('selected');
      card.querySelector('.candidatoRadio').checked = true;
    });
  });

  // Activar botón de votar
  const btn = document.getElementById('btnVotar');
  if (btn) {
    btn.disabled = true; // inicialmente deshabilitado
    cont.addEventListener('click', () => {
      // habilitar si hay seleccionado
      const anyChecked = cont.querySelector('input[name="candidato"]:checked');
      btn.disabled = !anyChecked;
    });
    btn.onclick = votarSeleccionado;
  }
}


// ------------------- Preparar Ronda -------------------
async function prepararRondaYMostrarCandidatos(deptoId, rolId) {
  // Buscar o crear ronda abierta
  let { data: rd } = await db
    .from('rondas')
    .select('*')
    .eq('departamento_id', deptoId)
    .eq('rol_id', rolId)
    .eq('estado', 'open')
    .limit(1);

  let ronda;
  if (rd && rd.length) {
    ronda = rd[0];
  } else {
    const { data: last } = await db
      .from('rondas')
      .select('numero')
      .eq('departamento_id', deptoId)
      .eq('rol_id', rolId)
      .order('numero', { ascending: false })
      .limit(1);

    const numero = (last && last.length) ? last[0].numero + 1 : 1;

    const { data: newR } = await db
      .from('rondas')
      .insert([{ departamento_id: deptoId, rol_id: rolId, numero, estado: 'open' }])
      .select()
      .single();

    ronda = newR;
  }

  window.rondaActual = ronda;

  const { data: candidatos, error } = await db
    .from('candidatos')
    .select('*')
    .eq('departamento_id', deptoId)
    .eq('electo', false)
    .eq('eliminado', false);

  if (error) { console.error(error); return; }

  mostrarCandidatosHtml(candidatos, 'candidatosContainer');
}

async function votarSeleccionado() {
  const sel = document.querySelector('input[name="candidato"]:checked');
  if (!sel) { alert('Seleccione un candidato'); return; }

  const candidatoId = parseInt(sel.value);
  const ronda = window.rondaActual;
  if (!ronda) { alert('Ronda no encontrada.'); return; }

  // Insertar voto en la base
  const { error } = await db.from('votos').insert([{ ronda_id: ronda.id, candidato_id: candidatoId }]);
  if (error) { console.error(error); alert('Error al votar'); return; }

  // Deseleccionar todos los candidatos
  const cont = document.getElementById('candidatosContainer');
  cont.querySelectorAll('.candidato-card').forEach(c => c.classList.remove('selected'));
  cont.querySelectorAll('.candidatoRadio').forEach(r => r.checked = false);

  // Deshabilitar botón de votar hasta nueva selección
  const btn = document.getElementById('btnVotar');
  if (btn) btn.disabled = true;

  // Mostrar toast correctamente
  const toastEl = document.querySelector('#toastVoto .toast'); // aquí apuntamos al div con clase toast
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
  
  // Esconder automáticamente después de 2.5 seg
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 1500);
}


// ==================== INFORME / TERMINAR ====================
async function cargarRondasAbiertasEnSelect() {
  const sel = document.getElementById('rondasSelect');
  if (!sel) return;

  const { data, error } = await db
    .from('rondas')
    .select('id, numero, estado, departamentos(nombre), roles(nombre)')
    .order('creada_at', { ascending: false });

  if (error) { console.error(error); return; }

  sel.innerHTML = '<option value="" selected disabled>Seleccione ronda</option>';
  data.forEach(r => {
    const depto = r.departamentos?.nombre || 'Sin depto';
    const rol = r.roles?.nombre || 'Sin rol';
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = `Ronda ${r.numero} - ${depto} / ${rol} (${r.estado})`;
    sel.appendChild(opt);
  });
}

async function cargarInformeParaRonda(rondaId) {
  const { data: infoRonda, error: errRonda } = await db
    .from('rondas')
    .select('id, numero, estado, departamento_id, rol_id, departamentos(nombre), roles(nombre)')
    .eq('id', rondaId)
    .single();

  if (errRonda) { console.error(errRonda); alert('Error al obtener datos de la ronda.'); return; }

  const { data: resultados, error: errRes } = await db.rpc('reporte_ronda', { p_ronda_id: parseInt(rondaId) });
  if (errRes) { console.error(errRes); alert('Error al generar el informe.'); return; }

  const cont = document.getElementById('informeContainer');
  cont.innerHTML = '';

  const titulo = document.createElement('h4');
  titulo.textContent = `Ronda ${infoRonda.numero} — ${infoRonda.departamentos?.nombre} / ${infoRonda.roles?.nombre}`;
  cont.appendChild(titulo);

  const table = document.createElement('table');
  table.className = 'table table-striped mt-3';
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Candidato</th>
        <th>Foto</th>
        <th>Votos</th>
        <th>Acción</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  resultados.sort((a,b)=>b.votos-a.votos).forEach((row, idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${row.nombre}</td>
      <td><img src="${buildFotoUrl(row.foto)}" style="width:80px;height:80px;object-fit:cover;border-radius:10px;"></td>
      <td><strong>${row.votos}</strong></td>
      <td>
        <button class="btn btn-success btn-sm btnRegistrar" data-id="${row.candidato_id}">Registrar ganador</button>
      </td>
    `;
    table.querySelector('tbody').appendChild(tr);
  });

  cont.appendChild(table);
   

// 🔁 Botón "Repetir ronda sin ganador"
if (infoRonda.estado !== 'closed') {
  const repetirDiv = document.createElement('div');
  repetirDiv.className = 'mt-3';

  const btnRepetir = document.createElement('button');
  btnRepetir.id = 'btnRepetirSinGanador';
  btnRepetir.className = 'btn btn-warning';
  btnRepetir.textContent = 'Repetir ronda (sin ganador)';

  btnRepetir.addEventListener('click', async () => {
    const confirmar = confirm('¿Desea cerrar esta ronda y crear una nueva sin asignar ganador?');
    if (!confirmar) return;

    // 1️⃣ Cerrar ronda actual
    const { error: errCerrar } = await db
      .from('rondas')
      .update({ estado: 'closed' })
      .eq('id', infoRonda.id);

    if (errCerrar) {
      console.error('Error al cerrar la ronda:', errCerrar);
      alert('Error al cerrar la ronda.');
      return;
    }

    // 2️⃣ Obtener última ronda del mismo depto/rol para numeración
    const { data: last, error: errLast } = await db
      .from('rondas')
      .select('numero')
      .eq('departamento_id', infoRonda.departamento_id)
      .eq('rol_id', infoRonda.rol_id)
      .order('numero', { ascending: false })
      .limit(1);

    if (errLast || !last?.length) {
      alert('No se pudo determinar el número para la nueva ronda.');
      return;
    }

    const nuevoNumero = last[0].numero + 1;

    // 3️⃣ Crear nueva ronda
    const { data: nueva, error: errNueva } = await db
      .from('rondas')
      .insert([{ 
        departamento_id: infoRonda.departamento_id, 
        rol_id: infoRonda.rol_id, 
        numero: nuevoNumero, 
        estado: 'open' 
      }])
      .select()
      .single();

    if (errNueva) {
      console.error('Error al crear nueva ronda:', errNueva);
      alert('Error al crear nueva ronda.');
      return;
    }

    alert(`✅ Ronda ${nuevoNumero} creada exitosamente.`);
    await cargarRondasAbiertasEnSelect();
    await cargarInformeParaRonda(nueva.id); // mostrar la nueva ronda
  });

  repetirDiv.appendChild(btnRepetir);
  cont.appendChild(repetirDiv);
}

  // 🎯 Evento para registrar ganador
  cont.querySelectorAll('.btnRegistrar').forEach(btn => {
    btn.addEventListener('click', async e => {
      const candidatoId = parseInt(e.target.dataset.id);
      await registrarGanador(infoRonda.id, candidatoId);
      await cargarInformeParaRonda(rondaId); // refrescar vista
    });
  });
}

// 🔹 Registrar ganador y cerrar ronda
async function registrarGanador(rondaId, candidatoId) {
  const confirmar = confirm('¿Desea registrar a este candidato como ganador?');
  if (!confirmar) return;

  const { error } = await db.rpc('registrar_ganador', {
    p_ronda_id: rondaId,
    p_candidato_id: candidatoId
  });

  if (error) { console.error(error); alert('Error al registrar ganador.'); return; }

  alert('🏆 Ganador registrado correctamente.');
  await cargarRondasAbiertasEnSelect();
}

// 🔹 Repetir ronda (crea nueva con votos = 0)
async function repetirRonda(deptoId, rolId) {
  const confirmar = confirm('¿Desea repetir la ronda? Los votos se reiniciarán.');
  if (!confirmar) return;

  const { data: last, error: errLast } = await db
    .from('rondas')
    .select('numero, rol_id')
    .eq('departamento_id', deptoId)
    .eq('rol_id', rolId)
    .order('numero', { ascending: false })
    .limit(1);

  if (errLast || !last?.length) { alert('No se encontró la ronda original.'); return; }

  const nuevoNumero = last[0].numero + 1;
  const rolOriginal = last[0].rol_id;

  const { data: nueva, error: errInsert } = await db
    .from('rondas')
    .insert([{ departamento_id: deptoId, rol_id: rolOriginal, numero: nuevoNumero, estado: 'open' }])
    .select()
    .single();

  if (errInsert) { console.error(errInsert); alert('Error al crear nueva ronda.'); return; }

  alert(`🔁 Ronda ${nuevoNumero} creada exitosamente.`);
  await cargarRondasAbiertasEnSelect();
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
  const path = window.location.pathname;

  if (path.endsWith('terminar.html')) {
    await cargarRondasAbiertasEnSelect();

    const btnInforme = document.getElementById('btnCargarInforme');
    if (btnInforme) {
      btnInforme.addEventListener('click', async () => {
        const val = document.getElementById('rondasSelect').value;
        if (!val) return alert('Seleccione una ronda');
        await cargarInformeParaRonda(val);
      });
    }
  } 
  else if (path.endsWith('index.html')) {
    await obtenerDepartamentosYllenarSelect();
  } 
  else if (path.endsWith('votaciones.html')) {
    const params = new URLSearchParams(window.location.search);
    const deptoId = parseInt(params.get('departamento'));
    const rolId = parseInt(params.get('rol'));

    if (!deptoId || !rolId) { alert("Faltan parámetros de departamento o rol"); return; }

    await prepararRondaYMostrarCandidatos(deptoId, rolId);
  }
});
