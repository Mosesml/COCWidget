# COCWidget working agreement

- Work on `main` unless Moses changes this instruction.
- Commit small, coherent, tested slices frequently. Keep `docs/GOALS.md` current.
- Push only to `https://github.com/Mosesml/COCWidget.git`. Verify the remote before pushing. Never force-push.
- Build for iOS and Android from shared TypeScript logic; keep platform-specific widget code isolated.
- Preserve the original village export and unknown fields. Missing sections mean unknown, not empty.
- Treat snapshots, catalogue facts and forecasts as different kinds of information in the product.
- Never imply live game synchronization. Clipboard access must be user initiated.
- Never commit API credentials, signing material, private player exports or generated build directories.
- Run type checking, core tests and a web export for shared application changes. Record native checks separately; do not call an untested device integration verified.

