// Permite instalar el panel como app en el celular. No guarda datos viejos: siempre pide lo último.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
