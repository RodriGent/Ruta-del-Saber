let productos = [];

// ==================== SISTEMA DE SEGURIDAD Y SINCRONIZACIÓN ====================
const SEGURIDAD = {
    PRECIO_MINIMO: 10,
    CANTIDAD_MAXIMA: 10,
    CANTIDAD_MINIMA: 1,
    IDS_PERMITIDOS: ["llavero-01", "llavero-02", "llavero-03", "llavero-04", "llavero-05", "llavero-06", "llavero-07", "llavero-08", 
                     "personaje-01", "personaje-02", "personaje-03", "personaje-04", "personaje-05", "personaje-06", "personaje-07",
                     "objeto-01", "objeto-02", "objeto-03", "objeto-04", "objeto-05"]
};

// FUNCIÓN DE VALIDACIÓN DE PRODUCTOS
function validarProductoSeguro(producto) {
    if (producto.precio < SEGURIDAD.PRECIO_MINIMO) {
        console.error("🚨 Intento de manipulación - Precio muy bajo:", producto);
        Swal.fire({
            title: 'Error de seguridad',
            text: 'Se detectó un problema con los precios. Recargando página...',
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
        return false;
    }
    
    if (producto.cantidad < SEGURIDAD.CANTIDAD_MINIMA || producto.cantidad > SEGURIDAD.CANTIDAD_MAXIMA) {
        console.error("🚨 Intento de manipulación - Cantidad inválida:", producto);
        return false;
    }
    
    if (!SEGURIDAD.IDS_PERMITIDOS.includes(producto.id)) {
        console.error("🚨 Intento de manipulación - ID no válido:", producto);
        return false;
    }
    
    return true;
}

// SANITIZAR DATOS DEL CARRITO
function sanitizarCarrito() {
    let carrito = JSON.parse(localStorage.getItem("productos-en-carrito") || "[]");
    
    // Filtrar solo productos válidos
    carrito = carrito.filter(producto => validarProductoSeguro(producto));
    
    // Asegurar precios mínimos
    carrito = carrito.map(producto => ({
        ...producto,
        precio: Math.max(producto.precio, SEGURIDAD.PRECIO_MINIMO)
    }));
    
    localStorage.setItem("productos-en-carrito", JSON.stringify(carrito));
    return carrito;
}

// 🔄 FUNCIÓN CLAVE: SINCRONIZAR DISPONIBILIDAD CON CARRITO ACTUAL
function sincronizarDisponibilidadConCarrito() {
    let productosDisponibilidad = JSON.parse(localStorage.getItem("productos-disponibilidad")) || [];
    let productosEnCarrito = JSON.parse(localStorage.getItem("productos-en-carrito")) || [];
    
    // Si no hay productosDisponibilidad, crear desde productos.json
    if (productosDisponibilidad.length === 0 && productos.length > 0) {
        productosDisponibilidad = JSON.parse(JSON.stringify(productos)); // Copia profunda
        localStorage.setItem("productos-disponibilidad", JSON.stringify(productosDisponibilidad));
    }
    
    // Recalcular disponibilidad REAL restando lo que está en carrito
    productosDisponibilidad.forEach(productoDisponible => {
        const productoEnCarrito = productosEnCarrito.find(p => p.id === productoDisponible.id);
        
        if (productoEnCarrito) {
            // La disponibilidad real es: stock original - cantidad en carrito
            // Pero mantenemos el stock original en el JSON
            const productoOriginal = productos.find(p => p.id === productoDisponible.id);
            if (productoOriginal) {
                productoDisponible.disponible = Math.max(0, productoOriginal.disponible - productoEnCarrito.cantidad);
            }
        } else {
            // Si no está en carrito, mostrar disponibilidad real del JSON
            const productoOriginal = productos.find(p => p.id === productoDisponible.id);
            if (productoOriginal) {
                productoDisponible.disponible = productoOriginal.disponible;
            }
        }
    });
    
    localStorage.setItem("productos-disponibilidad", JSON.stringify(productosDisponibilidad));
    return productosDisponibilidad;
}

// ==================== CÓDIGO ORIGINAL MEJORADO ====================
const contenedorProductos = document.querySelector("#contenedor-productos");
const botonesCategorias = document.querySelectorAll(".boton-categoria");
const tituloPrincipal = document.querySelector("#titulo-principal");
let botonesAgregar = document.querySelectorAll(".producto-agregar");
const numerito = document.querySelector("#numerito");

// CARGAR PRODUCTOS CON SINCRONIZACIÓN
fetch("js/productos.json")
    .then(response => response.json())
    .then(data => {
        productos = data;
        
        // SINCRONIZAR AL CARGAR LA PÁGINA
        sincronizarDisponibilidadConCarrito();
        sanitizarCarrito();
        
        cargarProductos(productos);
        actualizarNumerito();
    });

botonesCategorias.forEach(boton => boton.addEventListener("click", () => {
    aside.classList.remove("aside-visible");
}));

function cargarProductos(productosElegidos) {
    contenedorProductos.innerHTML = "";

    // OBTENER DISPONIBILIDAD ACTUALIZADA
    let productosDisponibilidad = sincronizarDisponibilidadConCarrito();

    productosElegidos.forEach(producto => {
        const productoActual = productosDisponibilidad.find(p => p.id === producto.id);
        const disponible = productoActual ? productoActual.disponible : (producto.disponible || 0);

        const div = document.createElement("div");
        div.classList.add("producto");
        // AGREGAR DATA-CATEGORIA PARA EL FILTRADO
        div.setAttribute("data-categoria", producto.categoria.id);

        div.innerHTML = `
            <img class="producto-imagen" src="${producto.imagen}" alt="${producto.titulo}">
            <div class="producto-detalles">
                <h3 class="producto-titulo">${producto.titulo}</h3>
                <p class="producto-precio">Bs. ${producto.precio}</p>
                <p class="producto-disponible">Disponible: ${disponible}</p>
               <button class="producto-agregar ${disponible === 0 ? 'producto-agotado' : ''}" 
        id="${producto.id}">
    ${disponible === 0 ? 'Agotado' : 'Agregar'}
</button>
            </div>
        `;

        contenedorProductos.append(div);
    });

    actualizarBotonesAgregar();
}

function actualizarBotonesAgregar() {
    botonesAgregar = document.querySelectorAll(".producto-agregar");

    botonesAgregar.forEach(boton => {
        boton.removeEventListener("click", agregarAlCarrito);
        // SOLO AGREGAR EVENT LISTENER SI NO ESTÁ DESHABILITADO
        if (!boton.disabled) {
            boton.addEventListener("click", agregarAlCarrito);
        }
    });
}

let productosEnCarrito = sanitizarCarrito();

function actualizarNumerito() {
    let nuevoNumerito = productosEnCarrito.reduce((acc, producto) => acc + producto.cantidad, 0);
    numerito.innerText = nuevoNumerito;
}

// 🔄 FUNCIÓN MEJORADA: AGREGAR AL CARRITO
function agregarAlCarrito(e) {
    const idBoton = e.currentTarget.id;
    
    // OBTENER DISPONIBILIDAD ACTUALIZADA
    let productosDisponibilidad = sincronizarDisponibilidadConCarrito();
    const productoDisponible = productosDisponibilidad.find(p => p.id === idBoton);
    
    // VALIDACIÓN MEJORADA - VERIFICAR SI ESTÁ DESHABILITADO
    const boton = e.currentTarget;
  if (!productoDisponible || productoDisponible.disponible <= 0) {
    Swal.fire({
        title: 'Producto agotado',
        text: 'Lo sentimos, este producto no está disponible en este momento',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
    });
    return;
}
    
    Toastify({
        text: "Producto agregado",
        duration: 3000,
        close: true,
        gravity: "top", 
        position: "right",
        stopOnFocus: true,
        style: {
          background: "linear-gradient(to right, #4fbb8cff, #3bb55aff)",
          borderRadius: "2rem",
          textTransform: "uppercase",
          fontSize: ".75rem"
        },
        offset: {
            x: '1.5rem', 
            y: '1.5rem' 
        },
        onClick: function(){} 
    }).showToast();

    const productoAgregado = productos.find(producto => producto.id === idBoton);

    if(productosEnCarrito.some(producto => producto.id === idBoton)) {
        const index = productosEnCarrito.findIndex(producto => producto.id === idBoton);
        // VALIDAR NO EXCEDER CANTIDAD MÁXIMA
        if (productosEnCarrito[index].cantidad < SEGURIDAD.CANTIDAD_MAXIMA) {
            productosEnCarrito[index].cantidad++;
        } else {
            Toastify({
                text: "Límite máximo alcanzado",
                duration: 2000,
                style: {
                    background: "linear-gradient(to right, #ff9966, #ff5e62)"
                }
            }).showToast();
            return;
        }
    } else {
        productoAgregado.cantidad = 1;
        productosEnCarrito.push(productoAgregado);
    }

    // ACTUALIZAR CARRITO Y DISPONIBILIDAD
    localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
    
    // SINCRONIZAR NUEVAMENTE PARA ACTUALIZAR DISPONIBILIDAD
    sincronizarDisponibilidadConCarrito();
    actualizarNumerito();
    
    // RECARGAR PRODUCTOS PARA ACTUALIZAR INTERFAZ
    const categoriaActiva = document.querySelector(".boton-categoria.active");
    if (categoriaActiva) {
        const categoriaId = categoriaActiva.id;
        if (categoriaId === "todos") {
            cargarProductos(productos);
        } else {
            const productosFiltrados = productos.filter(producto => producto.categoria.id === categoriaId);
            cargarProductos(productosFiltrados);
        }
    }
}

// ACTUALIZAR NUMERITO AL CARGAR
document.addEventListener('DOMContentLoaded', function() {
    actualizarNumerito();
});

// PROTECCIÓN CONTRA MANIPULACIÓN EN TIEMPO REAL
setInterval(() => {
    productosEnCarrito = sanitizarCarrito();
    sincronizarDisponibilidadConCarrito();
    actualizarNumerito();
}, 3000);