import { describe, expect, it } from 'vitest';
import {
  findLessonSummary,
  getUnitCatalog
} from '../../src/lib/contentCatalog';

describe('content catalog', () => {
  // FEATURE-015: danh mục đang được xây lại theo 11 unit n1-n11 (xem
  // docs/plans/FEATURE-015.md, Phụ lục A); ở trạng thái cuối R4 đã đủ
  // n1-n11.
  it('contains the units completed so far with unique unit and lesson ids and no full content', () => {
    const catalog = getUnitCatalog();
    const unitIds = catalog.map((unit) => unit.id);
    const lessonIds = catalog.flatMap((unit) =>
      unit.lessons.map((lesson) => lesson.id)
    );

    expect(catalog).toHaveLength(11);
    expect(new Set(unitIds).size).toBe(unitIds.length);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    expect(
      catalog.every((unit) =>
        unit.lessons.every(
          (lesson) => !('cards' in lesson) && !('questions' in lesson)
        )
      )
    ).toBe(true);
  });

  it('keeps category counts available for progress without loading questions', () => {
    const lesson = findLessonSummary(
      'n1-nguyen-tu-nguyen-to-cong-thuc-hoa-hoc',
      'n1-l4'
    );

    expect(lesson).toMatchObject({
      theoryQuestionCount: 12,
      calculationQuestionCount: 1
    });
  });
});
