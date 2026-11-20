# Changelog

## 0.1.0

- Add a per-Workspace Agent preset default stored in `<workspace>/.dsh/agent-preset.json`.
- Inject the Workspace default through the Client `sessions.create` choke point;
  explicit presets keep precedence and stale ids fall back to the global default.
- Add a **Default preset** submenu to the Workspace context menu;
  saving also switches the Workspace's retained blank Session.
- Show the effective choice in the submenu title and use the product's localized preset names
  and preset icon for its rows.
