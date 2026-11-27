# 工作区默认预设实现说明

产品体验与成功标准见[产品设计](../DESIGN.md)。

## 注入点与同步边界

DSH 的 Agent preset 全局解析在 `agent-preset-registry` 使用 `selectedDefault ?? default`，
Web Client 新会话流程本身将 `agentPreset` 作为可选参数传给 Host，因此只需在请求离开 Client 前补全。
插件在 `apply` 中包装 Client 的 `sessions.create` 实例方法：

1. 调用方已提供 `agentPreset` 时原样放行（含会话恢复路径）。
2. 未提供时，按 `workspaceId`（或匹配 `cwd` 的工作区）查询工作区默认值。
3. 查不到时原样放行，交由 Host 解析全局默认。
4. 查到后补上 `agentPreset` 再调用原方法。

保存默认值时，还会查找 `blank` 且 `cwd` 等于该工作区、Client 仍持有 Agent scope 的未开始会话，
调用 `agentPresets.select` 同步组合。
定时任务、子 Agent 与 CLI 路径不经过 Client 的 `sessions.create`。

## 宿主存储与 Remote 协议

- 工作区默认值保存在 `<workspace>/.dsh/agent-preset.json`（如 `{ "agentPreset": "standard" }`）。
- Host 注册 `workspaceAgentPresets` 服务，将 `workspaceId` 经 durable Workspace registry 解析成目录并限定只读写该文件；
  写入使用同目录临时文件加原子重命名，删除文件表示恢复全局默认，浏览器不传递文件系统路径。
- Host 在 `index.js` 显式注册手写 Typert manifest（`src/lib/typert.ts`），
  提供独立于 `typert-loader` 包缓存的严格 codec；Client 通过 `src/client/index.ts` 挂载同名 Remote namespace。

## 菜单呈现与失效回退

- 内置 preset 按与 `presetDisplayText` 相同的 id 到词典键映射从 `settings.agentPreset` 读取全名，
  自定义 preset 显示声明名称；通过 `ui-context-menu` 的 keyed slot `contextMenu.icon` 复用内置 preset 图标，
  词典或图标不可用时分别回退 id 或留空。
- 读取时若文件缺失、不可读或 JSON 无效，视作无工作区默认；写入时校验非空、长度、控制字符及 preset 名册存在性。
- 注入后若 Host 返回 `agent-preset/not-found` 或 `agent-preset/invalid`，删除缓存并以无 `agentPreset` 重试一次。
- 停用插件时恢复原 `sessions.create` 并撤回 Remote 菜单。
