/* =========================================================================
   ap.js v4 — fetch GET para GitHub Pages → Google Apps Script
   Apps Script doGet ya incluye CORS headers con "acceso: cualquier persona"
   POST se simula como GET con ?api=X&_data=JSON
   ========================================================================= */
(() => {
  const GAS_URL = (window.GAS_WEBAPP_URL && window.GAS_WEBAPP_URL.trim())
    ? window.GAS_WEBAPP_URL.trim()
    : "";

  if (!GAS_URL) { console.error("ap.js: GAS_WEBAPP_URL no definida"); }

  function qs(obj) {
    return Object.entries(obj)
      .filter(([,v]) => v !== undefined && v !== null && v !== "")
      .map(([k,v]) => encodeURIComponent(k) + "=" + encodeURIComponent(String(v)))
      .join("&");
  }

  // Todo va como GET — doGet en Code.gs maneja ambos casos
  function call(api, params) {
    const url = GAS_URL + "?" + qs({ api, ...params });
    return fetch(url, { redirect: "follow" })
      .then(r => r.json())
      .catch(err => { throw new Error("fetch error: " + err.message); });
  }

  function post(api, body) {
    // POST simulado como GET con _data= (soportado por doGet en Code.gs)
    return call(api, { _data: JSON.stringify(body) });
  }

  window.GAS = {
    getCatalogo:      ()          => call("catalogo"),
    getPedidos:       (limite=50) => call("pedidos", { limite }),
    getPedido:        (id)        => call("pedido", { id }),
    getClientes:      ()          => call("clientes"),
    getMetricas:      ()          => call("metricas"),
    validarDescuento: (codigo)    => call("validarDescuento", { codigo }),
    crearPedido:      (payload)   => post("crearPedido", payload),
    actualizarEstado: (id,estado) => post("actualizarEstado", { id, estado }),
    reabastecerStock: (id,cant)   => post("reabastecerStock", { id, cantidad: cant }),
  };

  console.log("ap.js v4 listo. URL:", GAS_URL);
})();
