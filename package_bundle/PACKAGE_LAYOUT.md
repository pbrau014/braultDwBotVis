# DWBOT complete package layout in the Git repository

The repository root is the expanded DWBOT application source tree, with code, tests, fixtures, documentation, model assets, benchmark outputs, and provenance records in their original relative paths.

`package_bundle/` preserves the companion contents from the downloadable delivery kit: its download readme, original checkpoint ZIP, and package-level manifests, checksums, and project-state summary. The expanded source tree is not duplicated under a second folder because it is already the repository root.

The original `DWBOT_RC3_CURRENT_SOURCE.zip` contained a `node_modules` directory. The unmodified original remains in the local supplied kit; the repository instead contains a separately named sanitized derivative plus `provenance/DWBOT_RC3_ARCHIVE_PUBLICATION_PROVENANCE.json`. The derivative excludes only runtime/VCS/data/cache directories.

Actual `.env` files, credentials, private keys, databases, node_modules, Git metadata, and disposable runtime/cache directories are excluded. Placeholder `.env.example` files are retained.
