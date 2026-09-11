import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync } from "node:fs";
import path from "node:path";

type Detection = {
  label: string;
  confidence: number;
};

export type DetectionResult = {
  imageDataUrl: string;
  cars: number;
  trucks: number;
  detections: Detection[];
};

type WorkerResponse =
  | { ready: true }
  | { ok: true; result: DetectionResult }
  | { ok: false; error: string };

type PendingRequest = {
  imageDataUrl: string;
  resolve: (result: DetectionResult) => void;
  reject: (error: Error) => void;
};

const workerScriptCandidates = [
  path.resolve(process.cwd(), "artifacts/api-server/src/inference_worker.py"),
  path.resolve(process.cwd(), "src/inference_worker.py"),
];
const workerScript = workerScriptCandidates.find(existsSync);

let worker: ChildProcessWithoutNullStreams | undefined;
let workerReady: Promise<void> | undefined;
let activeRequest: PendingRequest | undefined;
const queue: PendingRequest[] = [];

function startWorker(): Promise<void> {
  if (workerReady) return workerReady;

  workerReady = new Promise((resolve, reject) => {
    if (!workerScript) {
      reject(new Error("Inference worker script is not available."));
      return;
    }

    worker = spawn(process.env.PYTHON_BIN ?? "python3.11", [workerScript], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const startupTimeout = setTimeout(() => {
      reject(new Error("Inference worker did not become ready in time."));
      worker?.kill();
      worker = undefined;
      workerReady = undefined;
    }, 60_000);
    startupTimeout.unref();

    const lines = createInterface({ input: worker.stdout });
    lines.on("line", (line) => {
      let message: WorkerResponse;
      try {
        message = JSON.parse(line) as WorkerResponse;
      } catch {
        return;
      }

      if ("ready" in message) {
        clearTimeout(startupTimeout);
        resolve();
        return;
      }

      if (!activeRequest) return;
      const request = activeRequest;
      activeRequest = undefined;
      if (message.ok) {
        request.resolve(message.result);
      } else {
        request.reject(new Error(message.error));
      }
      processQueue();
    });

    worker.stderr.on("data", (chunk) => {
      process.stderr.write(`[inference-worker] ${chunk.toString()}`);
    });

    worker.once("error", (error) => {
      worker = undefined;
      workerReady = undefined;
      if (!activeRequest) return reject(error);
      activeRequest.reject(error);
      activeRequest = undefined;
      processQueue();
    });

    worker.once("exit", (code) => {
      const error = new Error(
        `Inference worker exited${code === null ? "" : ` with code ${code}`}.`,
      );
      worker = undefined;
      workerReady = undefined;
      if (activeRequest) {
        activeRequest.reject(error);
        activeRequest = undefined;
      }
      while (queue.length) queue.shift()?.reject(error);
    });

  });

  return workerReady;
}

function processQueue() {
  if (activeRequest || queue.length === 0 || !worker) return;
  activeRequest = queue.shift();
  worker.stdin.write(
    JSON.stringify({ imageDataUrl: activeRequest?.imageDataUrl }) + "\n",
  );
}

export async function detectRoadImage(imageDataUrl: string) {
  await startWorker();
  return new Promise<DetectionResult>((resolve, reject) => {
    queue.push({ imageDataUrl, resolve, reject });
    processQueue();
  });
}