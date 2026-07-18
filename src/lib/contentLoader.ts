import type { Lesson, Question, UnitContent } from '../types/content';

type UnitModule = { default: unknown };

const loaders: Record<string, () => Promise<UnitModule>> = {
  'a1-nen-tang-hoa-hoc': () =>
    import('../../content/units/a1-nen-tang-hoa-hoc.json'),
  'a2-oxi-khong-khi': () => import('../../content/units/a2-oxi-khong-khi.json'),
  'a3-hidro-nuoc': () => import('../../content/units/a3-hidro-nuoc.json'),
  'a4-dung-dich': () => import('../../content/units/a4-dung-dich.json'),
  'a5-oxit': () => import('../../content/units/a5-oxit.json'),
  'a6-axit': () => import('../../content/units/a6-axit.json'),
  'a7-bazo': () => import('../../content/units/a7-bazo.json'),
  'a8-muoi-phan-bon': () => import('../../content/units/a8-muoi-phan-bon.json'),
  'a9-moi-quan-he-hop-chat-vo-co': () =>
    import('../../content/units/a9-moi-quan-he-hop-chat-vo-co.json'),
  'a10-kim-loai': () => import('../../content/units/a10-kim-loai.json'),
  'a11-phi-kim': () => import('../../content/units/a11-phi-kim.json'),
  'a12-tong-hop-vo-co': () =>
    import('../../content/units/a12-tong-hop-vo-co.json'),
  'b1-dai-cuong-huu-co': () =>
    import('../../content/units/b1-dai-cuong-huu-co.json'),
  'b2-hidrocacbon-nhien-lieu': () =>
    import('../../content/units/b2-hidrocacbon-nhien-lieu.json'),
  'b3-dan-xuat-chua-oxi': () =>
    import('../../content/units/b3-dan-xuat-chua-oxi.json'),
  'b4-gluxit-protein-polime': () =>
    import('../../content/units/b4-gluxit-protein-polime.json'),
  'b5-tong-hop-huu-co': () =>
    import('../../content/units/b5-tong-hop-huu-co.json')
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
