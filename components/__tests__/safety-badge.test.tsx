/**
 * Tests for SafetyBadge Component
 *
 * This test suite validates the SafetyBadge component renders correctly
 * with different safety scores and applies appropriate styling.
 */

import { render, screen } from '@testing-library/react';
import { SafetyBadge } from '../safety-badge';

describe('SafetyBadge', () => {
  describe('string-based scores', () => {
    it('should render SAFE badge with success styling', () => {
      render(<SafetyBadge score="SAFE" />);

      const badge = screen.getByText('SAFE');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-success');
    });

    it('should render CAUTION badge with warning styling', () => {
      render(<SafetyBadge score="CAUTION" />);

      const badge = screen.getByText('CAUTION');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-warning');
    });

    it('should render UNSAFE badge with danger styling', () => {
      render(<SafetyBadge score="UNSAFE" />);

      const badge = screen.getByText('UNSAFE');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-danger');
    });

    it('should handle lowercase score strings', () => {
      render(<SafetyBadge score="safe" />);

      const badge = screen.getByText('SAFE');
      expect(badge).toBeInTheDocument();
    });

    it('should handle mixed case score strings', () => {
      render(<SafetyBadge score="CaUtIoN" />);

      const badge = screen.getByText('CAUTION');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('numeric scores', () => {
    it('should render Safe for score >= 90', () => {
      render(<SafetyBadge score={95} />);

      const badge = screen.getByText('SAFE');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-success');
    });

    it('should render Safe for score exactly 90', () => {
      render(<SafetyBadge score={90} />);

      const badge = screen.getByText('SAFE');
      expect(badge).toBeInTheDocument();
    });

    it('should render Caution for score between 70-89', () => {
      render(<SafetyBadge score={80} />);

      const badge = screen.getByText('CAUTION');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-warning');
    });

    it('should render Caution for score exactly 70', () => {
      render(<SafetyBadge score={70} />);

      const badge = screen.getByText('CAUTION');
      expect(badge).toBeInTheDocument();
    });

    it('should render Unsafe for score < 70', () => {
      render(<SafetyBadge score={50} />);

      const badge = screen.getByText('UNSAFE');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-danger');
    });

    it('should render Unsafe for very low scores', () => {
      render(<SafetyBadge score={0} />);

      const badge = screen.getByText('UNSAFE');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('styling and classes', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <SafetyBadge score="SAFE" className="custom-class" />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should have base styling classes', () => {
      render(<SafetyBadge score="SAFE" />);

      const badge = screen.getByText('SAFE');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('rounded-md');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-medium');
      expect(badge).toHaveClass('border');
    });

    it('should have inline-flex container', () => {
      const { container } = render(<SafetyBadge score="SAFE" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('inline-flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('gap-2');
    });
  });

  describe('edge cases', () => {
    it('should handle score of 89 as CAUTION', () => {
      render(<SafetyBadge score={89} />);

      const badge = screen.getByText('CAUTION');
      expect(badge).toBeInTheDocument();
    });

    it('should handle score of 69 as UNSAFE', () => {
      render(<SafetyBadge score={69} />);

      const badge = screen.getByText('UNSAFE');
      expect(badge).toBeInTheDocument();
    });

    it('should handle score of 100', () => {
      render(<SafetyBadge score={100} />);

      const badge = screen.getByText('SAFE');
      expect(badge).toBeInTheDocument();
    });
  });
});
