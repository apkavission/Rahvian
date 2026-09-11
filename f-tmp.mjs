import pg from "pg";
import { loadConfig, dbClient } from "./scripts/estate.mjs";
const c = dbClient(pg, loadConfig());
await c.connect();
const { rows: fks } = await c.query(`
  select tc.table_name, kcu.column_name, ccu.table_name as points_at
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
   where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'demo_clinic' and ccu.table_name = 'media'
   order by tc.table_name`);
console.log("FKs to media in demo_clinic:");
for (const r of fks) console.log(`  ${r.table_name}.${r.column_name}`);
const { rows: cols } = await c.query(`
  select table_name, column_name from information_schema.columns
   where table_schema='demo_clinic' and column_name like '%image%' or (table_schema='demo_clinic' and column_name like '%media%')
   order by table_name`);
console.log("\nimage/media columns:");
for (const r of cols) console.log(`  ${r.table_name}.${r.column_name}`);
await c.end();
