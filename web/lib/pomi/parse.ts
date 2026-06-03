// Run the deterministic Python parser and return the canonical result JSON.
// Shared by the AI-mapping routes.

import { spawn } from "node:child_process";

const PYTHON = process.env.POMI_PYTHON || "python3";

export function parseBOQ(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, ["-m", "engine.run", filePath, "--offline"], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
    let out = "", err = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve(JSON.parse(out)) : reject(new Error(err || `exit ${code}`))));
  });
}
