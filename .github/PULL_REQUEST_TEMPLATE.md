<!--
提交类型决定改动范围：
- 首次上架：必须同时改动 community-plugins.json + plugins/<id>.json；CI 全量核查 + 人工审核。
- 版本登记：只改 plugins/<id>.json；无权限新增且 CI 通过、PR 作者为插件仓库所有者时机器人自动合并；权限有新增转人工。
- 下架：delisted 标记或删除条目由维护者处理。
-->

## 提交类型
- [ ] 首次上架
- [ ] 版本登记
- [ ] 其他（说明）：

## 插件信息
- id：
- 仓库（owner/repo）：
- 版本（= Release tag，无 v 前缀）：

## 自检清单
- [ ] Release tag 与 manifest.json 的 `version` 完全一致（无 `v` 前缀）
- [ ] Release 产物由仓库 `.github/workflows/release.yml` Action 从源码构建（未手工上传本地产物）
- [ ] `plugins/<id>.json` 的 sha256 与 Release 附件 `checksums.txt` 逐项一致
- [ ] 权限最小化：每个声明的权限都有实际用途；`network:`/`exec:` 精确到最小范围
- [ ] 仓库根有 `LICENSE` 与 `README.md`
- [ ] （仅首次上架）`community-plugins.json` 条目按 id 字典序插入

## 说明（权限新增时必填：每个新权限的用途）
