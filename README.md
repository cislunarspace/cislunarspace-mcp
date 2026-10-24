# cislunarspace-mcp

地月空间入门指南术语词典的 MCP server。给 AI 客户端提供一个可调用的词典检索工具，检索对象是 [cislunarspace.cn](https://cislunarspace.cn/) 的词典工件。

数据来自站点构建期生成的 `/glossary-dictionary.json`，包含 720 条术语，分 8 个类别，每条带中文名、英文名、关键词、定义正文与页面链接。server 只读，不发任何写请求。

## 工具

`search` 按关键词检索，返回标题、英文名、分类、页面链接与定义摘要。参数 `query` 必填，`limit` 默认 5，最大 20。

`get` 按分类与 slug 取单条词条，返回完整定义与参考文献题录。参数 `slug` 可写成 `orbits/aro` 形式，也可以分开写 `slug` 与 `category`。

## 配置

需要 Node 20 以上。四种客户端都用 `npx` 拉取本仓库的标签版本，不需要预先安装。

npm 12 起 git 依赖默认关闭，所以要带 `--allow-git=all`。npm 11.10 之前的版本不认识这个参数，但也只是被当作未知配置忽略，同样可用。等发布到 npm 官方仓库之后，这一串可以缩成 `npx -y cislunarspace-mcp`，进度见 [issue #1](https://github.com/cislunarspace/cislunarspace-mcp/issues/1)。

Claude Desktop，写入 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "cislunarspace": {
      "command": "npx",
      "args": ["--allow-git=all", "-y", "github:cislunarspace/cislunarspace-mcp#v0.1.2"]
    }
  }
}
```

Claude Code：

```bash
claude mcp add cislunarspace -- npx --allow-git=all -y github:cislunarspace/cislunarspace-mcp#v0.1.2
```

Cursor，写入 `~/.cursor/mcp.json`，形状与 Claude Desktop 相同：

```json
{
  "mcpServers": {
    "cislunarspace": {
      "command": "npx",
      "args": ["--allow-git=all", "-y", "github:cislunarspace/cislunarspace-mcp#v0.1.2"]
    }
  }
}
```

VS Code，写入 `.vscode/mcp.json`：

```json
{
  "servers": {
    "cislunarspace": {
      "type": "stdio",
      "command": "npx",
      "args": ["--allow-git=all", "-y", "github:cislunarspace/cislunarspace-mcp#v0.1.2"]
    }
  }
}
```

配置完成后在客户端里问“什么是轴向共振轨道”，模型会调用 `search` 取到站内定义与链接。

## 数据与缓存

启动时对词典工件发一次条件请求。数据没变时服务端返回 304，直接复用本地缓存。网络不可用时退回上一次成功拉取的缓存，只有从未拉取成功才报错退出。

缓存位置默认是 `$XDG_CACHE_HOME/cislunarspace-mcp`，没有设置该变量时用 `~/.cache/cislunarspace-mcp`。

环境变量：

- `CISLUNAR_DICTIONARY_URL` 覆盖词典工件地址，本地调试时可指向 `file://` 或本地服务。
- `CISLUNAR_BIBLIOGRAPHY_URL` 覆盖题录地址。
- `CISLUNAR_CACHE_DIR` 覆盖缓存目录。

## 本地开发

```bash
npm install
npm run build
npm test        # 单元测试，不联网
npm run smoke   # 联网拉线上词典并打印几组检索结果
```

在本机用源码调试的客户端配置：

```json
{
  "mcpServers": {
    "cislunarspace": {
      "command": "node",
      "args": ["/绝对路径/cislunarspace-mcp/dist/index.js"]
    }
  }
}
```

## 相关

词典工件的字段与兼容承诺记录在站点仓库的 [ADR-0009](https://github.com/cislunarspace/cislunarspace/blob/master/docs/adr/0009-glossary-artifact-as-public-contract.md)，需求背景见 [issue #77](https://github.com/cislunarspace/cislunarspace/issues/77)。

## 许可证

Apache License 2.0。
