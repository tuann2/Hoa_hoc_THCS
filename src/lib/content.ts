import a1 from '../../content/units/a1-nen-tang-hoa-hoc.json';
import a2 from '../../content/units/a2-oxi-khong-khi.json';
import a3 from '../../content/units/a3-hidro-nuoc.json';
import a4 from '../../content/units/a4-dung-dich.json';
import a5 from '../../content/units/a5-oxit.json';
import a6 from '../../content/units/a6-axit.json';
import a7 from '../../content/units/a7-bazo.json';
import a8 from '../../content/units/a8-muoi-phan-bon.json';
import a9 from '../../content/units/a9-moi-quan-he-hop-chat-vo-co.json';
import a10 from '../../content/units/a10-kim-loai.json';
import a11 from '../../content/units/a11-phi-kim.json';
import a12 from '../../content/units/a12-tong-hop-vo-co.json';
import b1 from '../../content/units/b1-dai-cuong-huu-co.json';
import b2 from '../../content/units/b2-hidrocacbon-nhien-lieu.json';
import b3 from '../../content/units/b3-dan-xuat-chua-oxi.json';
import b4 from '../../content/units/b4-gluxit-protein-polime.json';
import b5 from '../../content/units/b5-tong-hop-huu-co.json';
import type {
  Lesson,
  PartId,
  Question,
  QuestionCategory,
  UnitContent
} from '../types/content';

const units = [
  a1,
  a2,
  a3,
  a4,
  a5,
  a6,
  a7,
  a8,
  a9,
  a10,
  a11,
  a12,
  b1,
  b2,
  b3,
  b4,
  b5
] as UnitContent[];

export const partLabels: Record<PartId, string> = {
  inorganic: 'Vô cơ',
  organic: 'Hữu cơ'
};

export function getAllUnits(): UnitContent[] {
  return [...units].sort((left, right) => {
    if (left.part === right.part) {
      return left.order - right.order;
    }

    return left.part === 'inorganic' ? -1 : 1;
  });
}

export function getUnitsByPart(part: PartId): UnitContent[] {
  return getAllUnits().filter((unit) => unit.part === part);
}

export function findUnit(unitId: string): UnitContent | undefined {
  return getAllUnits().find((unit) => unit.id === unitId);
}

export function findLesson(
  unitId: string,
  lessonId: string
): Lesson | undefined {
  return findUnit(unitId)?.lessons.find((lesson) => lesson.id === lessonId);
}

export function findQuestion(
  unitId: string,
  lessonId: string,
  questionId: string
): Question | undefined {
  return findLesson(unitId, lessonId)?.questions.find(
    (question) => question.id === questionId
  );
}

export function getQuestionsByCategory(
  lesson: Lesson,
  category: QuestionCategory
): Question[] {
  return lesson.questions.filter((question) => question.category === category);
}

export function getAvailableLessonCount(unitsToCount: UnitContent[]): number {
  return unitsToCount.reduce(
    (total, unit) =>
      total +
      unit.lessons.filter((lesson) => lesson.status === 'available').length,
    0
  );
}
