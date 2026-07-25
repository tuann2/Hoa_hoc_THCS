import type { Lesson, Question, UnitContent } from '../types/content';

type UnitModule = { default: unknown };

// FEATURE-015: danh mục đang được xây lại theo 11 unit n1-n11 (xem
// docs/plans/FEATURE-015.md, Phụ lục A). Registry này phải khớp đúng các
// unit đã hoàn thành ở vòng hiện tại; mở rộng dần qua từng vòng R2-R4 cho
// đến khi đủ n1-n11, sau đó xoá ghi chú này.
const loaders: Record<string, () => Promise<UnitModule>> = {
  'n1-nguyen-tu-nguyen-to-cong-thuc-hoa-hoc': () =>
    import('../../content/units/n1-nguyen-tu-nguyen-to-cong-thuc-hoa-hoc.json'),
  'n2-phan-ung-hoa-hoc': () =>
    import('../../content/units/n2-phan-ung-hoa-hoc.json'),
  'n3-acid': () => import('../../content/units/n3-acid.json'),
  'n4-base': () => import('../../content/units/n4-base.json'),
  'n5-oxide': () => import('../../content/units/n5-oxide.json'),
  'n6-muoi-va-phan-bon-hoa-hoc': () =>
    import('../../content/units/n6-muoi-va-phan-bon-hoa-hoc.json'),
  'n7-moi-quan-he-giua-cac-hop-chat-vo-co': () =>
    import('../../content/units/n7-moi-quan-he-giua-cac-hop-chat-vo-co.json'),
  'n8-kim-loai': () => import('../../content/units/n8-kim-loai.json'),
  'n9-phi-kim': () => import('../../content/units/n9-phi-kim.json'),
  'n10-hidrocacbon-va-nhien-lieu': () =>
    import('../../content/units/n10-hidrocacbon-va-nhien-lieu.json'),
  'n11-dan-xuat-hidrocacbon-va-polime': () =>
    import('../../content/units/n11-dan-xuat-hidrocacbon-va-polime.json')
};

const unitCache = new Map<string, Promise<UnitContent>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validateUnit(unitId: string, value: unknown): UnitContent {
  if (
    !isRecord(value) ||
    value.id !== unitId ||
    typeof value.part !== 'string' ||
    !Array.isArray(value.lessons)
  ) {
    throw new Error(`Nội dung unit ${unitId} không hợp lệ.`);
  }

  const hasValidLessonShape = value.lessons.every((lesson) => {
    if (
      !isRecord(lesson) ||
      typeof lesson.id !== 'string' ||
      !Array.isArray(lesson.cards) ||
      !Array.isArray(lesson.questions)
    ) {
      return false;
    }

    const hasValidCardShape = lesson.cards.every(
      (card) => isRecord(card) && typeof card.id === 'string'
    );
    const hasValidQuestionShape = lesson.questions.every(
      (question) =>
        isRecord(question) &&
        typeof question.id === 'string' &&
        typeof question.type === 'string'
    );

    return hasValidCardShape && hasValidQuestionShape;
  });

  if (!hasValidLessonShape) {
    throw new Error(`Nội dung unit ${unitId} không hợp lệ.`);
  }

  return value as unknown as UnitContent;
}

export { validateUnit };

export function loadUnit(unitId: string): Promise<UnitContent> {
  if (!Object.hasOwn(loaders, unitId))
    return Promise.reject(new Error(`Không tìm thấy unit ${unitId}.`));

  const loader = loaders[unitId];

  const cached = unitCache.get(unitId);
  if (cached) return cached;

  const promise = loader()
    .then((module) => validateUnit(unitId, module.default))
    .catch((error: unknown) => {
      unitCache.delete(unitId);
      throw error instanceof Error
        ? error
        : new Error('Không tải được nội dung unit.');
    });
  unitCache.set(unitId, promise);
  return promise;
}

export async function loadUnits(unitIds: string[]): Promise<UnitContent[]> {
  return Promise.all(Array.from(new Set(unitIds)).map(loadUnit));
}

export async function loadLesson(
  unitId: string,
  lessonId: string
): Promise<Lesson> {
  const lesson = (await loadUnit(unitId)).lessons.find(
    (entry) => entry.id === lessonId
  );
  if (!lesson) throw new Error(`Không tìm thấy bài học ${lessonId}.`);
  return lesson;
}

export async function loadQuestion(
  unitId: string,
  lessonId: string,
  questionId: string
): Promise<Question> {
  const question = (await loadLesson(unitId, lessonId)).questions.find(
    (entry) => entry.id === questionId
  );
  if (!question) throw new Error(`Không tìm thấy câu hỏi ${questionId}.`);
  return question;
}

export function resetContentLoaderForTests() {
  unitCache.clear();
}
