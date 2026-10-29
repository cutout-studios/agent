import { join } from "@std/path";
import { format } from "@std/fmt/bytes";

import { HF_TOKEN, OUTPUT_ROOT } from "../constants.env.ts";

const OUTPUT_MODEL_CACHE_ROOT = join(OUTPUT_ROOT, "model"),
  HF_ENDPOINT = "https://huggingface.co";

export const getFile = async (
  modelRepoID: string,
  filePath: string,
  urlResolver = (modelRepoID: string, filePath: string) =>
    `${HF_ENDPOINT}/${modelRepoID}/resolve/main/${filePath}`,
  authResolver = () =>
    (HF_TOKEN
      ? {
        Authorization: `Bearer ${HF_TOKEN}`,
      }
      : {}) as Headers,
): Promise<ReadableStream<Uint8Array>> => {
  const modelRepoRoot = join(OUTPUT_MODEL_CACHE_ROOT, modelRepoID),
    modelRepoFilepath = join(modelRepoRoot, filePath);

  await Deno.mkdir(modelRepoRoot, { recursive: true });

  const localFileHandle = await Deno.open(modelRepoFilepath, {
    read: true,
    create: true,
    write: true,
  });

  try {
    if ((await localFileHandle.stat()).size > 0) {
      return localFileHandle.readable;
    }
  } catch {
    // okay, fetch it then
  }

  const response = await fetch(
    urlResolver(modelRepoID, filePath),
    {
      headers: authResolver(),
    },
  );

  if (!response.ok) {
    throw new Error(`"${filePath}" not found in "${modelRepoRoot}".`);
  }

  return response.body!
    .pipeThrough(
      _logStreamProgress(
        filePath,
        Number(response.headers.get("content-length")),
      ),
    )
    .pipeThrough(
      _writeStreamData(localFileHandle),
    );
};

const _log = (...messages: unknown[]) =>
  Deno.stdout.writeSync(
    new TextEncoder().encode(
      messages.map(String).join(" "),
    ),
  );

const _logStreamProgress = (fileName: string, totalBytes: number) => {
  let downloadedBytes = 0;

  return new TransformStream({
    transform(chunk, next) {
      downloadedBytes += chunk.length;

      _log(
        "\x1b[2K\rPROGRESS",
        fileName,
        totalBytes > 0
          ? ((downloadedBytes / totalBytes) * 100).toFixed(2) + "%"
          : format(downloadedBytes),
      ), next.enqueue(chunk);
    },
    flush() {
      _log("\nDONE", fileName, "\n");
    },
  });
};

const _writeStreamData = ({ writable }: Deno.FsFile) => {
  const writer = writable.getWriter();

  return new TransformStream({
    async transform(chunk, next) {
      await writer.write(chunk);

      next.enqueue(chunk);
    },
    async flush() {
      await writer.close();
    },
  });
};
