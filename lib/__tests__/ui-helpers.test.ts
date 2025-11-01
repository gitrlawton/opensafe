/**
 * Tests for UI Helper Utilities
 *
 * This test suite validates the UI helper functions that map
 * data models to visual representations (colors, icons, labels).
 */

import {
  mapSeverityToUIType,
  getSeverityIconType,
  getSeverityIconColor,
  getSeverityBorderColor,
  getSeverityBadgeColor,
  getSeverityBackgroundColor,
  getCategoryTitle,
  getCategoryDescription,
  mapSafetyScoreToUIType,
  getSafetyScoreLabel,
} from '../ui-helpers';

describe('UI Helpers', () => {
  describe('mapSeverityToUIType', () => {
    it('should map severe to danger', () => {
      expect(mapSeverityToUIType('severe')).toBe('danger');
    });

    it('should map moderate to warning', () => {
      expect(mapSeverityToUIType('moderate')).toBe('warning');
    });

    it('should map low to warning', () => {
      expect(mapSeverityToUIType('low')).toBe('warning');
    });
  });

  describe('getSeverityIconType', () => {
    it('should return check icon for success', () => {
      expect(getSeverityIconType('success')).toBe('check');
    });

    it('should return alert icon for warning', () => {
      expect(getSeverityIconType('warning')).toBe('alert');
    });

    it('should return alert icon for danger', () => {
      expect(getSeverityIconType('danger')).toBe('alert');
    });

    it('should return info icon for unknown types', () => {
      expect(getSeverityIconType('info')).toBe('info');
    });
  });

  describe('getSeverityIconColor', () => {
    it('should return correct Tailwind classes for each severity', () => {
      expect(getSeverityIconColor('success')).toBe('text-success');
      expect(getSeverityIconColor('warning')).toBe('text-warning');
      expect(getSeverityIconColor('danger')).toBe('text-danger');
      expect(getSeverityIconColor('info')).toBe('text-primary');
    });
  });

  describe('getSeverityBorderColor', () => {
    it('should return correct border classes', () => {
      expect(getSeverityBorderColor('success')).toBe('border-l-success');
      expect(getSeverityBorderColor('warning')).toBe('border-l-warning');
      expect(getSeverityBorderColor('danger')).toBe('border-l-danger');
    });
  });

  describe('getSeverityBadgeColor', () => {
    it('should return badge classes with opacity', () => {
      expect(getSeverityBadgeColor('success')).toBe('bg-success/20 text-success');
      expect(getSeverityBadgeColor('warning')).toBe('bg-warning/20 text-warning');
      expect(getSeverityBadgeColor('danger')).toBe('bg-danger/20 text-danger');
    });
  });

  describe('getSeverityBackgroundColor', () => {
    it('should return background classes with border variants', () => {
      expect(getSeverityBackgroundColor('success')).toContain('bg-success/10');
      expect(getSeverityBackgroundColor('success')).toContain('text-success');
      expect(getSeverityBackgroundColor('success')).toContain('border-success/20');
    });
  });

  describe('getCategoryTitle', () => {
    it('should return correct titles for known categories', () => {
      expect(getCategoryTitle('maliciousCode')).toBe('Malicious Code Issues');
      expect(getCategoryTitle('dependencies')).toBe('Dependency Issues');
      expect(getCategoryTitle('networkActivity')).toBe('Network Activity Issues');
      expect(getCategoryTitle('fileSystemSafety')).toBe('File System Issues');
      expect(getCategoryTitle('credentialSafety')).toBe('Credential Safety Issues');
    });

    it('should return Unknown Issues for unknown categories', () => {
      expect(getCategoryTitle('unknownCategory')).toBe('Unknown Issues');
    });
  });

  describe('getCategoryDescription', () => {
    it('should return correct descriptions for known categories', () => {
      expect(getCategoryDescription('maliciousCode')).toBe('No malicious code patterns detected');
      expect(getCategoryDescription('dependencies')).toBe('All dependencies appear safe');
    });

    it('should return default description for unknown categories', () => {
      expect(getCategoryDescription('unknownCategory')).toBe('No issues detected');
    });
  });

  describe('mapSafetyScoreToUIType', () => {
    it('should map safety scores to UI types', () => {
      expect(mapSafetyScoreToUIType('SAFE')).toBe('success');
      expect(mapSafetyScoreToUIType('safe')).toBe('success');
      expect(mapSafetyScoreToUIType('CAUTION')).toBe('warning');
      expect(mapSafetyScoreToUIType('caution')).toBe('warning');
      expect(mapSafetyScoreToUIType('UNSAFE')).toBe('danger');
      expect(mapSafetyScoreToUIType('unsafe')).toBe('danger');
    });

    it('should handle case insensitivity', () => {
      expect(mapSafetyScoreToUIType('SaFe')).toBe('success');
      expect(mapSafetyScoreToUIType('CaUtIoN')).toBe('warning');
    });
  });

  describe('getSafetyScoreLabel', () => {
    it('should handle string scores', () => {
      expect(getSafetyScoreLabel('SAFE')).toBe('Safe');
      expect(getSafetyScoreLabel('CAUTION')).toBe('Caution');
      expect(getSafetyScoreLabel('UNSAFE')).toBe('Unsafe');
    });

    it('should handle numeric scores', () => {
      expect(getSafetyScoreLabel(95)).toBe('Safe');
      expect(getSafetyScoreLabel(90)).toBe('Safe');
      expect(getSafetyScoreLabel(80)).toBe('Caution');
      expect(getSafetyScoreLabel(70)).toBe('Caution');
      expect(getSafetyScoreLabel(50)).toBe('Unsafe');
      expect(getSafetyScoreLabel(0)).toBe('Unsafe');
    });

    it('should handle edge cases for numeric scores', () => {
      expect(getSafetyScoreLabel(89)).toBe('Caution');
      expect(getSafetyScoreLabel(69)).toBe('Unsafe');
    });
  });
});
