// Wise Software: Uzak sunucuya (DigitalOcean 142.93.104.78) otomatik dagitim betigi
// Kullanim: npm run deploy:remote

import { execSync } from "node:child_process";

const REMOTE_HOST = "142.93.104.78";
const REMOTE_DIR = "/opt/software-factory";
const REMOTE_APP_DIR = "/opt/software-factory/app";

function run(command, description) {
  if (description) {
    console.log(`\n\x1b[36m▶ ${description}...\x1b[0m`);
  }
  try {
    return execSync(command, { stdio: "inherit", encoding: "utf8" });
  } catch (error) {
    console.error(`\x1b[31m✖ Hata: ${description || command}\x1b[0m`);
    process.exit(1);
  }
}

function runCapture(command) {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch (error) {
    return "";
  }
}

console.log("\x1b[32m=== Wise Software: Uzak Sunucuya Dağıtım ===\x1b[0m");

// 1. Yerel kontroller
const status = runCapture("git status -s");
if (status) {
  console.log("\x1b[33mUyarı: Yerelde kaydedilmemiş değişiklikler var:\x1b[0m");
  console.log(status);
  console.log("Dağıtım öncesinde değişiklikleri commit edip pushlamanız önerilir.\n");
}

// 2. Git push
run("git push origin main", "GitHub'a son değişiklikler gönderiliyor");

// 3. Uzak sunucuda git pull & docker rebuild & restart
const remoteCommands = [
  `cd ${REMOTE_APP_DIR} && git pull origin main`,
  `cd ${REMOTE_DIR} && docker compose build app`,
  `cd ${REMOTE_DIR} && docker compose up -d app`,
  `sleep 2`,
  `curl -s -f http://127.0.0.1:8097/api/saglik && echo " [Sağlık kontrolü başarılı]" || echo " [Sağlık kontrolü başarısız]"`,
].join(" && ");

run(`ssh ${REMOTE_HOST} "${remoteCommands}"`, "Uzak sunucu güncelleniyor ve yeniden başlatılıyor");

console.log("\n\x1b[32m✔ Dağıtım tamamlandı!\x1b[0m");
console.log("Canlı sistem: http://142.93.104.78:8097\n");
