import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultScreen } from '../../src/components/ResultScreen';

describe('ResultScreen', () => {
  it('hiển thị CTA phụ và CTA sang bài tiếp theo khi được cung cấp', () => {
    render(
      <ResultScreen
        accuracy={80}
        correctCount={4}
        earnedXp={40}
        onBackHome={vi.fn()}
        onNextLesson={vi.fn()}
        onReplay={vi.fn()}
        onSecondaryAction={vi.fn()}
        secondaryActionLabel="Làm phần Bài tập"
        stars={2}
        totalQuestions={5}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Sang bài tiếp theo' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Làm phần Bài tập' })
    ).toBeInTheDocument();
  });

  it('ẩn các CTA tuỳ chọn khi không được cung cấp', () => {
    render(
      <ResultScreen
        accuracy={100}
        correctCount={5}
        earnedXp={50}
        onBackHome={vi.fn()}
        onReplay={vi.fn()}
        stars={3}
        totalQuestions={5}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Sang bài tiếp theo' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Làm phần Bài tập' })
    ).not.toBeInTheDocument();
  });
});
