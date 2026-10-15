# Development guide

[Back to README](../README.md)

## Requirements

- Bun **1.4.3** (pinned in `.bun-version`, `package.json`, and `Dockerfile`).
- Docker with the Compose plugin for container development or deployment.
- Python 3 only if you need to refresh the learning data.

Install the pinned Bun version with the official installer:

```sh
curl -fsSL https://bun.com/install | bash -s "bun-v1.4.3"
```

## Development

```sh
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:3000>. Installation prepares Nuxt types and installs
Lefthook Git hooks outside CI and production. If hooks need reinstalling, run
`bun run hooks:install`.

| Command            | Purpose                                 |
| ------------------ | --------------------------------------- |
| `bun run check`    | Lint, formatting, TypeScript, and tests |
| `bun run lint:fix` | Apply Oxlint fixes                      |
| `bun run format`   | Format with Oxfmt                       |
| `bun run build`    | Build the Bun server into `.output/`    |
| `bun run start`    | Run the production build                |
| `bun run preview`  | Preview the production build            |
| `bun run generate` | Generate a static site                  |

Pre-commit fixes lint issues in staged JavaScript, TypeScript, and Vue files,
formats supported files, and restages both. Pre-push runs `bun run check`.
GitHub Actions runs these checks, builds the
application and Docker image, and smoke tests the container.

## Project structure

- `app/`: Nuxt application, with file-based routes in `app/pages/`.
- `server/`: Nitro server routes; `GET /health` reports readiness.
- `shared/`: exercise types, length buckets, and writing comparison rules.
- `tests/`: comparison tests, including kana variants and homophone rejection.
- `scripts/`: development helpers and the existing learning-data importer.
- `data/`: versioned learning data, excluded from formatting and included in Docker builds.

Nuxt auto-imports are available in application and server code. The Oxlint
configuration lists the globals used by the starter; add new Nuxt auto-imports
there if a lint rule requires them. TypeScript checks run separately through
Nuxt and Vue's type checker.

## Docker

```sh
docker compose up --build -d --wait
docker compose logs -f web
docker compose down
```

The multi-stage image installs the frozen lockfile, builds with Bun, and runs
only Nuxt's standalone output as the unprivileged `bun` user. It exposes port
3000 and checks `/health`. The Compose file does not publish a host port. To access the app from your host,
add a `ports` mapping such as `"3000:3000"` to the `web` service in
[`compose.yaml`](../compose.yaml).

The processed sentence candidates are bundled into the server, not the browser.
Docker builds include the data and disclosures needed for this. The development
and build commands generate public disclosure files from the original documents.

## Exercise API

- `GET /api/exercises?level=N5&length=short` returns a random English prompt,
  romaji, and vocabulary hints from sentences graded at that level or easier.
- `POST /api/compare` accepts `{ id, answer, mode, acceptAlternatives? }` and
  returns a reference comparison. Invalid settings and unknown IDs are rejected.

To reproduce a specific exercise, open `/app?sentence=<id>` using an eligible ID
from `data/processed/sentence-candidates.json`. This overrides level and length
filters; advancing reloads the same sentence. Return to `/app` for random practice.

Hint mappings, spelling variants, and alternative-answer generation are documented
in the [learning data guide](../data/README.md).

## Test app installation

Service worker registration is disabled in development. Run `bun run build` and
`bun run preview`, open `/app`, and inspect the manifest and service worker in
DevTools. Reload once online, then switch offline and reload again: the journal
should remain available, while prompts and answer checking require a connection.
Installation requires HTTPS or localhost.

Production generates `/sw.js` with a cache version derived from the worker and
built client assets. API responses and submitted writing are never cached.
Updates activate after existing workspace tabs close and remove older caches.

## Dependency versions

Direct dependencies use exact stable versions checked against the npm registry
on October 13, 2026. TypeScript is pinned to **6.0.3**, the latest compatible
release: TypeScript 7.0.2 removed the compiler API required by `vue-tsc` 3.3.13.
`bun.lock` locks transitive dependencies;
`bun install --frozen-lockfile` enforces it. `bunfig.toml` makes future additions
exact by default. CI actions are pinned to commit hashes and the Docker base
image uses an exact Bun release tag and digest.

When upgrading, resolve stable versions explicitly, update the package pins and
lockfile together, and run `bun run check`, `bun run build`, and the Docker smoke
test. For Bun upgrades, also update `.bun-version`, `packageManager`, `engines`,
the Docker image tag and digest, and the installation command above.
