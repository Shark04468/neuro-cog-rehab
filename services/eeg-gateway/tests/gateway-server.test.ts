import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";

import {
  EegGatewayWebSocketServer,
  type EEGFeatureFrame,
  type EegGatewayOutboundEvent,
  type EegGatewaySessionSummary,
  type EegSummaryPublisher
} from "../src/index.js";

const runningServers: EegGatewayWebSocketServer[] = [];

const silentLogger = {
  info() {},
  warn() {},
  error() {}
};

class RecordingSummaryPublisher implements EegSummaryPublisher {
  readonly summaries: EegGatewaySessionSummary[] = [];

  async publish(summary: EegGatewaySessionSummary): Promise<void> {
    this.summaries.push(summary);
  }
}

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.stop()));
});

describe("EegGatewayWebSocketServer", () => {
  it("routes producer EEG frames to viewers in the same session", async () => {
    const server = await startGateway();
    const info = await server.start();

    const viewer = new WebSocket(`${info.url}?role=viewer&userId=user-1&sessionId=session-1`);
    const viewerEvents = collectEvents(viewer);
    const producer = new WebSocket(
      `${info.url}?role=producer&source=simulator&userId=user-1&sessionId=session-1`
    );
    const producerEvents = collectEvents(producer);

    await viewerEvents.waitFor("connection_ack");
    await producerEvents.waitFor("connection_ack");

    producer.send(JSON.stringify({ type: "eeg_frame", frame: frame() }));
    const event = await viewerEvents.waitFor("eeg_frame");

    viewer.close();
    producer.close();

    expect(event).toMatchObject({
      type: "eeg_frame",
      userId: "user-1",
      sessionId: "session-1",
      sequence: 1,
      source: "simulator",
      quality: {
        status: "good"
      }
    });
  });

  it("does not leak frames across different training sessions", async () => {
    const server = await startGateway();
    const info = await server.start();

    const viewerA = new WebSocket(`${info.url}?role=viewer&userId=user-1&sessionId=session-a`);
    const viewerB = new WebSocket(`${info.url}?role=viewer&userId=user-1&sessionId=session-b`);
    const producerA = new WebSocket(
      `${info.url}?role=producer&source=device&userId=user-1&sessionId=session-a`
    );
    const viewerAEvents = collectEvents(viewerA);
    const viewerBEvents = collectEvents(viewerB);
    const producerAEvents = collectEvents(producerA);

    await viewerAEvents.waitFor("connection_ack");
    await viewerBEvents.waitFor("connection_ack");
    await producerAEvents.waitFor("connection_ack");

    producerA.send(JSON.stringify({ type: "eeg_frame", frame: frame() }));
    await viewerAEvents.waitFor("eeg_frame");
    await expectNoEvent(viewerBEvents, "eeg_frame");

    viewerA.close();
    viewerB.close();
    producerA.close();
  });

  it("emits disconnected status and accepts producer reconnects for the same session", async () => {
    const server = await startGateway();
    const info = await server.start();

    const viewer = new WebSocket(`${info.url}?role=viewer&userId=user-2&sessionId=session-2`);
    const viewerEvents = collectEvents(viewer);
    const producerOne = new WebSocket(
      `${info.url}?role=producer&source=simulator&userId=user-2&sessionId=session-2`
    );
    const producerOneEvents = collectEvents(producerOne);

    await viewerEvents.waitFor("connection_ack");
    await producerOneEvents.waitFor("connection_ack");
    producerOne.send(JSON.stringify({ type: "eeg_frame", frame: frame() }));
    await viewerEvents.waitFor("eeg_frame");

    producerOne.close();
    await viewerEvents.waitFor("session_status", (event) => event.status === "disconnected");

    const producerTwo = new WebSocket(
      `${info.url}?role=producer&source=simulator&userId=user-2&sessionId=session-2`
    );
    const producerTwoEvents = collectEvents(producerTwo);
    await producerTwoEvents.waitFor("connection_ack");
    producerTwo.send(
      JSON.stringify({
        type: "eeg_frame",
        frame: frame({ timestamp: "2026-06-15T08:00:01.000Z" })
      })
    );

    const reconnectedFrame = await viewerEvents.waitFor(
      "eeg_frame",
      (event) => event.sequence === 2
    );

    viewer.close();
    producerTwo.close();

    expect(reconnectedFrame.quality).toMatchObject({ status: "good" });
  });

  it("publishes an EEG summary when the producer ends a session", async () => {
    const publisher = new RecordingSummaryPublisher();
    const server = await startGateway(publisher);
    const info = await server.start();

    const producer = new WebSocket(
      `${info.url}?role=producer&source=simulator&userId=user-3&sessionId=session-3`
    );
    const producerEvents = collectEvents(producer);
    await producerEvents.waitFor("connection_ack");

    producer.send(JSON.stringify({ type: "eeg_frame", frame: frame() }));
    producer.send(
      JSON.stringify({
        type: "eeg_frame",
        frame: frame({ timestamp: "2026-06-15T08:00:01.000Z", attentionScore: 80 })
      })
    );
    producer.send(JSON.stringify({ type: "session_end", completionStatus: "completed" }));
    const savedEvent = await producerEvents.waitFor("eeg_summary_saved");

    producer.close();

    expect(savedEvent.saved).toBe(true);
    expect(publisher.summaries).toHaveLength(1);
    expect(publisher.summaries[0]).toMatchObject({
      userId: "user-3",
      sessionId: "session-3",
      frameCount: 2,
      averageAttentionScore: 78,
      completionStatus: "completed"
    });
  });
});

