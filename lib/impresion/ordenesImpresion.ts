// Utilidad para imprimir órdenes directamente a la impresora térmica sin diálogos emergentes

export interface ItemImpresion {
  nombre: string
  cantidad: number
  notas?: string
}

export interface DatosImpresionOrden {
  numeroMesa?: number
  nombreMesa?: string
  numeroPedido: number
  items: ItemImpresion[]
  horaInicio: Date
}

export const imprimirOrden = (datos: DatosImpresionOrden) => {
  // Crear elemento iframe oculto para impresión
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (!iframeDoc) return

  // Formatear hora
  const horaFormato = datos.horaInicio.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Crear contenido HTML para impresión
  const contenidoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Poppins', sans-serif;
          padding: 5px 8px;
          margin: 0;
          width: 80mm;
          font-size: 25px;
          line-height: 1.2;
        }
        @page {
          margin: 0;
          padding: 0;
        }
        .encabezado {
          text-align: center;
          font-weight: bold;
          font-size: 24px;
          margin-bottom: 8px;
          border-bottom: 2px solid #000;
          padding-bottom: 5px;
        }
        .info-orden {
          margin-bottom: 8px;
          font-size: 18px;
          line-height: 1.3;
        }
        .info-orden div {
          margin: 2px 0;
        }
        .etiqueta {
          font-weight: bold;
          display: inline-block;
          width: 70px;
        }
        .valor {
          display: inline;
        }
        .linea {
          border-bottom: 1px dashed #000;
          margin: 6px 0;
        }
        .items {
          margin: 8px 0;
        }
        .item {
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #ddd;
        }
        .item-nombre {
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 2px;
        }
        .item-cantidad {
          font-size: 16px;
          margin-bottom: 1px;
        }
        .item-notas {
          font-size: 14px;
          color: #555;
          font-style: italic;
          margin-top: 1px;
        }
        .pie {
          text-align: center;
          font-size: 14px;
          margin-top: 6px;
          border-top: 2px solid #000;
          padding-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="encabezado">QUEEN BROASTER</div>

      <div class="info-orden">
        <div>
          <span class="etiqueta">PEDIDO:</span>
          <span class="valor">#${datos.numeroPedido}</span>
        </div>
        ${datos.numeroMesa ? `
        <div>
          <span class="etiqueta">MESA:</span>
          <span class="valor">M ${String(datos.numeroMesa).padStart(2, '0')}</span>
        </div>
        ` : ''}
        ${datos.nombreMesa && !datos.numeroMesa ? `
        <div>
          <span class="etiqueta">MESA:</span>
          <span class="valor">${datos.nombreMesa}</span>
        </div>
        ` : ''}
        <div>
          <span class="etiqueta">HORA:</span>
          <span class="valor">${horaFormato}</span>
        </div>
      </div>

      <div class="linea"></div>

      <div class="items">
        ${datos.items
          .map(
            item => `
          <div class="item">
            <div class="item-cantidad">${item.cantidad}x</div>
            <div class="item-nombre">${item.nombre}</div>
            ${item.notas ? `<div class="item-notas">${item.notas}</div>` : ''}
          </div>
        `
          )
          .join('')}
      </div>

      <div class="pie">PARA COCINA</div>
    </body>
    </html>
  `

  iframeDoc.documentElement.innerHTML = contenidoHTML

  // Esperar a que cargue y luego imprimir
  setTimeout(() => {
    iframe.contentWindow?.print()
    // Limpiar después de imprimir
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 500)
  }, 250)
}
