self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {}
  e.waitUntil(self.registration.showNotification(data.title || "Moni", {
    body: data.body || "",
    icon: "/Moni.png",
    badge: "/Moni.png",
  }))
})

self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  e.waitUntil(clients.openWindow("/dashboard"))
})
