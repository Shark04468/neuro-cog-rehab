import type { TrainingReport } from "@neuro-cog-rehab/shared-types";

import type { AuthenticatedPrincipal } from "../auth/auth-types.js";

export type ReportType = "single_session" | "weekly";
export type ReportAudience = "therapist" | "parent";

export interface CreateReportInput extends TrainingReport {
  userProfileId: string;
  organizationId?: string;
  reportType: ReportType;
  audience: ReportAudience;
  htmlContent?: string;
  pdfFileName?: string;
}

export interface ReportRecord extends CreateReportInput {
  generatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportQuery {
  userId?: string;
  userProfileId?: string;
  organizationId?: string;
  reportType?: ReportType;
  audience?: ReportAudience;
  periodFrom?: string;
  periodTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportListResult {
  reports: ReportRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ReportApiRequest<
  TBody = unknown,
  TParams = Record<string, string>,
  TQuery = ReportQuery
> {
  principal: AuthenticatedPrincipal;
  body: TBody;
  params: TParams;
  query: TQuery;
}

export interface ReportApiResponse<TBody = unknown> {
  status: number;
  body: TBody;
}
