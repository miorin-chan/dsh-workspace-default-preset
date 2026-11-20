# dsh-workspace-agent-preset

[简体中文](README.zh.md)

Gives each Workspace its own default Agent preset.
Right-click a Workspace in the sidebar, open **Default**, and pick a preset or **Use global default**.
The choice is stored in `<workspace>/.dsh/agent-preset.json`, and new Sessions in that Workspace start with it.

Requires DeepSeek Harness 0.2.2-rc.3 or newer.

## Use

The submenu title names the effective choice, and every preset row carries the product's preset icon.
The current choice also carries `✓`.
Selecting a preset writes the Workspace file and confirms with a toast.
**Use global default** removes the file; new Sessions then follow the installation-wide default again.

Precedence is: an explicit preset chosen for the Session (the creator flow, a restored blank Session,
another plugin) > the Workspace default > the global default.
Existing Sessions keep the composition they already run.

## Limits

- The file is read once per Workspace and cached.
  After editing it by hand, open the Workspace menu once (or reload DSH) to pick up the new value.
- A preset id that no longer exists is ignored with one console warning; the Session starts
  under the global default instead.
- The default applies to Sessions created through the Web Client.
  Schedules and subagents carry their own presets and are not affected.
- The retained blank Session of that Workspace switches to the new default immediately.
  A blank Session that is no longer retained keeps the preset recorded in its log.

## Install

In **Plugins** > **Add plugin**, choose this directory, or install the bundle with `plugin_manager`.
The bundle appears as **Workspace agent defaults**.
Disable it in **Plugins** to remove the menu and the injection again; Workspace files stay on disk.

[Project documentation](docs/README.md)
