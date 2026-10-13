# Tsuzuru

An application for practicing Japanese writing.

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
- `shared/`: exercise types, length buckets, and writing comparison rules.
- `tests/`: comparison tests, including kana variants and homophone rejection.
- `scripts/`: development helpers and the existing learning-data importer.
- `data/`: versioned learning data, excluded from formatting and included in Docker builds.

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

The processed sentence candidates are bundled into the server, not the browser.
Docker builds include the data and disclosures needed for this. The development
and build commands generate public disclosure files from the original documents.

## Practice flow

The public landing page is at `/`, with a product preview, features, a practice
guide, and FAQs. The full workspace is at `/app` (also available at `/practice`).
`/sources` provides credits and disclosure documents. All landing calls to action
open the workspace; its brand link returns to the landing page.

Choose an N5–N1 vocabulary focus, English sentence length (short: 1–7 words,
medium: 8–12, long: 13+), and writing mode. Translate the prompt with a Japanese
keyboard, check the reference, then continue. Ctrl / Command + Enter checks an
answer or advances after comparison; IME composition is respected.

- Kana only: hiragana or katakana, with no kanji.
- Kana + kanji: each annotated word may use the supplied kanji or kana reading.
- Exact writing: the reference's spelling and script must match.

All modes ignore whitespace and common sentence punctuation and normalize
Unicode width differences. Flexible comparison preserves unknown kanji rather
than accepting homophones. Only consistent examples with complete reading
annotations are eligible. Answers are compared against the supplied reference;
other valid translations may not match. The imported bank remains unreviewed,
and vocabulary levels are not whole-sentence difficulty certifications.

After checking, the app shows an explicit reference match result. Character
differences highlight substitutions and extra characters in the original input;
`□` marks missing characters. The expected writing highlights corrections.
Flexible mode aligns against the closest allowed kana/kanji spelling without
enumerating every combination. Ignored punctuation and accepted script variants
are not marked as errors. These are reference differences, not semantic judgments.
The "Why it differs" explanation identifies missing, extra, and replaced text
with sentence context, explains writing-mode restrictions, and uses supplied
word readings for kanji corrections. Explanations are saved with new journal
comparisons. They do not provide unrestricted grammar or meaning assessment.

The journal stores up to 100 entries plus settings in browser localStorage.
New entries retain their writing mode and comparison snapshot, so character
highlights and expected corrections survive reloads and later setting changes.
Older entries without comparison snapshots retain their original text and outcome.
Comparison happens on the server without persisting answers. No AI service or
account is needed. `/sources` provides credits, data limitations, and downloadable
disclosures. Generated disclosures live in ignored `public/disclosures/`.

### Installable workspace

The `/app` workspace can be installed using the browser's install action or
Add to Home Screen. It launches at `/app` in a standalone window, with regular,
maskable, and Apple touch icons matching the Tsuzuru mark. Deployment requires
HTTPS (localhost also works).

Production builds generate `/sw.js` with a cache version derived from the worker
and built client assets. After opening `/app` online and allowing installation
to finish, the workspace and saved journal can reopen offline. Loading sentences
and checking answers still require a connection; API responses and submitted
writing are never cached by the worker. The landing page and credits are outside
the workspace's scope. Updates activate after existing workspace tabs close,
then remove older Tsuzuru caches. Service worker registration is disabled in
development; test installation with `bun run build` and `bun run preview`.

To verify in a browser, open `/app`, inspect the manifest and service worker in
DevTools, reload once, then switch offline and reload again. The journal should
remain available and the workspace should explain which actions need a connection.

`GET /api/exercises?level=N5&length=short` returns a random prompt without its
answer. `POST /api/compare` accepts `{ id, answer, mode }` and returns a reference
comparison. Invalid settings and unknown IDs are rejected. Run `bun run test`
for comparison tests; `bun run check` also runs them.

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
