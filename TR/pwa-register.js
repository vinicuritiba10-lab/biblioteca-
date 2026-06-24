// registra o service worker do PWA "Libro" em qualquer pagina que incluir este script
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function (erro) {
      console.log("Nao foi possivel registrar o service worker:", erro);
    });
  });
}
