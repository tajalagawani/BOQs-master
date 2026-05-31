// pm2 process config — used by deploy.yml and azure-bootstrap.sh.
// Both processes run from /home/iox/app/web on the Azure VM.

module.exports = {
  apps: [
    {
      name: "iox-web",
      cwd: __dirname,
      script: "npm",
      args: "start",
      env: { PORT: 3000, NODE_ENV: "production" },
    },
    {
      name: "iox-worker",
      cwd: __dirname,
      script: "tsx",
      args: "scripts/dev-worker.ts",
    },
  ],
};
