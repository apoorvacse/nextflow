import {
  require_ffmpeg,
  require_fluent_ffmpeg,
  uploadToTransloadit
} from "./chunk-XDZ737ZI.mjs";
import {
  task
} from "./chunk-YWM2BBGL.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "./chunk-4DNCWKMJ.mjs";

// src/trigger/cropImageTask.ts
init_esm();
var import_fluent_ffmpeg = __toESM(require_fluent_ffmpeg());
var import_ffmpeg = __toESM(require_ffmpeg());
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import_fluent_ffmpeg.default.setFfmpegPath(import_ffmpeg.default.path);
var cropImageTask = task({
  id: "crop-image",
  retry: { maxAttempts: 2 },
  run: /* @__PURE__ */ __name(async (payload) => {
    const { imageUrl, xPercent, yPercent, widthPercent, heightPercent } = payload;
    if (!imageUrl) throw new Error("Missing imageUrl input");
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    const tmpDir = os.tmpdir();
    const inputId = crypto.randomBytes(8).toString("hex");
    const parsedUrl = new URL(imageUrl);
    const extFromPath = path.extname(parsedUrl.pathname).replace(".", "").toLowerCase();
    const ext = /^[a-z0-9]{2,5}$/.test(extFromPath) ? extFromPath : "jpg";
    const inputPath = path.join(tmpDir, `crop-input-${inputId}.${ext}`);
    const outputPath = path.join(tmpDir, `crop-output-${inputId}.jpg`);
    await fs.writeFile(inputPath, Buffer.from(buffer));
    const dimensions = await new Promise((resolve, reject) => {
      import_fluent_ffmpeg.default.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        const stream = metadata?.streams?.find(
          (s) => s.codec_type === "video" || s.codec_type === "image"
        );
        resolve({ width: stream?.width ?? 1e3, height: stream?.height ?? 1e3 });
      });
    });
    const cropX = Math.round(xPercent / 100 * dimensions.width);
    const cropY = Math.round(yPercent / 100 * dimensions.height);
    const cropW = Math.round(widthPercent / 100 * dimensions.width);
    const cropH = Math.round(heightPercent / 100 * dimensions.height);
    await new Promise((resolve, reject) => {
      (0, import_fluent_ffmpeg.default)(inputPath).videoFilter(`crop=${cropW}:${cropH}:${cropX}:${cropY}`).frames(1).output(outputPath).on("end", resolve).on("error", reject).run();
    });
    const croppedUrl = await uploadToTransloadit(outputPath, "image");
    await fs.unlink(inputPath).catch(() => {
    });
    await fs.unlink(outputPath).catch(() => {
    });
    return { croppedUrl };
  }, "run")
});

export {
  cropImageTask
};
//# sourceMappingURL=chunk-5FATYZTA.mjs.map
