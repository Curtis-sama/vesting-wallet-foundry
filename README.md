# OpenComply

**Free, open-source SOC 2 readiness workspace.** Track controls, evidence, policies, risks, vendors and people, with no account, no server and no subscription.

**Espace de préparation SOC 2 gratuit et open source.** Suivez vos contrôles, preuves, politiques, risques, fournisseurs et collaborateurs, sans compte, sans serveur et sans abonnement.

---

## 🇫🇷 Français

### Pourquoi ce projet

Les entreprises américaines demandent presque toujours un rapport **SOC 2** avant de signer avec un fournisseur SaaS. Les plateformes qui aident à s'y préparer sont parmi les plus financées du capital-risque :

- **Vanta** : 150 M$ levés en série D, valorisation de 4,15 Md$, environ 300 M$ de revenu annuel estimé en 2026.
- **Drata** : valorisé 2 Md$ en 2022.
- **Comp AI** : 34 M$ levés en septembre 2026.

Ces outils coûtent souvent **10 000 à 50 000 $ par an**, hors du budget d'une jeune startup. OpenComply couvre la partie organisation et suivi gratuitement. Le détail des recherches est dans [`docs/RECHERCHE.md`](docs/RECHERCHE.md).

### Fonctionnalités

- **49 contrôles SOC 2** rédigés en langage clair et reliés aux Trust Services Criteria (CC1 à CC9, Availability, Confidentiality), avec des conseils et des exemples de preuves.
- **Preuves** : liens vers vos documents (Drive, Notion, tickets…) avec une date, et une alerte quand une preuve a plus d'un an.
- **11 modèles de politiques** (sécurité, accès, changements, incidents, risques, fournisseurs, continuité, données, vulnérabilités, RH, usage acceptable). Le nom de l'entreprise est rempli automatiquement, et chaque politique s'édite en Markdown, s'approuve, s'exporte en `.md` ou s'imprime en PDF.
- **Registre des risques** avec score (probabilité × impact), carte de chaleur et risques courants préremplis.
- **Fournisseurs** : niveau de risque, rapport SOC 2 ou ISO reçu, DPA signé et date de la prochaine revue.
- **Collaborateurs** : NDA, vérification d'antécédents, formation, MFA, poste sécurisé, et suivi des départs.
- **Tableau de bord** et **rapport imprimable** à partager avec la direction, les investisseurs ou l'auditeur.
- **Vos données restent chez vous** : tout est stocké dans le navigateur, avec export et import en JSON et export CSV des contrôles.
- Mode sombre, utilisable sur mobile, aucune dépendance.

### Utilisation

**En ligne :** activez GitHub Pages (voir plus bas), puis ouvrez `https://<votre-utilisateur>.github.io/<nom-du-dépôt>/`.

**En local :**

```bash
git clone https://github.com/curtis-sama/vesting-wallet-foundry.git opencomply
cd opencomply
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

Pour explorer l'outil, cliquez sur **Explore with sample data** sur la page d'accueil.

### Publier gratuitement avec GitHub Pages

1. Dans le dépôt GitHub, ouvrez **Settings → Pages**.
2. Sous **Source**, choisissez **GitHub Actions**.
3. Fusionnez le code dans `main`. Le workflow `.github/workflows/pages.yml` publie le site automatiquement.

### Limites

OpenComply vous aide à **vous organiser et à vous préparer**. Il ne remplace pas l'auditeur : seul un cabinet CPA agréé peut délivrer un rapport SOC 2. Il ne se connecte pas non plus à vos outils (AWS, GitHub, Google Workspace) pour collecter les preuves automatiquement. C'est la prochaine étape logique (voir la feuille de route).

---

## 🇺🇸 English

### Why

US buyers almost always ask SaaS vendors for a **SOC 2** report. Compliance-automation platforms are among the best-funded categories in venture capital, and they often cost **$10k–$50k per year**. OpenComply gives early-stage teams the organizing layer for free.

### Features

- **49 plain-English SOC 2 controls** mapped to the Trust Services Criteria, each with guidance and typical evidence.
- **Evidence tracking** with links and dates, plus a warning when evidence is more than a year old.
- **11 policy templates** that fill in your company details, can be edited in Markdown and approved with a yearly review date, and export to `.md` or PDF.
- **Risk register** with likelihood × impact scoring, a heat map and common starter risks.
- **Vendor register** with risk tier, assurance on file, DPA status and review dates.
- **People** onboarding and offboarding checklist (NDA, background check, training, MFA, device).
- **Dashboard** and a **printable readiness report**.
- **Local-first**: data stays in your browser, with JSON backup and restore and a CSV export.
- No build step, no dependencies, dark mode, mobile friendly.

### Run it

Open `index.html` through any static web server (for example `python3 -m http.server`), or deploy to GitHub Pages: go to **Settings → Pages → Source: GitHub Actions**, then merge to `main`.

### Roadmap

- Integrations that collect evidence automatically (AWS, GCP, GitHub, Google Workspace, Okta), the main paid feature of commercial tools.
- ISO 27001, HIPAA and GDPR control sets, mapped to shared controls.
- Optional self-hosted backend for teams (multi-user, comments, audit log).
- Public trust page generator.
- French translation of the interface.

### Disclaimer

OpenComply is a preparation tool, not legal or audit advice. Only a licensed CPA firm can issue a SOC 2 report. "SOC 2" and "Trust Services Criteria" are AICPA terms; this project is not affiliated with the AICPA or with any vendor named here.

### License

[MIT](LICENSE)
