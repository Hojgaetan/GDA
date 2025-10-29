<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1HZG3oFEOVYi2w8vkVxLASrdVCpfo_LTB

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## Base de données locale (SQLite)

Une API Node/Express avec SQLite est incluse pour persister localement les employés et les absences.

- Fichier de base de données: `data/app.db`
- Démarrage API: `npm run server` (http://localhost:3001)
- Initialisation/seed de la base: `npm run setup:db`
- Réinitialisation totale: `npm run db:reset`
- Lancer front + API ensemble: `npm run dev:all`

Endpoints principaux:
- `GET    /api/health` → état du serveur
- `GET    /api/employees` → liste des employés
- `POST   /api/employees` → { name, role }
- `PUT    /api/employees/:id` → { name, role }
- `DELETE /api/employees/:id`
- `GET    /api/absences?employeeId=...` → liste des absences
- `POST   /api/absences` → { employeeId, date (YYYY-MM-DD), type, startTime (HH:MM), endTime (HH:MM), notes? }
- `DELETE /api/absences/:id`

Exemples (macOS/zsh):

```bash
# Initialiser la base (crée data/app.db et seed les employés)
npm run setup:db

# Démarrer l'API en local
npm run server

# Vérifier la santé
echo; curl -sS http://localhost:3001/api/health | jq .

# Lister les employés
curl -sS http://localhost:3001/api/employees | jq .
```

Note: Le dossier `data/` et les fichiers `*.db` sont ignorés par git.

---

## Déployer sur Netlify

Ce projet est une application Vite + React (SPA) qui peut être déployée telle quelle sur Netlify.

- Fichier de config: `netlify.toml`
- Dossier de publication: `dist`
- Commande de build: `npm run build`
- Redirection SPA: `/*` → `/index.html` (status 200)

Étapes rapides:

1. Pousser votre code sur GitHub/GitLab/Bitbucket.
2. Sur Netlify, créer un nouveau site depuis le dépôt.
3. Paramètres de build:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Déployer.

Localmente, vous pouvez tester le build:

```bash
npm ci
npm run build
npx serve dist
```

Notes:
- Les données sont stockées dans `localStorage` (voir `services/absenceService.ts`). Aucune API distante n’est requise pour la version Netlify actuelle.
- Si vous souhaitez persister côté serveur, vous pouvez migrer l’API Express vers des Functions Netlify (`netlify/functions`) ou un backend externe.