async function startGateway(
  summaryPublisher: EegSummaryPublisher = new RecordingSummaryPublisher()
): Promise<EegGatewayWebSocketServer> {
  const server = new EegGatewayWebSocketServer({
    port: 0,
    heartbeatIntervalMs: 0,
    statusCheckIntervalMs: 0,
    logger: silentLogger,
    summaryPublisher
  });
  runningServers.push(server);
  return server;
}

function frame(overrides: Partial<EEGFeatureFrame> = {}): EEGFeatureFrame {
  return {
    timestamp: "2026-06-15T08:00:00.000Z",
    attentionScore: 76,
    relaxationScore: 44,
    fatigueScore: 18,
    thetaPower: 0.24,
    alphaPower: 0.36,
    betaPower: 0.5,
    signalQuality: 94,
    artifactLevel: 4,
    ...overrides
  };
}

interface EventCollector {
  waitFor(
    type: EegGatewayOutboundEvent["type"],
    predicate?: (event: Record<string, unknown>) => boolean,
    timeoutMs?: number
  ): Promise<Record<string, unknown>>;
}

function collectEvents(socket: WebSocket): EventCollector {
  const queue: Record<string, unknown>[] = [];
  const waiters: Array<{
    type: string;
    predicate: (event: Record<string, unknown>) => boolean;
    resolve: (event: Record<string, unknown>) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  socket.on("message", (data) => {
    const parsed = JSON.parse(data.toString()) as unknown;
    if (!isRecord(parsed)) {
      return;
    }

    const waiterIndex = waiters.findIndex(
      (waiter) => waiter.type === parsed.type && waiter.predicate(parsed)
    );
    if (waiterIndex >= 0) {
      const waiter = waiters[waiterIndex];
      if (!waiter) {
        return;
      }
      clearTimeout(waiter.timeout);
      waiters.splice(waiterIndex, 1);
      waiter.resolve(parsed);
      return;
    }

    queue.push(parsed);
  });

  socket.on("error", (error) => {
    for (const waiter of waiters.splice(0)) {
      clearTimeout(waiter.timeout);
      waiter.reject(error);
    }
  });

  return {
    waitFor(type, predicate = () => true, timeoutMs = 1000) {
      const queuedIndex = queue.findIndex((event) => event.type === type && predicate(event));
      if (queuedIndex >= 0) {
        const event = queue[queuedIndex];
        queue.splice(queuedIndex, 1);
        return Promise.resolve(event ?? {});
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timed out waiting for event ${type}.`));
        }, timeoutMs);
        waiters.push({ type, predicate, resolve, reject, timeout });
      });
    }
  };
}

async function expectNoEvent(
  collector: EventCollector,
  type: EegGatewayOutboundEvent["type"]
): Promise<void> {
  await expect(collector.waitFor(type, undefined, 120)).rejects.toThrow(
    `Timed out waiting for event ${type}.`
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
