# companion-module-mutedeck-mutedeck

A [Bitfocus Companion](https://bitfocus.io/companion) module for controlling and monitoring the [MuteDeck](https://mutedeck.com) desktop application.

Mute/unmute, toggle your camera, share, record, leave the meeting, push-to-talk, and trigger custom actions across Zoom, Microsoft Teams, Webex, Google Meet, Discord and more — with button feedback that reflects your live status.

See [`companion/HELP.md`](companion/HELP.md) for full usage, actions, feedbacks, variables and presets.

## How it works

MuteDeck exposes a local WebSocket API (default `ws://localhost:3492`). This module connects to it through the MuteDeck plugin SDK (`@mutedeck/plugin-client`, `MuteDeckClient`), sends action messages, and listens for `update-status` pushes to drive feedbacks and variables. The MuteDeck desktop app must be installed and running.

- **MuteDeck with plugin protocol v2**: the module connects to `/v2` and MuteDeck asks the user to allow "Bitfocus Companion". The token MuteDeck issues is kept in Companion's secrets store (hidden config field `mutedeck_token`), next to a per-connection instance id (hidden config field `mutedeck_instance_id`). A revoked token is discarded and approval is asked again.
- **Older MuteDeck**: the SDK gets no `welcome` within 3 seconds and falls back to protocol v1 (`identify` plus `source: "plugin"`).

## Development

This module is built against `@companion-module/base` 2.x and requires Companion 4.3 or newer. It is plain ESM JavaScript — no build step required.

The SDK comes from npm (`"@mutedeck/plugin-client": "^1.0.2"`), so the Bitfocus module checks can resolve it.

```sh
yarn install        # yarn 4 via corepack
yarn check          # validate manifest and module definitions
yarn package        # build a distributable package (.tgz) with companion-module-build
```

To load it as a developer module, point Companion's _Developer modules path_ (launcher → cog → Advanced/Developer settings) at the folder that contains this repository, then enable developer modules. The connection appears as **MuteDeck** on the Connections page.

### Project layout

| Path                      | Purpose                                                  |
| ------------------------- | -------------------------------------------------------- |
| `companion/manifest.json` | Module metadata for Companion.                           |
| `companion/HELP.md`       | In-app help shown to users.                              |
| `src/main.js`             | Instance class (entrypoint) and MuteDeck event handling. |
| `src/api.js`              | MuteDeck connection via the MuteDeck plugin SDK.         |
| `src/actions.js`          | Action definitions.                                      |
| `src/feedbacks.js`        | Live icon + boolean feedback definitions.                |
| `src/icons.js`            | Generated MuteDeck button icons (base64 PNGs).           |
| `src/variables.js`        | Variable definitions and values.                         |
| `src/presets.js`          | Ready-made button presets.                               |
| `src/state.js`            | Shared state constants and label helpers.                |
| `src/config.js`           | Connection configuration fields.                         |
| `src/upgrades.js`         | Upgrade scripts (append-only).                           |

### Continuous integration

`.github/workflows/companion-module-checks.yaml` runs Bitfocus' shared [module checks](https://github.com/bitfocus/actions) on every push, the same checks the Companion module library uses.

### Icons

`src/icons.js` is generated from the MuteDeck Stream Deck plugin's icon set and committed, so building this module needs nothing outside this repository. To regenerate, place a checkout of the Stream Deck plugin at `./streamdeck-plugin-nodejs` and run `yarn icons`.

### Cutting a release

1. Bump `version` in **both** `package.json` and `companion/manifest.json` (they must match — `yarn check` enforces this).
2. Commit, tag (`git tag v1.0.1`), and push with `--tags`.
3. Submit the version at <https://developer.bitfocus.io> (My Connections → your module → Submit Version) to list it in the Companion store.

## License

MIT — the MuteDeck name, logo and icons are trademarks of MuteDeck; the license covers the code.
