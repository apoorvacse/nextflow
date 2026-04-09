import {
  defineConfig
} from "../../chunk-YWM2BBGL.mjs";
import "../../chunk-5A54AS5L.mjs";
import {
  init_esm
} from "../../chunk-4DNCWKMJ.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: "proj_kzahizgypnaqhjndxjzi",
  runtime: "node",
  logLevel: "log",
  // Set the maxDuration to 300 seconds for tasks
  maxDuration: 300,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1e3,
      maxTimeoutInMs: 1e4,
      factor: 2,
      randomize: true
    }
  },
  dirs: ["./src/trigger"],
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
