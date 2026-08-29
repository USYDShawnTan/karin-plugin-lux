# Karin 模板参考

这里存放从 Karin 官方插件模板演化而来的示例代码，仅供开发和 Agent 参考。

## 重要约定

- 本目录不是运行时插件目录，不应被 Karin 自动加载。
- 真正会在 C 端生效的命令、事件和任务必须放在 `src/apps/`。
- 新功能优先参考本目录的 Karin API 用法，再结合 `src/apps/` 中现有正式实现。
- 不要为了“保留示例”把 demo 代码重新复制回 `src/apps/`。
- 示例中的 URL、文案、权限和参数仅作演示，正式功能必须按实际需求重新设计。

## 示例索引

- `example.ts`：基础 `karin.command`、文本/segment、命令参数。
- `handler.ts`：`karin.handler` 与 `handler.call`。
- `render.ts`：HTML/URL 渲染、截图。
- `sendMsg.ts`：主动消息、转发消息、图片消息等。
- `task.ts`：`karin.task` 定时任务模板。
