/**
 * Shared UI Components
 * Reusable React components for UI patterns
 */

import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import {
  getSeverityIconType,
  getSeverityIconColor,
  type UISeverity,
} from './ui-helpers';

/**
 * Gets the appropriate icon component for a UI severity type
 * @param type - UI severity type
 * @returns React icon component with styling
 *
 * @example
 * <SeverityIcon type="success" />
 * <SeverityIcon type="danger" />
 */
export function SeverityIcon({ type }: { type: UISeverity }): JSX.Element {
  const iconType = getSeverityIconType(type);
  const colorClass = getSeverityIconColor(type);
  const className = `h-5 w-5 ${colorClass}`;

  switch (iconType) {
    case 'check':
      return <CheckCircle2 className={className} />;
    case 'alert':
      return <AlertTriangle className={className} />;
    case 'info':
    default:
      return <Info className={className} />;
  }
}
