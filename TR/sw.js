// service worker do PWA "Libro"
// cacheia apenas os arquivos estaticos do front-end (html, css, js, imagens).
// chamadas de API (login, livros, emprestimos, etc.) sempre vao direto para a rede,
// para garantir que os dados mostrados sejam sempre atuais.
//
// estrategia: "network-first" - sempre tenta buscar a versao mais nova na rede
// primeiro. So usa o cache se o celular estiver sem internet. Isso evita o app
// ficar "travado" numa versao antiga depois que o site e atualizado.
//
// IMPORTANTE: sempre que o codigo do site for atualizado, troque o numero da
// versao abaixo (v2 -> v3 -> v4...). Isso forca o celular a esquecer o cache
// antigo e buscar os arquivos novos.

const CACHE_NAME = "libro-cache-v8";

const ARQUIVOS_PARA_CACHEAR = [
  "/login/index.html",
  "/login/style.css",
  "/login/login.js",
  "/login/cadastro.html",
  "/login/cadastro.css",
  "/login/cadastro.js",
  "/home/home.html",
  "/home/home.css",
  "/home/home.js",
  "/img/g10.png",
  "/img/icon-192.png",
  "/img/icon-512.png",
  "/manifest.json",
  "/tokens.css",
  "/toast.css",
  "/toast.js",
  "/theme.css",
  "/theme-toggle.js",
  "/password-toggle.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_PARA_CACHEAR))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // nunca intercepta chamadas de API: deixa sempre ir para a rede
  const ehArquivoEstatico = /\.(html|css|js|png|jpg|jpeg|svg|ico|json)$/.test(url.pathname);
  if (!ehArquivoEstatico) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((respostaRede) => {
        // deu certo buscar na rede: atualiza o cache com a versao mais nova
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, respostaRede.clone());
          return respostaRede;
        });
      })
      .catch(() => {
        // sem internet: usa o que tiver salvo no cache, se existir
        return caches.match(event.request);
      })
  );
});
