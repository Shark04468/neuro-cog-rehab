import { AuthModuleError, requireCondition } from "../auth/auth-errors.js";
import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import type {
  AccessControlService,
  AccessTarget
} from "../access-control/access-control-service.js";
import type { ReportRepository } from "./report-repository.js";
import type {
  CreateReportInput,
  ReportListResult,
  ReportQuery,
  ReportRecord
} from "./report-types.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const FORBIDDEN_REPORT_TERMS = [
  "diagnosis",
  "diagnostic",
  "cure",
  "guaranteed efficacy",
  "\u786e\u8bca",
  "\u6cbb\u6108",
  "\u7597\u6548\u4fdd\u8bc1",
  "\u8bca\u65ad"
];

export interface ReportServiceDependencies {
  repository: ReportRepository;
  accessControl: AccessControlService;
}

/**
 * Report persistence use cases. Reports are saved as training-record and trend
 * summaries for authorized review only.
 */
export class ReportService {
  constructor(private readonly dependencies: ReportServiceDependencies) {}

  async createReport(
    principal: AuthenticatedPrincipal,
    input: CreateReportInput
  ): Promise<ReportRecord> {
    this.validateCreateInput(input);
    await this.dependencies.accessControl.assertCanAccessProfile(principal, accessTargetFor(input));
    this.assertCanCreate(principal);

    return this.dependencies.repository.create({
      ...input,
      generatedByUserId: principal.userId
    });
  }

  async readReport(principal: AuthenticatedPrincipal, reportId: string): Promise<ReportRecord> {
    const report = await this.dependencies.repository.findById(reportId);
    if (report === undefined) {
      throw new AuthModuleError("RESOURCE_NOT_FOUND", "Training report was not found.");
    }
    await this.dependencies.accessControl.assertCanAccessProfile(
      principal,
      accessTargetFor(report)
    );
    return report;
  }

  async listReports(
    principal: AuthenticatedPrincipal,
    query: ReportQuery
  ): Promise<ReportListResult> {
    this.validateQuery(query);
    const reports = await this.dependencies.repository.findMany(query);
    const visibleReports: ReportRecord[] = [];

    for (const report of reports) {
      const decision = await this.dependencies.accessControl.canAccessProfile(
        principal,
        accessTargetFor(report)
      );
      if (decision.allowed) {
        visibleReports.push(report);
      }
    }

    const page = normalizePage(query.page);
    const pageSize = normalizePageSize(query.pageSize);
    const startIndex = (page - 1) * pageSize;

    return {
      reports: visibleReports.slice(startIndex, startIndex + pageSize),
      pagination: {
        page,
        pageSize,
        totalItems: visibleReports.length,
        totalPages: Math.max(1, Math.ceil(visibleReports.length / pageSize))
      }
    };
  }

  private validateCreateInput(input: CreateReportInput): void {
    requireCondition(input.id.trim().length > 0, "VALIDATION_ERROR", "Report id is required.");
    requireCondition(input.userId.trim().length > 0, "VALIDATION_ERROR", "User id is required.");
    requireCondition(
      input.userProfileId.trim().length > 0,
      "VALIDATION_ERROR",
      "User profile id is required."
    );
    requireCondition(
      input.reportType === "single_session" || input.reportType === "weekly",
      "VALIDATION_ERROR",
      "Report type is invalid."
    );
    requireCondition(
      input.audience === "therapist" || input.audience === "parent",
      "VALIDATION_ERROR",
      "Report audience is invalid."
    );
    requireCondition(
      isValidIsoDate(input.periodStart) && isValidIsoDate(input.periodEnd),
      "VALIDATION_ERROR",
      "Report period is invalid."
    );
    requireCondition(
      Date.parse(input.periodEnd) >= Date.parse(input.periodStart),
      "VALIDATION_ERROR",
      "Report period end cannot be earlier than start."
    );
    requireCondition(
      isValidIsoDate(input.generatedAt),
      "VALIDATION_ERROR",
      "Report generated timestamp is invalid."
    );
    requireCondition(
      input.sessionCount >= 0 && input.completedSessionCount >= 0,
      "VALIDATION_ERROR",
      "Report session counts must be non-negative."
    );
    requireCondition(
      input.completedSessionCount <= input.sessionCount,
      "VALIDATION_ERROR",
      "Completed session count cannot exceed session count."
    );
    requireCondition(
      input.averageCompletionRate >= 0 && input.averageCompletionRate <= 1,
      "VALIDATION_ERROR",
      "Average completion rate must be between 0 and 1."
    );
    this.assertNoForbiddenTerms(input);
  }

  private validateQuery(query: ReportQuery): void {
    if (query.reportType !== undefined) {
      requireCondition(
        query.reportType === "single_session" || query.reportType === "weekly",
        "VALIDATION_ERROR",
        "Report type is invalid."
      );
    }
    if (query.audience !== undefined) {
      requireCondition(
        query.audience === "therapist" || query.audience === "parent",
        "VALIDATION_ERROR",
        "Report audience is invalid."
      );
    }
    if (query.periodFrom !== undefined) {
      requireCondition(
        isValidIsoDate(query.periodFrom),
        "VALIDATION_ERROR",
        "Period start invalid."
      );
    }
    if (query.periodTo !== undefined) {
      requireCondition(isValidIsoDate(query.periodTo), "VALIDATION_ERROR", "Period end invalid.");
    }
  }

  private assertCanCreate(principal: AuthenticatedPrincipal): void {
    requireCondition(
      principal.roles.some(
        (role) => role === "therapist" || role === "org_admin" || role === "system_admin"
      ),
      "PERMISSION_DENIED",
      "Role cannot create training reports."
    );
  }

  private assertNoForbiddenTerms(input: CreateReportInput): void {
    const text = [
      input.narrativeSummary,
      input.dataScopeNotice,
      input.htmlContent ?? "",
      ...input.nextTrainingFocus
    ]
      .join(" ")
      .toLowerCase();
    const matched = FORBIDDEN_REPORT_TERMS.find((term) => text.includes(term.toLowerCase()));
    requireCondition(
      matched === undefined,
      "VALIDATION_ERROR",
      "Report wording must stay within training-record and trend-review boundaries."
    );
  }
}

function accessTargetFor(
  record: Pick<CreateReportInput, "userProfileId" | "organizationId">
): AccessTarget {
  const target: AccessTarget = {
    userProfileId: record.userProfileId
  };
  if (record.organizationId !== undefined) {
    target.organizationId = record.organizationId;
  }
  return target;
}

function normalizePage(page: number | undefined): number {
  return page === undefined || page < 1 ? DEFAULT_PAGE : Math.floor(page);
}

function normalizePageSize(pageSize: number | undefined): number {
  if (pageSize === undefined || pageSize < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(Math.floor(pageSize), MAX_PAGE_SIZE);
}

function isValidIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}
