/*
  sw.js — o mínimo para o Chrome oferecer "Instalar app" (ORD-004 C6).

  ELE NÃO GUARDA DADO NENHUM DO APP, E ISSO É DE PROPÓSITO. O app mora em
  script.google.com, dentro do <iframe>; nada que venha de lá passa por aqui. Dado de dinheiro
  servido de cache é dado velho na cara de alguém — e a ORD-001 já tinha posto "modo offline" fora
  de escopo. O que este arquivo guarda é só a casca do wrapper: o próprio index.html e os ícones,
  que são estáticos e existem para o atalho abrir rápido.

  A regra que não pode ser quebrada está no `fetch`: **requisição de outra origem sai daqui sem ser
  tocada**. Sem o `return`, o service worker viraria um intermediário entre a pessoa e o servidor
  do app — exatamente o que ninguém quer entre alguém e a própria conta bancária.
*/
var CACHE = 'financeiro-casca-v1';
var CASCA = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icones/favicon.ico',
  './icones/favicon-32.png',
  './icones/icone-180.png',
  './icones/icone-192.png',
  './icones/icone-512.png',
  './icones/icone-maskable-512.png'
];

self.addEventListener('install', function (e) {
  // `addAll` falha inteiro se um arquivo faltar: cada um por si, para um ícone ausente não
  // impedir a instalação.
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CASCA.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.filter(function (n) { return n !== CACHE; })
      .map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  // Fora desta origem — script.google.com, entre outros —, o service worker não existe.
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;
  // Rede primeiro, cache como rede de segurança: a casca muda pouco, mas quando muda tem de chegar.
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia).catch(function () {}); });
      return r;
    }).catch(function () { return caches.match(e.request); })
  );
});
