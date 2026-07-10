import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Chem } from '../../src/components/Chem';
import {
  calculateStars,
  isBalancedEquation,
  parseFormula
} from '../../src/lib/chemistry';

describe('Chem renderer và tiện ích hoá học', () => {
  it('render chỉ số dưới và mũi tên phản ứng', () => {
    const { container } = render(<Chem text="2H2 + O2 -> 2H2O" />);

    expect(container.querySelectorAll('sub')).toHaveLength(3);
    expect(screen.getByLabelText('mũi tên phản ứng')).toBeInTheDocument();
  });

  it('phân tích công thức có ngoặc', () => {
    expect(parseFormula('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 });
  });

  it('kiểm tra đúng sai của phương trình cân bằng', () => {
    expect(
      isBalancedEquation({
        id: 'q1',
        type: 'balance',
        level: 'basic',
        category: 'theory',
        prompt: '...',
        explanation: '...',
        left: ['H2', 'O2'],
        right: ['H2O'],
        answer: [2, 1, 2]
      })
    ).toBe(true);
  });

  it('tính sao theo độ chính xác', () => {
    expect(calculateStars(95)).toBe(3);
    expect(calculateStars(72)).toBe(2);
    expect(calculateStars(10)).toBe(1);
    expect(calculateStars(0)).toBe(0);
  });
});
