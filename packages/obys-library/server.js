import path from "node:path";
import { fileURLToPath } from "node:url";
import { startMirrorServer } from "../../scripts/lib/mirror-server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 4173) || 4173;
const csp = process.env.MIRROR_CSP || "self";
const enableRange = process.env.MIRROR_RANGE === "false" ? false : true;

startMirrorServer({
  rootDir,
  port,
  csp,
  enableRange,
  log: (message) => console.log(message)
})
  .then(({ port: resolvedPort }) => {
    console.log(`Obys library clone running at http://localhost:${resolvedPort}`);
  })
  .catch((error) => {
    console.error("[obys-library] failed to start mirror server", error);
    process.exitCode = 1;
  });
