const { spawn } = require("child_process");
const server = spawn("node", ["dist/server/server.js"], { stdio: "ignore" });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch("http://localhost:8080/generators/typescript?included_schemas=public&detect_one_to_one_relationships=true");
      if (res.ok) {
        process.stdout.write(await res.text());
        server.kill();
        return;
      }
    } catch {}
    await wait(200);
  }
  server.kill();
  process.exit(1);
})();
