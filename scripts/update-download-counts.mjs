#!/usr/bin/env node
/**
 * 下载量统计机器人（cron）：把已登记插件的 GitHub release 下载数聚合为
 * 仓库根的 download-counts.json（{ "<id>": <次数> }），由 download-counts
 * 工作流提交回 main；客户端随索引经 raw.githubusercontent.com 读取——
 * 与 ADR-4 一致，用户侧零 API 配额、零自建服务。
 *
 * 计数口径：宿主每次安装/更新恰好下载一个 manifest.json，因此以各 release
 * 中 manifest.json 的 download_count 之和作为「累计下载量」；老 release 未挂
 * manifest.json 时回退取该 release 附件的最大下载数。直接累加全部附件会把
 * 三件套（main.js / manifest.json / styles.css）重复计为 3 倍，不可取。
 *
 * 本地运行：node scripts/update-download-counts.mjs
 * （公共仓库无需 token；CI 注入 GH_TOKEN 提高配额。）
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = path.join(ROOT, "community-plugins.json");
const OUT_PATH = path.join(ROOT, "download-counts.json");
// 每仓只取最近 100 个 release——市场插件的版本数远低于此，不为理论情况加分页。
const RELEASES_URL = (repo) =>
  `https://api.github.com/repos/${repo}/releases?per_page=100`;

async function fetchReleases(repo) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ccgui-plugins-download-counts",
  };
  if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  const res = await fetch(RELEASES_URL(repo), {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`GET ${repo} releases: HTTP ${res.status}`);
  return res.json();
}

/** 单个 release 的安装次数：manifest.json 优先，缺失时取附件最大值。 */
function releaseInstalls(release) {
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const manifest = assets.find((a) => a.name === "manifest.json");
  if (manifest) return manifest.download_count ?? 0;
  return assets.reduce((max, a) => Math.max(max, a.download_count ?? 0), 0);
}

async function main() {
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const counts = {};
  for (const { id, repo } of index) {
    try {
      const releases = await fetchReleases(repo);
      counts[id] = releases.reduce((sum, r) => sum + releaseInstalls(r), 0);
      console.log(`${id} (${repo}): ${counts[id]}`);
    } catch (err) {
      // 单个插件统计失败不阻断其余：保留旧值（若有），否则缺省为不展示。
      console.error(`[warn] ${id}: ${err.message}`);
      const old = existsSync(OUT_PATH)
        ? JSON.parse(readFileSync(OUT_PATH, "utf8").trim() || "{}")
        : {};
      if (typeof old[id] === "number") counts[id] = old[id];
    }
  }
  writeFileSync(OUT_PATH, `${JSON.stringify(counts, null, 2)}\n`);
  console.log(`已写入 ${path.relative(ROOT, OUT_PATH)}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
