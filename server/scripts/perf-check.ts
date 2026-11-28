// TEST-PERF-01 (NFR-10, AC-16-6): p95 latency of history, summary, spending and reports
// for a user with 2,000 transactions. Usage:
//   BASE_URL=http://localhost:4000 PERF_EMAIL=... PERF_PASSWORD=... npx tsx scripts/perf-check.ts [--seed]
// --seed creates a throw-away user with 2,000 synthetic transactions directly in the database
// (needs DATABASE_URL) and removes it at the end.
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { STARTER_ACCOUNTS } from "../prisma/starter-accounts";

const BASE = process.env.BASE_URL ?? "http://localhost:4000";
const N_TX = 2000;
const RUNS = 50;
const seed = process.argv.includes("--seed");

async function main() {
  const prisma = new PrismaClient();
  let email = process.env.PERF_EMAIL ?? "";
  let password = process.env.PERF_PASSWORD ?? "";
  let userId = "";
  if (seed) {
    email = `perf.${Date.now()}@moneylog.test`;
    password = "perfcheck2026";
    const user = await prisma.user.create({ data: { email, fullName: "Perf check", passwordHash: await bcrypt.hash(password, 10) } });
    userId = user.id;
    await prisma.financialAccount.createMany({ data: STARTER_ACCOUNTS.map((a) => ({ ...a, subtype: a.subtype ?? null, ownerId: user.id })) });
    const ids = Object.fromEntries((await prisma.financialAccount.findMany({ where: { ownerId: user.id } })).map((a) => [a.name, a.id]));
    const expense = ["Dining", "Groceries", "Electricity", "Telecom"].map((n) => ids[n]);
    for (let i = 0; i < N_TX; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + (i % 330) * 86400000);
      const amount = 1000 + (i % 97) * 37;
      await prisma.transaction.create({
        data: { ownerId: user.id, kind: "PAYMENT", date: d, description: `perf ${i}`, totalAmount: amount, primaryAccountId: ids["Bangkok Bank Savings"],
          lines: { create: [{ accountId: expense[i % 4], amount, position: 0 }] } },
      });
    }
  }
  const login = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const { token } = (await login.json()) as { token: string };
  const h = { Authorization: `Bearer ${token}` };
  const endpoints = ["/api/transactions?limit=50", "/api/transactions?q=perf%201&limit=50", "/api/summary?from=2026-01-01&to=2026-11-30", "/api/spending?from=2026-01-01&to=2026-11-30", "/api/reports/monthly?months=12", "/api/accounts"];
  console.log(`TEST-PERF-01 base=${BASE} transactions=${seed ? N_TX : "existing"} runs=${RUNS}`);
  let worst = 0;
  for (const p of endpoints) {
    const times: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      const r = await fetch(BASE + p, { headers: h });
      await r.arrayBuffer();
      if (!r.ok) throw new Error(`${p} → ${r.status}`);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.ceil(0.95 * RUNS) - 1];
    worst = Math.max(worst, p95);
    console.log(`${p.padEnd(42)} p50 ${times[Math.floor(RUNS / 2)].toFixed(1)} ms  p95 ${p95.toFixed(1)} ms  max ${times[RUNS - 1].toFixed(1)} ms`);
  }
  console.log(`worst p95 = ${worst.toFixed(1)} ms → ${worst < 500 ? "PASS" : "FAIL"} (target < 500 ms)`);
  if (userId) {
    await prisma.allocationLine.deleteMany({ where: { transaction: { ownerId: userId } } });
    await prisma.transaction.deleteMany({ where: { ownerId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
  await prisma.$disconnect();
  if (worst >= 500) process.exit(1);
}
main();
