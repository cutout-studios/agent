import { join } from "@std/path";
import { format } from "@std/fmt/bytes";
import { readEnv } from "../libraries/readEnv.ts";

const OUTPUT_ROOT = readEnv(
  "XO_AGENT_OUTPUT_ROOT",
  /* default value */ ".output",
);

const OUTPUT_MODEL_CACHE_ROOT = join(OUTPUT_ROOT, "model");

const HF_TOKEN = readEnv("XO_AGENT_HF_TOKEN", "");
const HF_ENDPOINT = "https://huggingface.co";

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

  try {
    const response = await fetch(
      urlResolver(modelRepoID, filePath),
      {
        headers: authResolver(),
      },
    );

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
  } catch (cause) {
    throw new Error("TODO: error message", { cause });
  }
};

const _logStreamProgress = (fileName: string, totalBytes: number) => {
  let downloadedBytes = 0;

  return new TransformStream({
    transform(chunk, next) {
      downloadedBytes += chunk.length;

      Deno.stdout.writeSync(
        new TextEncoder().encode(
          `\x1b[2K\rPROGRESS ${fileName} ${(totalBytes > 0
            ? ((downloadedBytes / totalBytes) * 100).toFixed(2) + "%"
            : format(downloadedBytes))}`,
        ),
      );

      next.enqueue(chunk);
    },
    flush() {
      console.log("\nDONE", fileName);
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
