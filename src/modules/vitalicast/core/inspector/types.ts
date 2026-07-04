export type ArchiveHealthStatus = "healthy" | "warning" | "failed";
export type ArchiveFindingSeverity = "info" | "warning" | "failed";

export interface ArchiveFinding {
  severity: ArchiveFindingSeverity;
  message: string;
  details?: any;
}

export interface ArchiveUnsupportedCheck {
  checkName: string;
  reason: string;
}

export interface ArchiveHealthReport {
  status: ArchiveHealthStatus;
  authoritativeRecordCount: number;
  fallbackRecordCount: number;
  addendumCount: number;
  missingFieldFindings: ArchiveFinding[];
  hashMismatchFindings: ArchiveFinding[];
  linkageFindings: ArchiveFinding[];
  unsupportedChecks: ArchiveUnsupportedCheck[];
  scannedAt: string;
  isAuthoritativeEnvironment: boolean;
}
