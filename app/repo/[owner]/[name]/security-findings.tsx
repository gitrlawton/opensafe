import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { Finding } from "@/types/scan";

interface SecurityCategoryProps {
  categoryKey: string;
  title: string;
  description: string;
  findings: Finding[];
}

/**
 * Get the icon component for a finding type
 */
function getIcon(type: string): JSX.Element {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case "danger":
      return <AlertTriangle className="h-5 w-5 text-danger" />;
    default:
      return <Info className="h-5 w-5 text-primary" />;
  }
}

/**
 * Get the border color class for a finding type
 */
function getBorderColor(type: string): string {
  switch (type) {
    case "success":
      return "border-l-success";
    case "warning":
      return "border-l-warning";
    case "danger":
      return "border-l-danger";
    default:
      return "border-l-primary";
  }
}

/**
 * Get the badge color class for a finding type
 */
function getBadgeColor(type: string): string {
  return type === "danger"
    ? "bg-danger/20 text-danger"
    : "bg-warning/20 text-warning";
}

/**
 * Get the category title for a given category key
 */
function getCategoryTitle(categoryKey: string): string {
  switch (categoryKey) {
    case "maliciousCode":
      return "Malicious Code Issues";
    case "dependencies":
      return "Dependency Issues";
    case "networkActivity":
      return "Network Activity Issues";
    case "fileSystemSafety":
      return "File System Issues";
    case "credentialSafety":
      return "Credential Safety Issues";
    default:
      return "Unknown Issues";
  }
}

/**
 * Render a single finding card
 */
function FindingCard({ finding, type }: { finding: Finding; type: string }): JSX.Element {
  return (
    <div
      className={`flex gap-3 p-4 rounded-lg border-l-4 bg-muted/30 ${getBorderColor(type)} ml-9`}
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon(type)}</div>
      <div>
        <h4 className="font-semibold mb-1">{finding.item}</h4>
        <p className="text-sm text-muted-foreground mb-1">{finding.issue}</p>
        <p className="text-xs text-muted-foreground">
          Location: {finding.location}
        </p>
        {finding.codeSnippet && (
          <pre className="mt-2 text-xs bg-muted p-2 rounded whitespace-pre-wrap break-words">
            {finding.codeSnippet}
          </pre>
        )}
      </div>
    </div>
  );
}

/**
 * Render a category with findings
 */
function CategoryWithFindings({
  categoryKey,
  findings,
}: {
  categoryKey: string;
  findings: Finding[];
}): JSX.Element {
  const findingsCount = findings.length;

  // Determine the most severe level in this category
  let categorySeverity = "moderate"; // Default to moderate if there are findings
  const hasSevere = findings.some((f) => f.severity === "severe");
  if (hasSevere) categorySeverity = "severe";

  const categoryType = categorySeverity === "severe" ? "danger" : "warning";

  return (
    <div className="space-y-3">
      <div
        className={`flex gap-3 p-4 rounded-lg border-l-4 bg-muted/30 ${getBorderColor(categoryType)}`}
      >
        <div className="flex-shrink-0 mt-0.5">
          <div
            className={`flex items-center justify-center w-6 h-6 rounded-full ${getBadgeColor(categoryType)} font-bold text-sm`}
          >
            {findingsCount}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-1">
            {getCategoryTitle(categoryKey)}
          </h4>
          <p className="text-sm text-muted-foreground">
            {findingsCount} issue
            {findingsCount > 1 ? "s" : ""} detected
          </p>
        </div>
      </div>
      {findings.map((finding, index) => {
        const severity = finding.severity || "moderate";
        const type = severity === "severe" ? "danger" : "warning";

        return <FindingCard key={index} finding={finding} type={type} />;
      })}
    </div>
  );
}

/**
 * Render a category with no findings (success state)
 */
function CategorySuccess({ title, description }: SecurityCategoryProps): JSX.Element {
  return (
    <div className="flex gap-3 p-4 rounded-lg border-l-4 bg-muted/30 border-l-success">
      <div className="flex-shrink-0 mt-0.5">
        <CheckCircle2 className="h-5 w-5 text-success" />
      </div>
      <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/**
 * Main component to render a security category
 */
export function SecurityCategory({
  categoryKey,
  title,
  description,
  findings,
}: SecurityCategoryProps): JSX.Element {
  const hasFindings = findings.length > 0;

  if (hasFindings) {
    return (
      <CategoryWithFindings categoryKey={categoryKey} findings={findings} />
    );
  }

  return (
    <CategorySuccess
      categoryKey={categoryKey}
      title={title}
      description={description}
      findings={findings}
    />
  );
}
