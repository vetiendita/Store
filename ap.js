/* =========================================================================
   AP / STUB for Apps Script calls (google.script.run) using fetch()
   Compatible con GitHub Pages.

   Usage:
   1) Set GAS_WEBAPP_URL to your deployed Apps Script Web App URL.
   2) Keep existing code that calls google.script.run...
   ========================================================================= */

(() => {
  // Cambia esta URL por la de tu Web App desplegada (Apps Script → Deploy → Web app)
  // Debe ser tipo: https://script.google.com/macros/s/<ID>/exec
  const GAS_WEBAPP_URL = window.GAS_WEBAPP_URL || "https://script.google.com/macros/s/AKfycby-oCvdlGWkFJaepMz5BKExa1mfVAhiW1Jg5wC5ry_qTNDRqntT10ijBAcPiX3Mpl_szQ/exec";
  const GAS_API_TOKEN = window.GAS_API_TOKEN || "estonoesunaprueba01";

  function buildQuery_(obj) {
    return Object.keys(obj)
      .filter(k => obj[k] !== undefined && obj[k] !== null && obj[k] !== "")
      .map(k => encodeURIComponent(k) + "=" + encodeURIComponent(String(obj[k])))
      .join("&");
  }

  async function fetchJSON_(url, options) {
    const res = await fetch(url, options);
    const txt = await res.text();
    try {
      return JSON.parse(txt);
    } catch (e) {
      // Si Apps Script devolvió HTML/otro en error, igual devolvemos algo útil.
      return { ok: false, error: txt || String(e) };
    }
  }

  function callApiGet_(action, query) {
    const qs = buildQuery_({ api: action, token: GAS_API_TOKEN, ...(query || {}) });
    const url = GAS_WEBAPP_URL + "?" + qs;
    return fetchJSON_(url, { method: "GET" });
  }

  function callApiPost_(action, body) {
    const url = GAS_WEBAPP_URL + "?" + buildQuery_({ api: action, token: GAS_API_TOKEN });
    return fetchJSON_(url, {
      method: "POST",
      // Usar text/plain evita preflight OPTIONS por CORS.
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(body || {})
    });
  }

  // Mapeo: nombre de función (como la llama el frontend) -> endpoint API
  function dispatch_(fnName, args) {
    const name = String(fnName || "").trim();

    // GET
    if (name === "getCatalogo") return callApiGet_("catalogo", {});
    if (name === "getInventario") return callApiGet_("inventario", {});
    if (name === "getPedidosRecientes") return callApiGet_("pedidosRecientes", { limite: args[0] });
    if (name === "getPedidoPorID") return callApiGet_("pedidoPorID", { id: args[0] });
    if (name === "getClientesParaDashboard") return callApiGet_("clientesDashboard", {});
    if (name === "getDashboardMetricas") return callApiGet_("dashboardMetricas", {});
    if (name === "generarReporteMensual") return callApiGet_("generarReporteMensual", { mes: args[0], anio: args[1] });
    if (name === "validarDescuento") return callApiGet_("validarDescuento", { codigo: args[0] });

    // POST
    if (name === "crearPedido") return callApiPost_("crearPedido", args[0]);
    if (name === "actualizarEstadoConPDF") {
      return callApiPost_("actualizarEstadoConPDF", {
        pedidoID: args[0],
        nuevoEstado: args[1],
        enviarPDF: args[2]
      });
    }
    if (name === "reabastecerStock") {
      return callApiPost_("reabastecerStock", {
        categoria: args[0],
        id: args[1],
        cantidad: args[2]
      });
    }
    if (name === "exportarReportePDF") {
      return callApiPost_("exportarReportePDF", { mes: args[0], anio: args[1] });
    }

    return Promise.resolve({ ok: false, error: "Function not mapped in ap.js: " + name });
  }

  // Stub de google.script.run con la API de encadenamiento original:
  // google.script.run.withSuccessHandler(fn).withFailureHandler(fn).getCatalogo()
  function createGoogleScriptRunStub() {
    let successHandler = null;
    let failureHandler = null;

    const runnerProxy = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "withSuccessHandler") {
            return (fn) => {
              successHandler = fn;
              return runnerProxy;
            };
          }
          if (prop === "withFailureHandler") {
            return (fn) => {
              failureHandler = fn;
              return runnerProxy;
            };
          }

          // prop es el nombre de la función a ejecutar.
          return (...args) => {
            const fnName = prop;
            return dispatch_(fnName, args)
              .then((res) => {
                if (successHandler) successHandler(res);
                successHandler = null;
                failureHandler = null;
                return res;
              })
              .catch((err) => {
                if (failureHandler) failureHandler(err);
                successHandler = null;
                failureHandler = null;
              });
          };
        }
      }
    );

    return runnerProxy;
  }

  // Creamos el namespace esperado por tu frontend (si no existe)
  if (!window.google) window.google = {};
  if (!window.google.script) window.google.script = {};
  window.google.script.run = createGoogleScriptRunStub();
})();

