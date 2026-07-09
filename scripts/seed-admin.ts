import { setAdminPassword, getAdminPasswordHash, isProvisioned } from "../src/lib/admin";
import { migrate } from "../src/lib/migrations";

async function main() {
  migrate();
  const username = process.env.ADMIN_USERNAME || "admin";
  const plain = process.argv.find((a) => !a.startsWith("-") && a !== process.argv[0] && a !== process.argv[1]);
  const force = process.argv.includes("--force") || process.argv.includes("-f");

  if (isProvisioned() && !force) {
    console.log("Admin already provisioned (env hash or DB hash present).");
    console.log("Admin username:", username);
    console.log("To overwrite, run: npm run seed:admin -- --force <new-password>");
    return;
  }
  if (!plain) {
    console.error("Usage: npm run seed:admin -- <password>   (or: --force <password>)");
    process.exit(1);
  }
  setAdminPassword(plain);
  console.log(force ? "Admin password overwritten." : "Admin password set.");
  console.log("Admin username:", username);
  console.log("Hash:", getAdminPasswordHash().slice(0, 12) + "…");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
