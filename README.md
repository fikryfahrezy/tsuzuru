# Tsuzuru

A space to practice Japanese writing. Translate English prompts into Japanese,
compare your answer with a supplied reference, and keep a journal of your practice.
Built with Nuxt, Vue, and Bun. No account or AI service is required to practice.

## What you can do

- Choose an N5–N1 vocabulary focus and short, medium, or long prompts.
- Practice in kana only, kana + kanji, or exact writing mode.
- Reveal romaji and vocabulary hints when you need them.
- Look up N5–N1 grammar, formation rules, and examples alongside your draft.
- Review character differences and optionally accept pre-generated alternatives.
- Save up to 100 journal entries in your browser.
- Install the workspace as an app; view your saved journal offline.

Answers are compared with listed references. Other valid translations may not
match, and the learning data has not been independently reviewed. Loading prompts
and checking answers require a connection.

## Quick start

Install **Bun 1.4.3** (the version pinned in [`.bun-version`](.bun-version)), then run:

```sh
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:3000> for the landing page or
<http://localhost:3000/app> to start practicing.

Choose your settings, write a translation, and press **Ctrl / Command + Enter**
to check it. Press again to continue. Your journal and settings stay in this
browser's localStorage; answers are compared on the server without being stored there.

## Development

| Command            | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `bun run check`    | Run lint, formatting, TypeScript checks, and tests |
| `bun run test`     | Run comparison tests                               |
| `bun run lint:fix` | Apply lint fixes                                   |
| `bun run format`   | Format the project                                 |
| `bun run build`    | Build for production                               |
| `bun run start`    | Run the production build                           |

Installation sets up Nuxt types and Git hooks. Pre-commit fixes lint and formatting;
pre-push runs `bun run check`.

## Documentation

- [Practice guide](docs/practice.md) — hints, writing rules, results, alternatives, and app installation.
- [Development guide](docs/development.md) — setup, project structure, Docker, and dependency upgrades.
- [Learning data](data/README.md) — importing data and maintaining answer banks.
- [Data disclosure](DATA_DISCLOSURE.md) — sources, attribution, licenses, and learning limitations.

## License

Project software is covered by the [MIT license](LICENSE).
Third-party learning data has its own licenses; see the [data disclosure](DATA_DISCLOSURE.md).
