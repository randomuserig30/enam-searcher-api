# OathNet API Integration

## Setup

### 1. Generate ton API Key
- Va sur https://oathnet.org/dashboard?tab=account
- Clique "Generate API Key"
- Copie la clé

### 2. Créer le fichier .env
- Copie `.env.example` et renomme-le en `.env`
- Remplace `ta_cle_api_ici` par ta vraie clé API

### 3. Lancer le backend
```bash
npm start
```
Le serveur démarre sur http://localhost:3000

### 4. Ouvrir le frontend
Ouvre `index.html` dans ton navigateur (double-clic ou Live Server VS Code).

## Fonctionnement
- Les recherches prédéfinies (Rayan Vigneron, Vincent Haliona, etc.) affichent toujours les données en dur.
- Toutes les autres recherches passent par l'API OathNet en temps réel.
- Le backend sert de proxy : il appelle OathNet avec ta clé secrète (cachée dans .env) et renvoie les résultats au frontend.
