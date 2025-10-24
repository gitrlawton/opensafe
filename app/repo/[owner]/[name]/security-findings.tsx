import type { Finding } from "@/types/scan";
import {
  getSeverityBorderColor,
  getSeverityBadgeColor,
  getCategoryTitle,
  mapSeverityToUIType,
  type UISeverity,
} from "@/lib/ui-helpers";
import { SeverityIcon } from "@/lib/ui-components";

interface SecurityCategoryProps {
  categoryKey: string;
  title: string;
  description: string;
  findings: Finding[];
}

/**
 * Render a single finding card
 */
function FindingCard({
  finding,
  type,
}: {
  finding: Finding;
  type: UISeverity;
}): JSX.Element {
  return (
    <div
      className={`flex gap-3 p-4 rounded-lg border-l-4 bg-muted/30 ${getSeverityBorderColor(type)} ml-9`}
    >
      <div className="flex-shrink-0 mt-0.5">
        <SeverityIcon type={type} />
      </div>
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
  const hasSevere = findings.some((f) => f.severity === "severe");
  const categoryType: UISeverity = hasSevere ? "danger" : "warning";

  return (
    <div className="space-y-3">
      <div
        className={`flex gap-3 p-4 rounded-lg border-l-4 bg-muted/30 ${getSeverityBorderColor(categoryType)}`}
      >
        <div className="flex-shrink-0 mt-0.5">
          <div
            className={`flex items-center justify-center w-6 h-6 rounded-full ${getSeverityBadgeColor(categoryType)} font-bold text-sm`}
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
        const type = mapSeverityToUIType(finding.severity || "moderate");
        return <FindingCard key={index} finding={finding} type={type} />;
      })}
    </div>
  );
}

/**
 * Render a category with no findings (success state)
 */
function CategorySuccess({
  title,
  description,
}: SecurityCategoryProps): JSX.Element {
  return (
    <div
      className={`flex gap-3 p-4 rounded-lg border-l-4 bg-muted/30 ${getSeverityBorderColor("success")}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        <SeverityIcon type="success" />
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
