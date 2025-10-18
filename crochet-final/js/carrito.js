// ==================== SISTEMA DE SEGURIDAD ====================
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
    
    // Asegurar precios mínimos y cantidades razonables
    carrito = carrito.map(producto => ({
        ...producto,
        precio: Math.max(producto.precio, SEGURIDAD.PRECIO_MINIMO),
        cantidad: Math.max(SEGURIDAD.CANTIDAD_MINIMA, Math.min(producto.cantidad, SEGURIDAD.CANTIDAD_MAXIMA))
    }));
    
    localStorage.setItem("productos-en-carrito", JSON.stringify(carrito));
    return carrito;
}

// 🔄 FUNCIÓN CLAVE: RESTAURAR DISPONIBILIDAD AL ELIMINAR
function restaurarDisponibilidad(id, cantidad) {
    let productosDisponibilidad = JSON.parse(localStorage.getItem("productos-disponibilidad")) || [];
    const productoRestaurar = productosDisponibilidad.find(p => p.id === id);
    
    if (productoRestaurar) {
        // Obtener el producto original del JSON para saber el stock máximo
        fetch("js/productos.json")
            .then(response => response.json())
            .then(productosOriginales => {
                const productoOriginal = productosOriginales.find(p => p.id === id);
                if (productoOriginal) {
                    // Calcular nueva disponibilidad sin exceder el stock original
                    const productosEnCarrito = JSON.parse(localStorage.getItem("productos-en-carrito")) || [];
                    const productoEnCarrito = productosEnCarrito.find(p => p.id === id);
                    const cantidadEnCarrito = productoEnCarrito ? productoEnCarrito.cantidad : 0;
                    
                    productoRestaurar.disponible = Math.min(
                        productoOriginal.disponible,
                        productoOriginal.disponible - cantidadEnCarrito + cantidad
                    );
                    
                    localStorage.setItem("productos-disponibilidad", JSON.stringify(productosDisponibilidad));
                }
            });
    }
}

// ==================== CÓDIGO ORIGINAL MEJORADO ====================

// Cargar productos del carrito (SANITIZADOS)
let productosEnCarrito = sanitizarCarrito();

// Elementos del DOM
const contenedorCarritoVacio = document.querySelector("#carrito-vacio");
const contenedorCarritoProductos = document.querySelector("#carrito-productos");
const contenedorCarritoAcciones = document.querySelector("#carrito-acciones");
const contenedorCarritoComprado = document.querySelector("#carrito-comprado");
const botonVaciar = document.querySelector("#carrito-acciones-vaciar");
const totalElemento = document.querySelector("#total");

// Cargar carrito al iniciar
cargarProductosCarrito();

function cargarProductosCarrito() {
    // VERIFICAR SEGURIDAD ANTES DE MOSTRAR
    productosEnCarrito = sanitizarCarrito();
    
    if (productosEnCarrito.length > 0) {
        // MOSTRAR productos
        contenedorCarritoVacio.classList.add("disabled");
        contenedorCarritoProductos.classList.remove("disabled");
        contenedorCarritoAcciones.classList.remove("disabled");
        contenedorCarritoComprado.classList.add("disabled");

        contenedorCarritoProductos.innerHTML = "";

        productosEnCarrito.forEach(producto => {
            const div = document.createElement("div");
            div.classList.add("carrito-producto");
            div.innerHTML = `
                <img class="carrito-producto-imagen" src="${producto.imagen}" alt="${producto.titulo}">
                <div class="carrito-producto-titulo">
                    <small>Título</small>
                    <h3>${producto.titulo}</h3>
                </div>
                <div class="carrito-producto-cantidad">
                    <small>Cantidad</small>
                    <p>${producto.cantidad}</p>
                </div>
                <div class="carrito-producto-precio">
                    <small>Precio</small>
                    <p>Bs. ${producto.precio}</p>
                </div>
                <div class="carrito-producto-subtotal">
                    <small>Subtotal</small>
                    <p>Bs. ${producto.precio * producto.cantidad}</p>
                </div>
                <button class="carrito-producto-eliminar" data-id="${producto.id}" data-cantidad="${producto.cantidad}">
                    <i class="bi bi-trash-fill"></i>
                </button>
            `;
            contenedorCarritoProductos.append(div);
        });

        // Agregar event listeners a botones eliminar
        document.querySelectorAll(".carrito-producto-eliminar").forEach(boton => {
            boton.addEventListener("click", (e) => {
                const id = e.currentTarget.getAttribute("data-id");
                const cantidad = parseInt(e.currentTarget.getAttribute("data-cantidad"));
                eliminarDelCarrito(id, cantidad);
            });
        });

        actualizarTotal();
        
    } else {
        // MOSTRAR carrito vacío
        contenedorCarritoVacio.classList.remove("disabled");
        contenedorCarritoProductos.classList.add("disabled");
        contenedorCarritoAcciones.classList.add("disabled");
        contenedorCarritoComprado.classList.add("disabled");
    }
}

// 🔄 FUNCIÓN MEJORADA: ELIMINAR DEL CARRITO
function eliminarDelCarrito(id, cantidad) {
    // RESTAURAR DISPONIBILIDAD PRIMERO
    restaurarDisponibilidad(id, cantidad);
    
    // FILTRAR EL PRODUCTO A ELIMINAR
    productosEnCarrito = productosEnCarrito.filter(producto => producto.id !== id);
    
    // ACTUALIZAR LOCALSTORAGE
    localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
    
    // MOSTRAR NOTIFICACIÓN
    Toastify({
        text: "Producto eliminado",
        duration: 2000,
        gravity: "top",
        position: "right",
        style: {
            background: "linear-gradient(to right, #ff5f6d, #ffc371)",
            borderRadius: "10px"
        }
    }).showToast();
    
    // RECARGAR LA VISTA DEL CARRITO
    cargarProductosCarrito();
}

function actualizarTotal() {
    const total = productosEnCarrito.reduce((acc, producto) => {
        return acc + (producto.precio * producto.cantidad);
    }, 0);
    
    if (totalElemento) {
        totalElemento.textContent = `Bs. ${total}`;
    }
}

// EVENT LISTENER PARA VACIAR CARRITO
if (botonVaciar) {
    botonVaciar.addEventListener("click", vaciarCarrito);
}

// 🔄 FUNCIÓN MEJORADA: VACIAR CARRITO
function vaciarCarrito() {
    if (productosEnCarrito.length > 0) {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "Se eliminarán todos los productos del carrito",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, vaciar carrito',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                // RESTAURAR TODA LA DISPONIBILIDAD
                productosEnCarrito.forEach(productoCarrito => {
                    restaurarDisponibilidad(productoCarrito.id, productoCarrito.cantidad);
                });
                
                // LIMPIAR CARRITO
                productosEnCarrito = [];
                localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
                
                // RECARGAR VISTA
                cargarProductosCarrito();
                
                Swal.fire(
                    '¡Carrito vacío!',
                    'Todos los productos han sido eliminados',
                    'success'
                );
            }
        });
    }
}

// PROTECCIÓN EN TIEMPO REAL
setInterval(() => {
    productosEnCarrito = sanitizarCarrito();
    cargarProductosCarrito();
}, 3000);