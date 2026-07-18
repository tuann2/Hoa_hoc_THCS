import catalog from '../../content/catalog.json';
import type { LessonSummary, PartId, UnitSummary } from '../types/content';

const sortedCatalog = [...(catalog as UnitSummary[])].sort((left, right) => {
  if (left.part === right.part) return left.order - right.order;
  return left.part === 'inorganic' ? -1 : 1;
});

export const partLabels: Record<PartId, string> = {
  inorganic: 'Vô cơ',
  organic: 'Hữu cơ'
};

export function getUnitCatalog(): UnitSummary[] {
  return sortedCatalog.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) => ({ ...lesson }))
  }));
}

export function getUnitsByPart(part: PartId): UnitSummary[] {
  return getUnitCatalog().filter((unit) => unit.part === part);
}

export function findUnitSummary(unitId: string): UnitSummary | undefined {
  return sortedCatalog.find((unit) => unit.id === unitId);
}

export function findLessonSummary(
  unitId: string,
  lessonId: string
): LessonSummary | undefined {
  return findUnitSummary(unitId)?.lessons.find(
    (lesson) => lesson.id === lessonId
  );
}

export function getAvailableLessonCount(units: UnitSummary[]): number {
  return units.reduce(
    (total, unit) =>
      total +
      unit.lessons.filter((lesson) => lesson.status === 'available').length,
    0
  );
}
