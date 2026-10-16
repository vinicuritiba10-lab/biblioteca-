// registra o service worker do PWA "Libro" em qualquer pagina que incluir este script.
// O endereco do sw.js e calculado a partir deste arquivo, entao funciona tanto na raiz
// de um dominio quanto numa subpasta (como no GitHub Pages: usuario.github.io/projeto/).
(function () {
  if (!("serviceWorker" in navigator) || !document.currentScript) return;

  var pastaDoSite = new URL("./", document.currentScript.src);

  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register(new URL("sw.js", pastaDoSite).href, { scope: pastaDoSite.href })
      .catch(function (erro) {
        console.log("Nao foi possivel registrar o service worker:", erro);
      });
  });
})();
