import { getDb } from "../src/lib/db";
import { migrate } from "../src/lib/migrations";

function main() {
  console.log("Running migrations…");
  migrate();
  console.log("Migrations complete.");
  const row = getDb()
    .prepare("SELECT MAX(version) AS v FROM schema_migrations")
    .get() as { v: number | null };
  console.log("Current schema version:", row.v);
}

main();
