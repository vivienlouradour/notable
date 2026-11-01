# CI/CD Notable

Les workflows utilisent les runners GitHub hébergés Ubuntu 24.04, .NET 10 et
Node.js 24. Aucun PAT, service CouchDB ou backend distant n'est nécessaire.

## Workflows

- `workflows/ci.yml` : PR vers `main`, avec les jobs `check-versions`, `backend`
  et `frontend`. Restauration des dépendances, `dotnet format` (formatage et
  analyseurs Roslyn), compilation Release, tous les tests .NET de `Notable.slnx`,
  puis `npm run check` (ESLint, Prettier, build production) et tous les tests
  Angular/Vitest. Les garde-fous de release ont également des tests hors ligne.
  Aucune connexion à GHCR ni publication depuis une PR.
- `workflows/docker-build.yml` : push sur `main`, construction des Dockerfiles
  de `sources/backend` et `sources/webapp`, cache BuildKit distinct par image et
  publication avec `GITHUB_TOKEN`. `metadata-action@v5` produit les tags et les
  labels OCI source/révision. Les publications de `main` sont sérialisées.
- `workflows/docker-release.yml` : push d'un tag `v*`, puis validation stricte
  `vX.Y.Z` ou `vX.Y.Z-rc.N`. Un tag invalide fait échouer le workflow avant toute
  connexion au registre. Le commit (y compris pour un tag annoté) doit appartenir
  à l'historique de `main` et disposer des deux images `sha-<SHA complet>`.
  Ce workflow ne contient aucune étape de build et ne crée pas de GitHub Release.

Images pour ce dépôt (le nom est automatiquement converti en minuscules) :

| Image                                     | Contexte Docker   |
| ----------------------------------------- | ----------------- |
| `ghcr.io/vivienlouradour/notable-backend` | `sources/backend` |
| `ghcr.io/vivienlouradour/notable-webapp`  | `sources/webapp`  |

| Événement         | Tags de chaque image                                           |
| ----------------- | -------------------------------------------------------------- |
| Push `main`       | `dev`, `sha-<SHA Git complet de 40 caractères>`                |
| Tag `v0.2.0-rc.1` | `0.2.0-rc.1`                                                   |
| Tag `v0.2.0`      | `0.2.0`, et `latest` si aucune stable supérieure n'est publiée |

Les builds sont actuellement `linux/amd64`. La promotion conserve aussi un index
multi-architecture si les builds sont étendus ultérieurement.

## Versions et publication manuelle

Le backend lit `sources/backend/Directory.Build.props` (`Version`), le frontend
`sources/webapp/package.json` (`version`). Aucun build ne modifie ces fichiers.
Les valeurs actuelles restent `0.0.1` et `0.0.0` : elles ont le même `major.minor`,
donc passent la CI, mais devront être alignées pour une release.

En PR, les deux versions doivent être des SemVer valides et partager
`major.minor`. Le patch peut différer. Pour une release, **les deux versions
complètes doivent être exactement égales au tag sans `v`**, suffixe RC compris.
Les nombres à zéros initiaux, les suffixes autres que `-rc.N` et les métadonnées
`+build` sont interdits dans les tags de release. `N` peut être zéro.

Pour une RC :

1. Mettre manuellement `Version` à `0.2.0-rc.1` dans les props et lancer
   `npm version 0.2.0-rc.1 --no-git-tag-version` depuis `sources/webapp` pour
   aligner `package.json` et `package-lock.json`.
2. Faire valider et fusionner la PR, puis attendre le succès des **deux** jobs
   Docker Build du commit fusionné sur `main`.
3. Depuis un checkout à jour, créer un tag annoté sur ce commit précis :

   ```sh
   git tag -a v0.2.0-rc.1 <SHA-du-commit-sur-main> -m "Notable 0.2.0-rc.1"
   git push origin v0.2.0-rc.1
   ```

Pour une stable, répéter ces étapes avec `0.2.0` et `v0.2.0`. Le passage RC →
stable implique un nouveau commit de versions et un build sur `main` ; la release
elle-même promeut exclusivement ce build existant. Ne pas taguer avant la fin du
build : en cas d'image source manquante, attendre sa publication puis relancer
Docker Release. Ne pas déplacer ou recréer un tag déjà publié.

## Promotion et protection de `latest`

`scripts/versions.py` utilise les parseurs XML/JSON de Python et contrôle les
versions. `scripts/docker_release.py` utilise uniquement la bibliothèque standard
Python pour lire GHCR et vérifier les préconditions et les digests. Il n'exécute
aucune commande Docker et n'écrit jamais dans le registre.

