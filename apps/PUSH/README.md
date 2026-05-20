# ADN66 Push — GitHub Pages

Dossier statique pour le futur système de notifications push maison ADN66.

## Pages

- `index.html` : page client avec bouton d’abonnement aux notifications.
- `admin.html` : page admin pour envoyer une notification.
- `sw.js` : Service Worker qui reçoit et affiche les notifications.
- `config.js` : configuration à compléter après création du Worker Cloudflare.

## Cibles prévues

- `apero` : Apéro de Nuit 66
- `catalan` : Apéro Catalan
- `x` : futur projet

## À faire après hébergement GitHub

1. Héberger ce dossier sur GitHub Pages.
2. Créer le Cloudflare Worker.
3. Créer la base D1.
4. Générer les clés VAPID.
5. Modifier `config.js` :
   - `WORKER_BASE_URL`
   - `VAPID_PUBLIC_KEY`

## Routes Worker attendues plus tard

- `POST /push/subscribe`
- `POST /push/unsubscribe`
- `GET /admin/push/stats`
- `POST /admin/push/send`

## Important

La page est volontairement prête mais bloquée tant que le Worker et la clé VAPID ne sont pas configurés.
Cela évite de créer de fausses inscriptions ou des erreurs incompréhensibles côté client.
