import {
  require_ffmpeg,
  require_ffprobe,
  require_fluent_ffmpeg,
  uploadToTransloadit
} from "./chunk-EM6ETJLN.mjs";
import {
  task
} from "./chunk-YWM2BBGL.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "./chunk-4DNCWKMJ.mjs";

// src/trigger/extractFrameTask.ts
init_esm();
var import_fluent_ffmpeg = __toESM(require_fluent_ffmpeg());
var import_ffmpeg = __toESM(require_ffmpeg());
var import_ffprobe = __toESM(require_ffprobe());
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import_fluent_ffmpeg.default.setFfmpegPath(import_ffmpeg.default.path);
import_fluent_ffmpeg.default.setFfprobePath(import_ffprobe.default.path);
var extractFrameTask = task({
  id: "extract-frame",
  retry: { maxAttempts: 2 },
  run: /* @__PURE__ */ __name(async (payload) => {
    const { videoUrl, timestamp } = payload;
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    const tmpDir = os.tmpdir();
    const id = crypto.randomBytes(8).toString("hex");
    const ext = videoUrl.split(".").pop()?.split("?")[0] ?? "mp4";
    const inputPath = path.join(tmpDir, `frame-input-${id}.${ext}`);
    const outputPath = path.join(tmpDir, `frame-output-${id}.jpg`);
    await fs.writeFile(inputPath, Buffer.from(buffer));
    let seekTime = 0;
    if (timestamp.includes("%")) {
      const pct = parseFloat(timestamp) / 100;
      const duration = await new Promise((resolve, reject) => {
        import_fluent_ffmpeg.default.ffprobe(inputPath, (err, metadata) => {
          if (err) reject(err);
          resolve(metadata?.format?.duration ?? 10);
        });
      });
      seekTime = pct * duration;
    } else {
      seekTime = parseFloat(timestamp) || 0;
    }
    await new Promise((resolve, reject) => {
      (0, import_fluent_ffmpeg.default)(inputPath).seekInput(seekTime).frames(1).output(outputPath).on("end", resolve).on("error", reject).run();
    });
    const frameUrl = await uploadToTransloadit(outputPath, "image");
    await fs.unlink(inputPath).catch(() => {
    });
    await fs.unlink(outputPath).catch(() => {
    });
    return { frameUrl };
  }, "run")
});

export {
  extractFrameTask
};
//# sourceMappingURL=chunk-H6NA5XMQ.mjs.map
