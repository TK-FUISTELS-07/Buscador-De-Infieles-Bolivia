let datos = [];

const sheetSelect = document.getElementById("sheetSelect");
const searchInput = document.getElementById("search");
const resultsList = document.getElementById("results");
const statusBox = document.getElementById("status");
const themeToggle = document.getElementById("themeToggle");


/* TEMA OSCURO */
document.body.dataset.theme = localStorage.getItem("theme") || "light";
themeToggle.textContent =
    document.body.dataset.theme === "dark" ? "☀️" : "🌙";

themeToggle.addEventListener("click", () => {
    const nuevoTema =
        document.body.dataset.theme === "light" ? "dark" : "light";

    document.body.dataset.theme = nuevoTema;
    localStorage.setItem("theme", nuevoTema);
    themeToggle.textContent = nuevoTema === "dark" ? "☀️" : "🌙";
});


/* STATUS */
function mostrarStatus(mensaje, tipo) {
    statusBox.textContent = mensaje;
    statusBox.className = `status-${tipo}`;
    statusBox.style.display = "block";
}


/* LECTOR DE ARCHIVOS LOCALES */
async function leerArchivoLocal(ruta) {
    const [archivo, hoja] = ruta.split("|");
    const extension = archivo.split(".").pop().toLowerCase();

    const res = await fetch(archivo);
    if (!res.ok) throw new Error("❌ Archivo no encontrado: " + archivo);

    const buffer = await res.arrayBuffer();
    const texto = new TextDecoder().decode(buffer);

    /* JSON */
    if (extension === "json") {
        const json = JSON.parse(texto);
        return Array.isArray(json) ? json : Object.values(json);
    }

    /* CSV */
    if (extension === "csv") {
        return texto.trim().split("\n").map(f => f.split(","));
    }

    /* TXT */
    if (extension === "txt") {
        return texto.trim().split("\n").map(l => [l]);
    }

    /* XLSX */
    if (extension === "xlsx") {
        const workbook = XLSX.read(buffer, { type: "array" });

        const sheetName = hoja && workbook.SheetNames.includes(hoja)
            ? hoja
            : workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error("❌ La hoja '" + hoja + "' no existe.");

        return XLSX.utils.sheet_to_json(sheet, { header: 1 });
    }

    throw new Error("❌ Formato no soportado.");
}


/* CARGAR DATOS */
async function cargarDatos(valor) {
    mostrarStatus("Cargando datos...", "loading");
    resultsList.innerHTML = "";

    try {
        /* 1. Base local */
        if (valor.startsWith("base_de_datos_locales")) {
            datos = await leerArchivoLocal(valor);
            mostrarStatus("Base local cargada ✔", "ok");
            mostrarResultados(datos);
            return;
        }

        /* 2. Web App / JSON URL */
        if (valor.startsWith("http")) {
            const res = await fetch(valor);
            if (!res.ok) throw new Error("❌ No se pudo acceder al enlace.");
            const data = await res.json();
            datos = Array.isArray(data) ? data : Object.values(data);
            mostrarStatus("Datos cargados desde Web App ✔", "ok");
            mostrarResultados(datos);
            return;
        }

        /* 3. Google Sheets (ID|SheetName) */
        const [sheetID, sheetName] = valor.split("|");
        const url =
            `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("❌ Google Sheet no accesible.");

        const texto = await res.text();
        const jsonData = JSON.parse(texto.substr(47).slice(0, -2));

        datos = jsonData.table.rows.map(r =>
            r.c.map(cell => (cell ? cell.v : ""))
        );

        mostrarStatus("Google Sheet cargado ✔", "ok");
        mostrarResultados(datos);

    } catch (err) {
        console.error(err);
        mostrarStatus(err.message, "error");
        datos = [];
        mostrarResultados([]);
    }
}


/* MOSTRAR RESULTADOS */
function mostrarResultados(results) {
    resultsList.innerHTML = "";

    if (!results || results.length === 0) {
        resultsList.innerHTML = "<li>No hay resultados.</li>";
        return;
    }

    results.forEach((fila, index) => {
        const li = document.createElement("li");

        // Resalta coincidencias si quieres (opcional)
        li.textContent = fila.join(" | ");

        resultsList.appendChild(li);

        // Agregar clase show con un pequeño delay para animación
        setTimeout(() => {
            li.classList.add("show");
        }, index * 50); // efecto escalonado
    });
}


/* BUSCADOR */
searchInput.addEventListener("input", e => {
    const query = e.target.value.toLowerCase();

    const filtrado = datos.filter(fila =>
        fila.join(" ").toLowerCase().includes(query)
    );

    mostrarResultados(filtrado);
});


/* CAMBIO DE BASE */
sheetSelect.addEventListener("change", e => {
    cargarDatos(e.target.value);
});


/* CARGA AUTOMÁTICA AL ENTRAR */
cargarDatos(sheetSelect.value);