Avant toute écriture, les **deux** images sources sont résolues via l'API OCI de
GHCR en digests SHA-256 vérifiés sur les octets des manifests. Les tags de version
existants doivent être absents ou pointer vers le même digest ; toute différence
fait échouer la release, pour les stables comme pour les RC. Les tags de sortie
sont générés par `docker/metadata-action@v5` et contrôlés avant publication.

Le YAML expose directement les commandes
`docker buildx imagetools create --prefer-index=false`, avec une unique source
`image@sha256:…`. Le script vérifie ensuite l'égalité des digests publiés.
Ni reconstruction, ni ajout de labels ou annotations : les manifests, index,
plateformes et labels OCI d'origine restent identiques. Le label OCI de version
d'un build de développement reste donc celui du build initial ; le tag Docker
porte la version de release. Voir la [documentation Docker sur la copie des
manifests](https://docs.docker.com/reference/cli/docker/buildx/imagetools/create/).

Toutes les releases, les deux images et les relances partagent le verrou
`concurrency: docker-release`, avec `cancel-in-progress: false`. La liste paginée
des tags **réellement publiés dans GHCR**, dans les deux packages, est utilisée
pour comparer les stables par tuples d'entiers SemVer, jamais par ordre lexical
ou par date des tags Git. Les GitHub Releases et les tags Git seuls ne comptent
pas comme publications Docker. Une stable inférieure à une version publiée sur
l'une des images reçoit son tag de version mais ne modifie jamais `latest`.
Une RC ne touche jamais `latest`.

Les préconditions sont revérifiées avant les écritures, puis les deux tags de
version sont publiés et leurs digests vérifiés avant les deux `latest`. La mise à
jour de `latest` est conditionnelle et suivie d'une vérification de ses digests.
Une relance de la même version et
du même digest est idempotente et permet de terminer une publication partielle.
Un `latest` sans tag stable correspondant fait échouer les releases stables et
demande une réparation du registre.

Limites : GHCR n'offre pas de transaction entre packages ni de verrou atomique
« créer ce tag seulement s'il est absent ». Les contrôles protègent les écritures
de ce workflow ; un autre workflow ou compte autorisé peut modifier/supprimer un
tag. Réserver les droits d'écriture à ce circuit et conserver les tags stables
(ils servent aussi d'historique de comparaison). Une panne entre deux écritures
peut laisser les images ou leurs `latest` temporairement désalignés : relancer
la release pour terminer. Un rebuild relancé du même commit peut changer son
digest `sha-…` ; si une release le référence déjà, son remplacement sera refusé,
et il faut conserver le digest publié ou créer une nouvelle version.

La concurrence GitHub conserve par défaut un seul run en attente : une nouvelle
release peut remplacer un run encore en attente, jamais celui en cours. Relancer
les runs ainsi annulés ; l'ordre d'exécution n'est pas utilisé pour décider de
`latest`. Voir les [règles de concurrence GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## Paramètres GitHub à configurer

- Activer GitHub Actions et autoriser les actions officielles `actions/*` et
  `docker/*`. Les workflows déclarent explicitement `contents: read` ; seuls les
  jobs Docker demandent `packages: write`. Utiliser le `GITHUB_TOKEN` fourni par
  GitHub, sans PAT ni secret supplémentaire. Pour des packages préexistants,
  accorder à ce dépôt l'accès Actions en écriture dans les paramètres GHCR.
  Définir la visibilité publique des packages si les images doivent être tirées
  anonymement (la visibilité du dépôt ne suffit pas toujours).
- Protéger `main` : PR obligatoire, revue, branche à jour et checks requis
  `check-versions`, `backend`, `frontend` du workflow CI. Laisser tous les checks
  s'exécuter, sans filtre de chemins qui pourrait bloquer un check requis.
  Les paramètres GitHub ne sont pas modifiés par ces fichiers.
- Ajouter un ruleset sur les tags `v*` : création réservée aux mainteneurs,
  interdiction de modification/suppression et revue des commits tagués. Les
  workflows d'un tag proviennent du commit tagué : protéger aussi les changements
  de `.github/` et limiter les droits de contournement des règles.
- Conserver les images `sha-…` destinées à une future release. Le build ne s'exécute
  pas sur les tags ; un nettoyage des sources avant promotion rend la release
  impossible. Les secrets et paramètres d'exécution applicatifs restent dans la
  configuration de déploiement, jamais dans les images ou ce dépôt.

Validation locale des scripts, sans réseau ni publication :

```sh
python .github/scripts/versions.py
python -m unittest discover -s .github/scripts -p 'test_*.py'
```
