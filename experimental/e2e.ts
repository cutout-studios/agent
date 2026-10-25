import { getFile } from "./getFile.ts";

const flush = (stream: ReadableStream) => stream.pipeTo(new WritableStream());

await flush(await getFile("Qwen/Qwen2.5-0.5B-Instruct", "model.safetensors"));
