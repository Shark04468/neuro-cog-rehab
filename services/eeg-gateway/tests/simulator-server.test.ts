import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";

import { EegSimulatorWebSocketServer, type EEGFeatureFrame } from "../src/index.js";

const stableRandom = () => 0.5;
const runningServers: EegSimulatorWebSocketServer[] = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.stop()));
});

describe("EegSimulatorWebSocketServer", () => {
  it("pushes EEGFeatureFrame messages over WebSocket", async () => {
    const server = new EegSimulatorWebSocketServer({
      port: 0,
      state: "focused",
      intervalMs: 20,
      random: stableRandom
    });
    runningServers.push(server);
    const info = await server.start();

    const socket = new WebSocket(info.url);
    const frame = await nextFrame(socket);
    socket.close();

    expect(frame).toMatchObject({
      attentionScore: 76,
      relaxationScore: 44,
      fatigueScore: 18,
      thetaPower: 0.24,
      alphaPower: 0.36,
      betaPower: 0.5,
      signalQuality: 94,
      artifactLevel: 4
    });
  });

  it("supports state selection from query string and runtime state changes", async () => {
    const server = new EegSimulatorWebSocketServer({
      port: 0,
      intervalMs: 20,
      random: stableRandom
    });
    runningServers.push(server);
    const info = await server.start();

    const socket = new WebSocket(`${info.url}?state=relaxed`);
    const relaxed = await nextFrame(socket);
    socket.send(JSON.stringify({ type: "set_state", state: "fatigued" }));
    const fatigued = await nextFrame(socket);
    socket.close();

    expect(relaxed.relaxationScore).toBeGreaterThan(relaxed.attentionScore);
    expect(fatigued.fatigueScore).toBeGreaterThan(relaxed.fatigueScore);
  });
});

async function nextFrame(socket: WebSocket): Promise<EEGFeatureFrame> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for EEG frame."));
    }, 1000);

    socket.on("message", (data) => {
      const parsed = JSON.parse(data.toString()) as Partial<EEGFeatureFrame> & { type?: string };
      if (parsed.type === "error") {
        return;
      }
      clearTimeout(timeout);
      resolve(parsed as EEGFeatureFrame);
    });
    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
