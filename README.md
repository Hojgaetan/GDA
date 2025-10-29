# Gestion d'Absences des Employés

Application web pour enregistrer les absences quotidiennes des employés, visualiser des statistiques, exporter en CSV et gérer le référentiel des employés. Interface moderne, responsive, thème clair/sombre, et persistance locale côté navigateur par défaut. Une API Node/Express + SQLite est fournie en option pour une persistance serveur locale.

Créée par [Joel Gaetan HASSAM OBAH](https://joelhassam.com/).

---

## Sommaire
- Aperçu du projet
- Fonctionnalités
- Stack technique
- Prérequis
- Installation
- Démarrage rapide
- Scripts NPM
- API locale (optionnelle)
- Modèle de données
- Déploiement (Netlify)
- Dépannage (FAQ)
- Roadmap
- Licence & Crédits

---

## Aperçu du projet
- SPA React + Vite avec TypeScript
- UI Tailwind CSS (chargé via CDN) et Chart.js (via CDN) pour les graphiques
- Données persistées en `localStorage` par défaut, sans backend requis pour la version déployable
- API locale optionnelle (Express + SQLite) incluse pour une future persistance serveur

## Fonctionnalités
- Pointage journalier des absences
  - Sélection d'un employé, type d'absence, heures de début/fin, notes
  - Validation (ex: heure de début < heure de fin)
  - Liste du jour pour l'employé sélectionné avec calcul automatique de durée
- Dashboard et filtres
  - Filtres par employé, type, période (sélecteurs de dates + presets 7 jours, ce mois, mois dernier)
  - Graphiques: absences par type (camembert), absences par employé (barres horizontales)
  - Historique des absences trié par date
- Gestion des employés
  - Création, édition, suppression
  - Suppression cascade des absences d’un employé si backend utilisé
- Export CSV
  - Export des absences filtrées vers Excel/Sheets (CSV UTF-8 avec BOM)
- Thème clair/sombre
  - Détection automatique (prefers-color-scheme) + bascule manuelle
- Responsive et accessible

## Stack technique
- Frontend: React 19, Vite 6, TypeScript
- UI: Tailwind CSS (CDN), composants utilitaires, icônes personnalisées
- Graphiques: Chart.js (CDN)
- Persistance côté client: `localStorage` (voir `services/absenceService.ts`)
- Backend optionnel: Node.js + Express 4 + SQLite3 (voir `server/index.js`)
- Déploiement: Netlify (SPA) avec `netlify.toml`

## Prérequis
- Node.js (LTS recommandé)
- npm

## Installation
```bash
npm install
```

## Démarrage rapide
Vous avez deux options:

1) 100% Frontend (recommandé, données en localStorage)
```bash
npm run dev
```
Ouvrez l’URL indiquée par Vite (ex: http://localhost:5173).

2) Avec API locale (SQLite) — optionnel
- Initialise la base et démarre l’API sur http://localhost:3001
```bash
npm run setup:db   # crée/seed data/app.db
npm run server     # lance l’API Express
```
- Démarrer le frontend connecté à l’API: créez un fichier `.env.local` à la racine avec:
```bash
VITE_API_URL=http://localhost:3001/api
```
Puis lancez:
```bash
npm run dev
```
Remarque importante: l’UI basculera automatiquement sur l’API dès que `VITE_API_URL` est défini. Sans cette variable, le stockage reste `localStorage`.

## Scripts NPM
- `dev`: démarre Vite en mode développement
- `build`: build de production Vite
- `preview`: prévisualisation locale du build
- `server`: démarre l’API Express (http://localhost:3001)
- `setup:db`: initialise la base SQLite (création tables + seed employés)
- `db:reset`: réinitialise la base (supprime puis `setup:db`)
- `dev:all`: lance serveur API + web (en parallèle)
- `deploy:netlify`: build puis déploiement Netlify (prod) vers `dist`

## API locale (optionnelle)
Base: `http://localhost:3001/api`

Endpoints:
- `GET /health` → état du serveur

Employés
- `GET    /employees` → liste des employés
- `POST   /employees` → body: `{ name, role }`
- `PUT    /employees/:id` → body: `{ name, role }`
- `DELETE /employees/:id`

Absences
- `GET    /absences?employeeId=...` → liste des absences (filtrable par employé)
- `POST   /absences` → body: `{ employeeId, date (YYYY-MM-DD), type, startTime (HH:MM), endTime (HH:MM), notes? }`
- `DELETE /absences/:id`

Exemples (zsh):
```bash
# Initialiser la base
npm run setup:db

# Vérifier l’API
npm run server &
curl -sS http://localhost:3001/api/health | cat

# Lister les employés
curl -sS http://localhost:3001/api/employees | cat
```

## Modèle de données
TypeScript (extraits de `types.ts`):
```ts
export interface Employee {
  id: string;
  name: string;
  role: string;
}

export const ABSENCE_TYPES = ['Maladie', 'Congés Payés', 'Personnel', 'Non Justifiée', 'Retard'] as const;
export type AbsenceType = typeof ABSENCE_TYPES[number];

export interface AbsenceRecord {
  id: string;
  employeeId: string;
  date: string;     // YYYY-MM-DD
  type: AbsenceType;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  notes?: string;
}
```

## Déploiement (Netlify)
- Config: `netlify.toml`
- Dossier de publication: `dist`
- Commande de build: `npm run build`
- Redirection SPA configurée

Étapes rapides:
1. Pousser le code sur un dépôt Git.
2. Créer un site sur Netlify depuis le dépôt.
3. Build command: `npm run build`, Publish directory: `dist`.
4. Déployer.

Note: la version Netlify utilise `localStorage` et ne nécessite pas l’API.

## Dépannage (FAQ)
- Les graphiques ne s’affichent pas
  - Vérifiez que Chart.js est chargé (via CDN dans `index.html`). Certains bloqueurs peuvent interférer.
- Données incohérentes / besoin de repartir de zéro
  - Vider le localStorage du navigateur ou supprimer `data/app.db` et relancer `npm run setup:db` (si vous utilisez l’API).
- Conflit de ports
  - Vite par défaut: 5173, API: 3001. Arrêter les services en conflit ou changer de port.
- Build échoue
  - Supprimer `node_modules` et réinstaller: `rm -rf node_modules && npm install`.

## Roadmap
- Câbler l’UI au backend Express (remplacer `localStorage` par API)
- Rapports & statistiques avancés (exports PDF, agrégations)
- Authentification et rôles
- Import CSV/Excel

## Licence & Crédits
- Licence: non spécifiée
- Auteur: [Joel Gaetan HASSAM OBAH](https://joelhassam.com/)
