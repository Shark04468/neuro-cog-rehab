import type { EegGatewaySessionSummary } from "./types.js";

export interface EegSummaryPublisher {
  publish(summary: EegGatewaySessionSummary): Promise<void>;
}

export interface HttpEegSummaryPublisherOptions {
  endpoint: string;
  bearerToken?: string;
  fetchImpl?: typeof fetch;
}

export class DisabledEegSummaryPublisher implements EegSummaryPublisher {
  async publish(): Promise<void> {
    return Promise.resolve();
  }
}

export class HttpEegSummaryPublisher implements EegSummaryPublisher {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: HttpEegSummaryPublisherOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async publish(summary: EegGatewaySessionSummary): Promise<void> {
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };

    if (this.options.bearerToken) {
      headers.authorization = `Bearer ${this.options.bearerToken}`;
    }

    const response = await this.fetchImpl(this.options.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(summary)
    });

    if (!response.ok) {
      throw new Error(`EEG summary API responded with ${response.status}.`);
    }
  }
}
