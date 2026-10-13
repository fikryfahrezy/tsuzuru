# Learning data

- `manifest.json`: upstream revision, URLs, checksums, retrieval time, and actual counts.
- `sources/openjlpt/<commit>/`: unmodified upstream JSON plus README, NOTICE, and LICENSE.
- `processed/sentence-candidates.json`: deduplicated vocabulary example pairs with provenance and length measurements. These are unreviewed candidates, not a graded exercise bank.

Read [DATA_DISCLOSURE.md](../DATA_DISCLOSURE.md) for credits, licenses, modifications, and educational limitations. Third-party data is not covered by the project's MIT software license.

Fetch the latest snapshot:

```sh
python3 scripts/fetch_learning_data.py
```

Reproduce a snapshot using the full revision from the manifest:

```sh
python3 scripts/fetch_learning_data.py --revision <commit-sha>
```

The script needs Python 3 and network access to GitHub. It checks upstream counts, leaves raw source text unchanged, and records hashes. Generated files are replaced on each import; keep exercise review decisions in separate files.
