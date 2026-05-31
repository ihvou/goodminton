import { config } from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

config({ path: '.env.local' });

type TableDump = {
  table: string;
  rows: Record<string, unknown>[];
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function insertStatement(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return `-- ${table}: no rows\n`;
  const columns = Object.keys(rows[0]);
  const values = rows
    .map(
      (row) =>
        `  (${columns.map((column) => sqlValue(row[column])).join(', ')})`,
    )
    .join(',\n');
  return [
    `-- ${table}: ${rows.length} rows`,
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES`,
    values + ';',
    '',
  ].join('\n');
}

async function main() {
  const [{ db }, { dayTeams, matches, members, playSessions }] = await Promise.all([
    import('@/db'),
    import('@/db/schema'),
  ]);
  const tables = [
    { name: 'members', query: () => db.select().from(members) },
    { name: 'play_sessions', query: () => db.select().from(playSessions) },
    { name: 'matches', query: () => db.select().from(matches) },
    { name: 'day_teams', query: () => db.select().from(dayTeams) },
  ] as const;
  const dir = join(process.cwd(), 'backups', `${timestamp()}-before-multiclub`);
  await mkdir(dir, { recursive: true });

  const dumps: TableDump[] = [];
  for (const table of tables) {
    const rows = (await table.query()) as Record<string, unknown>[];
    dumps.push({ table: table.name, rows });
    await writeFile(
      join(dir, `${table.name}.json`),
      JSON.stringify(rows, null, 2),
      'utf8',
    );
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    reason: 'before-multiclub',
    tables: Object.fromEntries(
      dumps.map((dump) => [dump.table, { rows: dump.rows.length }]),
    ),
  };
  await writeFile(
    join(dir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );
  await writeFile(
    join(dir, 'backup.sql'),
    dumps.map((dump) => insertStatement(dump.table, dump.rows)).join('\n'),
    'utf8',
  );

  console.log(JSON.stringify({ dir, manifest }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
