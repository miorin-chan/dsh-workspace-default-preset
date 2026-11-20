# 设计：工作区 Agent 默认值

## 背景

DSH 的 Agent preset 默认值只有一层：`agent-preset-registry` 用 `selectedDefault ?? default` 解析被省略的 `agentPreset`。
Web Client 的新会话流程（`uiWorkspace.startSession` / `openWorkspace` / `connectWorkspace`）本来就把
`agentPreset` 当作可选参数传给 Host，因此“按工作区默认”不需要改 Host 的解析顺序，只需要在请求离开 Client 之前补上值。

## 机制

### 单一注入点

所有新会话最终调用 Client 的 `sessions.create`。
本插件在 `apply` 中替换这个实例方法：

1. 调用方给了 `agentPreset`，原样放行。
2. 没给时，用 `workspaceId`（或按 `cwd` 找到的工作区）查询工作区默认值。
3. 查不到就原样放行，由 Host 解析全局默认。
4. 查到就补上 `agentPreset` 再调用原方法。

覆盖创造模式、hero 选择工作区、侧栏“新会话”、重新打开工作区与空白会话恢复。
恢复路径自带日志里记录的 preset，所以属于第 1 条。

### 文件与宿主

工作区默认值保存在 `<workspace>/.dsh/agent-preset.json`：

```json
{ "agentPreset": "standard" }
```

Host half 注册 `workspaceAgentPresets` 服务，把 `workspaceId` 经 durable Workspace registry 解析成目录，
只读写该目录下的文件。
Client 通过手写 Typert contribution 挂载同名 Remote namespace；`./typert` manifest 提供严格 codec。
浏览器从不传入路径。

写入使用同目录临时文件加 rename；删除文件表示恢复全局默认。

### 失效与回退

- 文件缺失、不可读或 JSON 无效：视为没有工作区默认。
- 写入时 preset id 为空、过长或含控制字符：拒绝。
- 写入时 Host 能读到 preset 名册：拒绝不存在的 id。
- 注入后 Host 报告 `agent-preset/not-found` 或 `agent-preset/invalid`：删除缓存并无 preset 重试一次，会话仍能创建。

## 不变量

- 显式 `agentPreset` 永不被覆盖。
- 任何失败都退化为全局默认，不向打开会话的 UI 抛错。
- 停用插件时恢复原 `sessions.create` 并撤回 Remote 菜单。
- 已有会话的组合不因默认值变化而改变。

## 边界

- 工作区文件不做文件监听；缓存值在下次打开菜单或重载 DSH 时刷新。
- 定时任务、子 Agent 与命令行路径不经过 Client 的 `sessions.create`，不在范围内。
- 保存默认值时会同步“当前保留且未开始”的空白会话：找到 `blank` 且 `cwd` 等于该工作区、
  Client 仍持有 Agent scope 的会话，调用 `agentPresets.select`。
  已开始或不再保留的会话保持日志里记录的组合。
