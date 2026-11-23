# @miorin/dsh-workspace-default-preset

[简体中文](README.zh.md)

**One default Agent preset per Workspace.**

Right-click a Workspace in the sidebar, open **Default**, and pick a preset or **Use global default**.
The choice lives in `<workspace>/.dsh/agent-preset.json`, and new Sessions there start with it.

Requires DeepSeek Harness 0.2.2-rc.3 or newer.

## Use

- The submenu title shows the effective choice; the current row carries `✓`.
- Picking a preset writes the file and confirms with a toast; **Use global default** removes it.
- Precedence: an explicit Session preset > the Workspace default > the global default.

## Limits

- The file is read once per Workspace and cached; reopen the menu or reload after editing it by hand.
- A preset id that no longer exists is ignored with one console warning; the Session uses the global default.
- Applies to Sessions created in the Web Client; schedules and subagents keep their own presets.

## Install

**Plugins** > **Add plugin**, or install this directory with `plugin_manager`.
This bundle is part of [`@miorin/dsh-atlas-workspace`](../dsh-atlas-workspace/README.md);
install either one, never both.

[Project documentation](docs/README.md)
