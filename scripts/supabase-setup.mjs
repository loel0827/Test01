/**
 * Supabase 게시판용 .env 자동 작성 (anon 키만 입력)
 * 실행: 프로젝트 루트에서 node scripts/supabase-setup.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import readline from "readline/promises";
import { exec } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, "react-ai-tools", ".env");
const SQL_PATH = join(ROOT, "supabase", "board_posts.sql");

const DEFAULT_URL = "https://twazhfpyouadslwhezkn.supabase.co";
const PROJECT_REF = "twazhfpyouadslwhezkn";

const SQL_EDITOR = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;
const API_SETTINGS = `https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api`;

function hasValidAnonKey() {
  if (!existsSync(ENV_PATH)) return false;
  try {
    const text = readFileSync(ENV_PATH, "utf8");
    const m = text.match(/^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(\S+)/m);
    const v = m?.[1]?.trim();
    return !!v && v.length > 20 && v.startsWith("eyJ");
  } catch {
    return false;
  }
}

function openUrl(url) {
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function openSqlInEditor() {
  const cmd =
    process.platform === "win32"
      ? `start "" notepad "${SQL_PATH}"`
      : process.platform === "darwin"
        ? `open -e "${SQL_PATH}"`
        : `xdg-open "${SQL_PATH}"`;
  exec(cmd, () => {});
}

async function main() {
  if (hasValidAnonKey()) return;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n======== Supabase 게시판 연결 (처음 한 번) ========\n");
  console.log("1) 지금 브라우저에서 SQL 편집기와 API 설정이 열립니다.");
  console.log("2) 메모장에 열린 board_posts.sql 전체를 복사해 SQL 편집기에 붙여넣고 Run 하세요.");
  console.log("3) API 설정 페이지에서 'anon public' 키를 복사해 아래에 붙여넣으세요.\n");

  openUrl(SQL_EDITOR);
  openUrl(API_SETTINGS);
  openSqlInEditor();

  const key = (await rl.question("anon public 키 붙여넣기 (건너뛰기: skip): ")).trim();
  rl.close();

  if (!key || /^skip$/i.test(key)) {
    console.log("\n건너뜀: 게시판은 이 PC localStorage만 사용합니다. 나중에 다시 이 스크립트를 실행하세요.\n");
    return;
  }

  if (!key.startsWith("eyJ")) {
    console.log("\n경고: anon 키는 보통 eyJ 로 시작합니다. 잘못 복사했을 수 있습니다.\n");
  }

  const lines = [
    "# Supabase (웹으로보기-React.bat 실행 시 자동 안내)",
    `VITE_SUPABASE_URL=${DEFAULT_URL}`,
    `VITE_SUPABASE_ANON_KEY=${key}`,
    "",
  ];
  writeFileSync(ENV_PATH, lines.join("\n"), "utf8");
  console.log(`\n저장됨: ${ENV_PATH}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
