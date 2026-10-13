# Tsuzuru

A Nuxt application for practicing Japanese writing.

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

| Command            | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `bun run check`    | Lint, check formatting, and check TypeScript |
| `bun run lint:fix` | Apply Oxlint fixes                           |
| `bun run format`   | Format with Oxfmt                            |
| `bun run build`    | Build the Bun server into `.output/`         |
| `bun run start`    | Run the production build                     |
| `bun run preview`  | Preview the production build                 |
| `bun run generate` | Generate a static site                       |

Pre-commit fixes lint issues in staged JavaScript, TypeScript, and Vue files,
formats supported files, and restages both. Pre-push runs `bun run check`.
GitHub Actions runs these checks, builds the
application and Docker image, and smoke tests the container.

## Project structure

- `app/`: Nuxt application, with file-based routes in `app/pages/`.
- `server/`: Nitro server routes; `GET /health` reports readiness.
- `scripts/`: development helpers and the existing learning-data importer.
- `data/`: versioned learning data, excluded from formatting and Docker builds.

Nuxt auto-imports are available in application and server code. The Oxlint
configuration lists the globals used by the starter; add new Nuxt auto-imports
there if a lint rule requires them. TypeScript checks run separately through
Nuxt and Vue's type checker.

Oxfmt uses the same explicit formatting options as `../kaku` and
`../GenkouYoushi/web`. Oxlint follows Kaku's plugin and correctness settings,
with Vue support and Nuxt globals added. Lefthook follows Kaku's staged lint
fixes and formatting, while preserving this project's pre-push checks.

## Docker

```sh
docker compose up --build -d --wait
docker compose logs -f web
docker compose down
```

The multi-stage image installs the frozen lockfile, builds with Bun, and runs
only Nuxt's standalone output as the unprivileged `bun` user. It exposes port
3000 and checks `/health`. Set `PORT` in your shell or a local `.env` file to
change the host port (see `.env.example`).

The existing data snapshot is not served or bundled into the starter. If a
future feature needs it at runtime, explicitly include the required processed
files in the Docker build and serve them through an application route.

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

## Learning data and licenses

See [data/README.md](data/README.md) for import and reproduction commands and
[DATA_DISCLOSURE.md](DATA_DISCLOSURE.md) for provenance, licenses, and educational
limitations. The [MIT license](LICENSE) applies to project software; third-party
learning data has its own licenses.
