import type { Lesson, Question, UnitContent } from '../types/content';
import { isBalancedEquation, validateLessonLevels } from './chemistry';

const EXPECTED_UNIT_IDS = [
  'a1-nen-tang-hoa-hoc',
  'a2-oxi-khong-khi',
  'a3-hidro-nuoc',
  'a4-dung-dich',
  'a5-oxit',
  'a6-axit',
  'a7-bazo',
  'a8-muoi-phan-bon',
  'a9-moi-quan-he-hop-chat-vo-co',
  'a10-kim-loai',
  'a11-phi-kim',
  'a12-tong-hop-vo-co',
  'b1-dai-cuong-huu-co',
  'b2-hidrocacbon-nhien-lieu',
  'b3-dan-xuat-chua-oxi',
  'b4-gluxit-protein-polime',
  'b5-tong-hop-huu-co'
];

function validateQuestion(question: Question, prefix: string): string[] {
  const errors: string[] = [];

  if (!question.explanation.trim()) {
    errors.push(`${prefix}: thiếu lời giải chi tiết.`);
  }

  switch (question.type) {
    case 'single-choice': {
      const single = question;

      if (single.options.length < 2) {
        errors.push(`${prefix}: câu single-choice phải có ít nhất 2 lựa chọn.`);
      }

      if (single.answer < 0 || single.answer >= single.options.length) {
        errors.push(`${prefix}: đáp án ngoài phạm vi options.`);
      }

      break;
    }
    case 'multi-choice': {
      const multi = question;

      if (multi.options.length < 2) {
        errors.push(`${prefix}: câu multi-choice phải có ít nhất 2 lựa chọn.`);
      }

      if (multi.answers.length === 0) {
        errors.push(
          `${prefix}: câu multi-choice phải có ít nhất 1 đáp án đúng.`
        );
      }

      for (const answer of multi.answers) {
        if (answer < 0 || answer >= multi.options.length) {
          errors.push(`${prefix}: có đáp án nhiều lựa chọn nằm ngoài options.`);
        }
      }

      break;
    }
    case 'fill-blank':
      if (!question.answer.trim()) {
        errors.push(`${prefix}: câu fill-blank phải có đáp án.`);
      }
      break;
    case 'balance': {
      const balance = question;

      if (
        balance.answer.length !==
        balance.left.length + balance.right.length
      ) {
        errors.push(
          `${prefix}: số hệ số không khớp số chất trong phương trình.`
        );
      }

      if (
        !balance.answer.every((value) => Number.isInteger(value) && value > 0)
      ) {
        errors.push(`${prefix}: hệ số cân bằng phải là số nguyên dương.`);
      }

      if (!isBalancedEquation(balance)) {
        errors.push(
          `${prefix}: phương trình cân bằng không đúng về số nguyên tử.`
        );
      }

      break;
    }
  }

  return errors;
}

function validateAvailableLesson(lesson: Lesson, prefix: string): string[] {
  const errors: string[] = [];
  const basicCount = lesson.questions.filter(
    (question) => question.level === 'basic'
  ).length;
  const appliedCount = lesson.questions.filter(
    (question) => question.level === 'applied'
  ).length;
  const hsgCount = lesson.questions.filter(
    (question) => question.level === 'hsg'
  ).length;

  if (lesson.cards.length === 0) {
    errors.push(`${prefix}: bài đang mở phải có ít nhất 1 thẻ lý thuyết.`);
  }

  if (lesson.cards.length > 5) {
    errors.push(`${prefix}: số thẻ lý thuyết vượt quá 5.`);
  }

  if (basicCount < 5 || basicCount > 8) {
    errors.push(`${prefix}: số câu mức cơ bản phải trong khoảng 5-8.`);
  }

  if (appliedCount < 5 || appliedCount > 8) {
    errors.push(`${prefix}: số câu mức vận dụng phải trong khoảng 5-8.`);
  }

  if (hsgCount < 3 || hsgCount > 5) {
    errors.push(`${prefix}: số câu mức HSG phải trong khoảng 3-5.`);
  }

  if (!validateLessonLevels(lesson)) {
    errors.push(`${prefix}: bài học phải có đủ 3 mức câu hỏi.`);
  }

  return errors;
}

export function validateUnits(units: UnitContent[]): string[] {
  const errors: string[] = [];
  const unitIds = new Set<string>();
  const lessonIds = new Set<string>();
  const questionIds = new Set<string>();

  for (const expectedId of EXPECTED_UNIT_IDS) {
    if (!units.some((unit) => unit.id === expectedId)) {
      errors.push(`Thiếu unit bắt buộc: ${expectedId}.`);
    }
  }

  for (const unit of units) {
    if (unitIds.has(unit.id)) {
      errors.push(`Trùng unit id: ${unit.id}.`);
    }

    unitIds.add(unit.id);

    if (!unit.title.trim() || !unit.description.trim()) {
      errors.push(`Unit ${unit.id}: thiếu tiêu đề hoặc mô tả.`);
    }

    if (unit.status === 'coming-soon' && unit.lessons.length === 0) {
      errors.push(
        `Unit ${unit.id}: unit sắp ra mắt vẫn phải có danh sách bài placeholder.`
      );
    }

    for (const lesson of unit.lessons) {
      const lessonPrefix = `${unit.id}/${lesson.id}`;

      if (lessonIds.has(lesson.id)) {
        errors.push(`Trùng lesson id: ${lesson.id}.`);
      }

      lessonIds.add(lesson.id);

      if (!lesson.title.trim() || !lesson.summary.trim()) {
        errors.push(`${lessonPrefix}: thiếu tiêu đề hoặc tóm tắt.`);
      }

      if (lesson.status === 'available') {
        errors.push(...validateAvailableLesson(lesson, lessonPrefix));
      }

      for (const question of lesson.questions) {
        const questionPrefix = `${lessonPrefix}/${question.id}`;

        if (questionIds.has(question.id)) {
          errors.push(`Trùng question id: ${question.id}.`);
        }

        questionIds.add(question.id);
        errors.push(...validateQuestion(question, questionPrefix));
      }
    }
  }

  return errors;
}
