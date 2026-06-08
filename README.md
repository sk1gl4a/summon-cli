# summon-cli

<p align="center">
  <img src="assets/screenshot.png" alt="summon-cli picker" width="720">
</p>

Terminal launcher for local AI CLIs. Run `summon`, pick a tool, launch it.

Built-in: Codex CLI, Claude Code, Antigravity CLI, Cursor CLI, GitHub Copilot CLI, opencode CLI. Missing tools show dimmed. Add your own with `--add`.

> Pre-release (0.2.0).

## Install

```sh
npm install -g summon-cli
summon
```

Move with arrows or `j/k` or `1-9`. `Enter` launches, `Esc` quits.

## Commands

- `summon` open the picker
- `summon reorder` set the order
- `summon default <tool>` start the cursor on it (`off` clears, no arg = pick)
- `summon alias <name>` install a second shell command name for the launcher
- `summon help`

## Flags

- `--add <cmd> [label]` add a custom CLI to the menu. Example:
  ```sh
  summon --add grok "Grok Build"
  ```
  Adds an entry that runs `grok` and shows as `Grok Build` with hint `Custom provider`.
- `--remove <id>` remove a custom CLI from the menu.
- `--no-logo` / `--logo` toggle the side logo (remembered).
- Args after `--` go to the launched tool.

## Config

`~/.config/summon-cli/config.json`

## Requirements

Node 18+, a TrueColor terminal, the target CLIs on PATH.

## Trademarks

Unofficial, not affiliated with Codex CLI, Claude Code, Antigravity CLI, Cursor CLI, GitHub Copilot CLI, opencode CLI or their makers. Names, logos, colors belong to their owners and are used only to identify what you launch. Open an issue to request changes.

## License

GPL-3.0-only. See [LICENSE](LICENSE). Copyright (c) 2026 sk1gl4a.
