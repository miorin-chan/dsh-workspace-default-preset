# @miorin/dsh-workspace-default-preset

[English](README.md)

**每个工作区一个默认 Agent preset。**

在侧栏右键工作区，打开 **默认**，选择某个 preset 或 **使用全局默认**。
选择保存在 `<工作区>/.dsh/agent-preset.json`，该工作区的新会话直接使用它。

需要 DeepSeek Harness 0.2.2-rc.3 或更新版本。

## 使用

- 子菜单标题显示当前生效的选择；当前行带 `✓`。
- 选择 preset 会写入文件并给出提示；**使用全局默认** 会删除该文件。
- 优先级：会话显式 preset > 工作区默认 > 全局默认。

## 限制

- 文件按工作区读取一次后缓存；手工修改后需重开菜单或重载 DSH。
- 已不存在的 preset id 会被忽略并打印一次警告；会话改用全局默认。
- 只作用于 Web Client 创建的新会话；定时任务与子 Agent 自带 preset。

## 安装

在 **插件** > **添加插件** 中选择本目录，或通过 `plugin_manager` 安装。
本插件属于 [`@miorin/dsh-workspace-atlas`](../dsh-workspace-atlas/README.zh.md) 聚合包；两者只能装一个。

[项目文档](docs/README.md)
