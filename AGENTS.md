# Projet : Tiny Myrmidon
- Stack : Jeu 3D Three.js (`game/`), API Rust Axum (`api/`), manifestes Kubernetes (`k8s/app.yaml`).
- Cluster local : `k3d` nommé `tiny-myrmidon` (port 8080).
- GitHub : dépôt `git@github.com:joachimlrx/tiny-myrmidon.git` (branche `main`).
- Contrainte infra : privilégier les images Docker Alpine minimalistes (< 20 Mo) et vérifier `kubectl get pods` après chaque déploiement.

# Règles de communication et de code
- **Langue de discussion :** Toujours répondre et expliquer en **français**.
- **Langue du code :** Tout le code source (variables, fonctions, structures, routes, logs, messages d'erreur, commits, `README.md` et textes/UI du jeu) doit être écrit intégralement en **anglais**.
- **Commentaires :** Ne jamais mettre de commentaires inutiles ou évidents dans le code. Écrire du code auto-explicite et ne commenter uniquement que si une logique complexe l'exige vraiment.
- **Maintenabilité et lisibilité humaine :** Produire un code propre, modulaire et structuré (séparation claire des responsabilités, fonctions courtes, nommage explicite), facile à maintenir et à faire évoluer par un humain, en appliquant les bonnes pratiques de développement (tests automatisés, gestion propre des erreurs, conventions de commits).
