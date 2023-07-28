const pdfUrl = "pdf/pdf.pdf"; // Reemplaza con la ruta del archivo PDF

// Función para extraer el contenido de una página con filas y columnas
async function extractRowsAndColumnsFromPage(page) {
  const textContent = await page.getTextContent();
  const rows = [];

  for (const item of textContent.items) {
    const { str, transform } = item;
    const row = { text: str.trim(), x: transform[4], y: transform[5] };

    // Puedes agregar más lógica aquí para identificar columnas específicas
    // basándote en las coordenadas (x, y) de cada texto.

    rows.push(row);
  }

  return rows;
}

function sanitizeRow(row) {
  if (typeof row === "number") row = String(row);

  // Eliminar espacios en blanco al principio y al final del row
  const sanitizedRow = row.trim();

  // Comprobar si el row resultante está vacío o no contiene contenido significativo
  if (sanitizedRow === "") {
    return false; // Retornar null para indicar que el row no es válido
  }

  return sanitizedRow;
}

// Función para procesar todas las páginas del PDF
async function processPDF(pdfUrl) {
  const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
  const numPages = pdfDoc.numPages;
  const results = [];

  for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
    const page = await pdfDoc.getPage(pageNumber);
    const rows = await extractRowsAndColumnsFromPage(page);

    rows.forEach((row, index) => {
      if (/^[A-Z]{2,3}-[A-Za-z0-9]+/g.test(row.text)) {
        let description = rows[index + 2].text,
          publicPrice = rows[index + 4].text,
          netPrice = rows[index + 6].text;

        results.push({
          name: sanitizeRow(row.text),
          description: sanitizeRow(description),
          publicPrice: sanitizeRow(publicPrice),
          netPrice: sanitizeRow(netPrice),
        });
      } else return;
    });
  }

  return results;
}

const copyToClipboard = (value) => {
  if (navigator && navigator.clipboard && navigator.clipboard.writeText)
    return navigator.clipboard.writeText(value);
};

const generateTemplate = async (rows) => {
  try {
    let template = "";

    let btnConfig = document.querySelector("#copy-btn-checkbox");

    if (btnConfig.checked) {
      document.querySelector("#target").addEventListener("click", (e) => {
        let target = e.target;

        if (
          target.tagName === "BUTTON" &&
          target.classList.contains("copy-btn")
        ) {
          copyToClipboard(target.getAttribute("copy-value"));
          target.textContent = "Copiado";
        }
      });
    }

    rows.forEach((row) => {
      template += `<tr><th>${row.name}</th><th>${
        row.description
      }</th><th class="d-flex justify-content-evenly align-items-center">${
        row.publicPrice
      } ${
        btnConfig.checked
          ? `<button class="btn btn-warning copy-btn" copy-value="${row.publicPrice}">Copiar</button>`
          : ""
      }</th><th>${row.netPrice}</th></tr>`;
    });

    return template;
  } catch (error) {
    return `<p>Error al cargar PDF ${error}</p>`;
  }
};

window.addEventListener("DOMContentLoaded", () => {
  const target = document.querySelector("#target");
  const loadBtn = document.querySelector("#load-btn");
  const searchBtn = document.querySelector("#search-btn");
  const input = document.querySelector("#input");

  //Temporal
  const tmpCheckbox = document.querySelector("#description-btn-checkbox");
  tmpCheckbox.addEventListener("click", () => {alert("Función no disponible por el momento");});

  
  loadBtn.addEventListener("click", async () => {
    target.innerHTML = await generateTemplate(await processPDF(pdfUrl));
  });

  searchBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    let results = await processPDF(pdfUrl);

    results = results.filter((value) => {
      return value.name
        .toLowerCase()
        .includes(input.value.toLowerCase().trim());
    });

    try {
      results.length > 0
        ? (target.innerHTML = await generateTemplate(results))
        : (target.innerHTML = `<div class="alert alert-danger mt-3" role="alert">¡No tenemos de esa padrino!</div>`);
    } catch (error) {
      target.innerHTML = error.message;
    }
  });
});
