import { describe, expect, it } from 'vitest';
import {
  findLessonSummary,
  getUnitCatalog
} from '../../src/lib/contentCatalog';

describe('content catalog', () => {
  it('contains all 17 units with unique unit and lesson ids and no full content', () => {
    const catalog = getUnitCatalog();
    const unitIds = catalog.map((unit) => unit.id);
    const lessonIds = catalog.flatMap((unit) =>
      unit.lessons.map((lesson) => lesson.id)
    );

    expect(catalog).toHaveLength(17);
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
    const lesson = findLessonSummary('a1-nen-tang-hoa-hoc', 'a1-l4');

    expect(lesson).toMatchObject({
      theoryQuestionCount: 12,
      calculationQuestionCount: 1
    });
  });
});
