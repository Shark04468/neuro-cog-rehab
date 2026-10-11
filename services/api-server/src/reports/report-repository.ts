import type { CreateReportInput, ReportQuery, ReportRecord } from "./report-types.js";

export interface ReportRepository {
  create(input: CreateReportInput & { generatedByUserId: string }): Promise<ReportRecord>;
  findById(id: string): Promise<ReportRecord | undefined>;
  findMany(query: ReportQuery): Promise<ReportRecord[]>;
}

export class InMemoryReportRepository implements ReportRepository {
  private readonly reports = new Map<string, ReportRecord>();

  async create(input: CreateReportInput & { generatedByUserId: string }): Promise<ReportRecord> {
    const now = new Date().toISOString();
    const record: ReportRecord = {
      ...input,
      createdAt: now,
      updatedAt: now
    };
    this.reports.set(record.id, clone(record));
    return clone(record);
  }

  async findById(id: string): Promise<ReportRecord | undefined> {
    const record = this.reports.get(id);
    return record === undefined ? undefined : clone(record);
  }

  async findMany(query: ReportQuery): Promise<ReportRecord[]> {
    const periodFromMs = query.periodFrom ? Date.parse(query.periodFrom) : undefined;
    const periodToMs = query.periodTo ? Date.parse(query.periodTo) : undefined;

    return [...this.reports.values()]
      .filter((report) => {
        const periodEndMs = Date.parse(report.periodEnd);
        return (
          (query.userId === undefined || report.userId === query.userId) &&
          (query.userProfileId === undefined || report.userProfileId === query.userProfileId) &&
          (query.organizationId === undefined || report.organizationId === query.organizationId) &&
          (query.reportType === undefined || report.reportType === query.reportType) &&
          (query.audience === undefined || report.audience === query.audience) &&
          (periodFromMs === undefined || periodEndMs >= periodFromMs) &&
          (periodToMs === undefined || periodEndMs <= periodToMs)
        );
      })
      .sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt))
      .map(clone);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
