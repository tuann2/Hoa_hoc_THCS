import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuestionRenderer } from '../../src/components/QuestionRenderer';
import type { Question } from '../../src/types/content';

function submitQuestion(question: Question) {
  const onSubmit = vi.fn();
  const user = userEvent.setup();

  render(
    <QuestionRenderer
      index={0}
      onNext={vi.fn()}
      onSubmit={onSubmit}
      question={question}
      result={null}
      retryMode={false}
      total={1}
    />
  );

  return { onSubmit, user };
}

describe('QuestionRenderer', () => {
  it('gửi đáp án single-choice', async () => {
    const { onSubmit, user } = submitQuestion({
      id: 'q1',
      type: 'single-choice',
      level: 'basic',
      prompt: 'Chọn đáp án đúng',
      options: ['A', 'B', 'C'],
      answer: 1,
      explanation: '...'
    });

    await user.click(screen.getByRole('button', { name: 'B' }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(onSubmit).toHaveBeenCalledWith(1);
  });

  it('gửi đáp án multi-choice', async () => {
    const { onSubmit, user } = submitQuestion({
      id: 'q2',
      type: 'multi-choice',
      level: 'basic',
      prompt: 'Chọn nhiều đáp án',
      options: ['A', 'B', 'C'],
      answers: [0, 2],
      explanation: '...'
    });

    await user.click(screen.getByRole('checkbox', { name: 'A' }));
    await user.click(screen.getByRole('checkbox', { name: 'C' }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(onSubmit).toHaveBeenCalledWith([0, 2]);
  });

  it('gửi đáp án fill-blank', async () => {
    const { onSubmit, user } = submitQuestion({
      id: 'q3',
      type: 'fill-blank',
      level: 'applied',
      prompt: 'Nhập đáp án',
      answer: 'H2',
      explanation: '...'
    });

    await user.type(screen.getByRole('textbox'), 'H2');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(onSubmit).toHaveBeenCalledWith('H2');
  });

  it('gửi đáp án balance', async () => {
    const { onSubmit, user } = submitQuestion({
      id: 'q4',
      type: 'balance',
      level: 'hsg',
      prompt: 'Điền hệ số',
      left: ['H2', 'O2'],
      right: ['H2O'],
      answer: [2, 1, 2],
      explanation: '...'
    });

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], '2');
    await user.type(inputs[1], '1');
    await user.type(inputs[2], '2');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(onSubmit).toHaveBeenCalledWith([2, 1, 2]);
  });
});
