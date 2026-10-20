import zlib from "zlib";
import { promisify } from "util";
import cron from "node-cron";
import { Resend } from "resend";
import { pool } from "@workspace/db";

const gzip = promisify(zlib.gzip);

const BACKUP_TO = "mkashour.apple@gmail.com";
const FROM_EMAIL = process.env.FROM_EMAIL ?? "CTL App <noreply@inroomstudios.com>";

const TABLES = [
  "users",
  "cars",
  "maintenance_records",
  "parts_records",
  "insurance_records",
  "dealership_records",
  "fuel_records",
  "malfunctions_records",
  "inspection_records",
  "event_completions",
];

async function runBackup(): Promise<void> {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) {
    console.error("[backup] RESEND_API_KEY not configured — email not sent");
    return;
  }

  console.log("[backup] Starting database backup…");

  const snapshot: Record<string, unknown[]> = {};
  const counts: string[] = [];

  for (const table of TABLES) {
    try {
      const result = await pool.query(`SELECT * FROM ${table}`);
      snapshot[table] = result.rows;
      counts.push(`${table}: ${result.rows.length} rows`);
    } catch (err) {
      console.error(`[backup] Failed to query ${table}:`, err instanceof Error ? err.message : err);
      snapshot[table] = [];
      counts.push(`${table}: ERROR`);
    }
  }

  const json = JSON.stringify(
    { generatedAt: new Date().toISOString(), tables: snapshot },
    null,
    2
  );

  const compressed = await gzip(Buffer.from(json, "utf8"));
  const base64 = compressed.toString("base64");

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `CTL_DB_Backup_${dateStr}.json.gz`;

  const totalRows = Object.values(snapshot).reduce((s, rows) => s + rows.length, 0);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: BACKUP_TO,
    subject: `CTL Daily Backup — ${dateStr} (${totalRows} rows)`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <div style="background:#D97706;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="margin:0;color:#fff;font-size:18px">CTL Daily Database Backup</h2>
          <p style="margin:4px 0 0;color:#FEF3C7;font-size:13px">${dateStr}</p>
        </div>
        <div style="background:#F9FAFB;padding:20px 24px;border-radius:0 0 8px 8px;border:1px solid #E5E7EB;border-top:none">
          <p style="margin:0 0 16px;font-size:14px">Your automatic backup is attached as a compressed JSON file (<code>${filename}</code>).</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#FEF3C7">
                <th style="text-align:left;padding:6px 10px;border-bottom:1px solid #E5E7EB">Table</th>
                <th style="text-align:right;padding:6px 10px;border-bottom:1px solid #E5E7EB">Rows</th>
              </tr>
            </thead>
            <tbody>
              ${TABLES.map((t) => `
                <tr>
                  <td style="padding:5px 10px;border-bottom:1px solid #F3F4F6;font-family:monospace">${t}</td>
                  <td style="padding:5px 10px;border-bottom:1px solid #F3F4F6;text-align:right">${snapshot[t]?.length ?? 0}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#6B7280">
            Total: <strong>${totalRows} rows</strong> across ${TABLES.length} tables.<br>
            To restore, decompress the file and run the provided JSON through your import script.
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename,
        content: base64,
      },
    ],
  });

  console.log(`[backup] Backup sent to ${BACKUP_TO} — ${totalRows} rows across ${TABLES.length} tables.`);
}

export function startBackupScheduler(): void {
  // Run daily at 02:00 UTC
  cron.schedule("0 2 * * *", () => {
    runBackup().catch((err) => console.error("[backup] Backup failed:", err));
  });

  console.log("[backup] Daily backup scheduler started — runs at 02:00 UTC.");
}

export { runBackup };
