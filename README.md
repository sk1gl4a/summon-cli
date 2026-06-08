# summon-cli

Terminal launcher for local AI CLIs. Run `cli`, pick a tool, launch it.

Supported: Codex, Claude, Antigravity, Cursor, Copilot, opencode. Missing tools show dimmed.

> Pre-release (0.1.0).

## Install

```sh
npm install -g .
cli
```

Move with arrows or `j/k` or `1-9`. `Enter` launches, `Esc` quits.

## Commands

- `cli` open the picker (or your default)
- `cli menu` always open the picker
- `cli reorder` set the order
- `cli default <tool>` launch one directly (`off` clears, no arg = pick)
- `cli alias <name>` add another command name
- `cli help`

Flag: `--no-logo`. Args after `--` go to the launched tool.

## Config

`~/.config/summon-cli/config.json`

## Requirements

Node 18+, a TrueColor terminal, the target CLIs on PATH.

## Trademarks

Unofficial, not affiliated with the listed tools. Names, logos, colors belong to their owners and are used only to identify what you launch. Open an issue to request changes.

## License

GPL-3.0-only. See [LICENSE](LICENSE). Copyright (c) 2026 sk1gl4a.
