import type {
  ActivitySeriesDataset,
  ConstantsDataset,
  ElementsDataset,
  PrecipitatesDataset,
  ReferenceData,
  SolubilityDataset,
  ValenceDataset
} from '../types/reference';

const SOLUBILITY_VALUES = new Set(['T', 'K', 'I', 'B', '-']);
const SOLUBILITY_KEYS = ['T', 'K', 'I', 'B', '-'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => isNonEmptyString(entry))
  );
}

function validateMetadata(
  value: unknown,
  name: string,
  errors: string[]
): boolean {
  if (!isRecord(value)) {
    errors.push(`${name}: schema không hợp lệ.`);
    return false;
  }
  for (const key of ['source', 'version', 'conditions'] as const) {
    if (!isNonEmptyString(value[key])) {
      errors.push(`${name}: thiếu ${key}.`);
    }
  }
  return true;
}

function validateElements(value: unknown, errors: string[]): void {
  const hasMetadata = validateMetadata(value, 'elements', errors);
  if (!isRecord(value)) return;
  if (!hasMetadata || !Array.isArray(value.elements)) {
    if (!Array.isArray(value.elements))
      errors.push('elements: thiếu mảng elements.');
    return;
  }
  if (value.elements.length === 0) {
    errors.push('elements: mảng elements không được rỗng.');
    return;
  }
  const symbols = new Set<string>();
  const atomicNumbers = new Set<number>();
  for (const element of value.elements) {
    if (
      !isRecord(element) ||
      !isNonEmptyString(element.symbol) ||
      !isNonEmptyString(element.name) ||
      typeof element.atomicNumber !== 'number' ||
      typeof element.atomicMass !== 'number' ||
      typeof element.period !== 'number' ||
      typeof element.group !== 'number' ||
      !isNonEmptyString(element.category)
    ) {
      errors.push('elements: schema phần tử không hợp lệ.');
      continue;
    }
    if (symbols.has(element.symbol))
      errors.push(`elements: trùng ký hiệu ${element.symbol}.`);
    symbols.add(element.symbol);
    if (atomicNumbers.has(element.atomicNumber))
      errors.push(`elements: trùng số hiệu nguyên tử ${element.atomicNumber}.`);
    atomicNumbers.add(element.atomicNumber);
    if (
      !Number.isFinite(element.atomicMass) ||
      element.atomicMass < 1 ||
      element.atomicMass > 300
    )
      errors.push(
        `elements: nguyên tử khối ${element.symbol} ngoài khoảng hợp lí.`
      );
    for (const [field, min, max] of [
      ['atomicNumber', 1, 118],
      ['period', 1, 7],
      ['group', 1, 18]
    ] as const) {
      const fieldValue = element[field];
      if (
        typeof fieldValue !== 'number' ||
        !Number.isFinite(fieldValue) ||
        !Number.isInteger(fieldValue) ||
        fieldValue < min ||
        fieldValue > max
      )
        errors.push(
          `elements: ${field} ${element.symbol} ngoài khoảng ${min}–${max}.`
        );
    }
  }
}

function validateSolubility(value: unknown, errors: string[]): void {
  const hasMetadata = validateMetadata(value, 'solubility', errors);
  if (!isRecord(value)) return;
  const legend = value.legend;
  const matrix = value.matrix;
  if (
    !hasMetadata ||
    !Array.isArray(value.cations) ||
    !Array.isArray(value.anions) ||
    !isRecord(legend) ||
    !isRecord(matrix)
  ) {
    errors.push('solubility: schema ma trận không hợp lệ.');
    return;
  }
  if (!isNonEmptyStringArray(value.cations))
    errors.push('solubility: cations phải là mảng chuỗi không rỗng.');
  if (!isNonEmptyStringArray(value.anions))
    errors.push('solubility: anions phải là mảng chuỗi không rỗng.');
  for (const key of SOLUBILITY_KEYS) {
    if (!isNonEmptyString(legend[key]))
      errors.push(`solubility: thiếu chú giải ${key}.`);
  }
  if (
    !isNonEmptyStringArray(value.cations) ||
    !isNonEmptyStringArray(value.anions)
  )
    return;
  const cations = new Set<string>();
  const anions = new Set<string>();
  for (const anion of value.anions) {
    if (anions.has(anion)) errors.push(`solubility: trùng anion ${anion}.`);
    anions.add(anion);
  }
  for (const cation of value.cations) {
    if (cations.has(cation)) errors.push(`solubility: trùng cation ${cation}.`);
    cations.add(cation);
    const row = matrix[cation];
    if (!isRecord(row)) {
      errors.push(`solubility: thiếu hàng ${String(cation)}.`);
      continue;
    }
    for (const anion of value.anions) {
      const cell = row[anion];
      if (cell === undefined)
        errors.push(`solubility: thiếu ô ${cation}/${String(anion)}.`);
      else if (typeof cell !== 'string' || !SOLUBILITY_VALUES.has(cell))
        errors.push(
          `solubility: ô ${cation}/${String(anion)} không thuộc enum T | K | I | B | -.`
        );
    }
  }
}

function validateValences(value: unknown, errors: string[]): void {
  const hasMetadata = validateMetadata(value, 'valences', errors);
  if (!isRecord(value) || !hasMetadata) return;
  if (!Array.isArray(value.entries)) {
    errors.push('valences: thiếu mảng entries.');
    return;
  }
  if (value.entries.length === 0)
    errors.push('valences: mảng entries không được rỗng.');
  for (const entry of value.entries) {
    if (
      !isRecord(entry) ||
      !isNonEmptyString(entry.formula) ||
      !isNonEmptyString(entry.name) ||
      !isNonEmptyStringArray(entry.valences)
    )
      errors.push('valences: schema phần tử không hợp lệ.');
  }
}

function validateActivitySeries(value: unknown, errors: string[]): void {
  const hasMetadata = validateMetadata(value, 'activity-series', errors);
  if (!isRecord(value) || !hasMetadata) return;
  if (!isNonEmptyStringArray(value.series))
    errors.push('activity-series: series phải là mảng chuỗi không rỗng.');
  if (!isNonEmptyString(value.note))
    errors.push('activity-series: thiếu note.');
}

function validateConstants(value: unknown, errors: string[]): void {
  const hasMetadata = validateMetadata(value, 'constants', errors);
  if (!isRecord(value) || !hasMetadata) return;
  if (!Array.isArray(value.constants)) {
    errors.push('constants: thiếu mảng constants.');
    return;
  }
  if (value.constants.length === 0)
    errors.push('constants: mảng constants không được rỗng.');
  for (const constant of value.constants) {
    if (
      !isRecord(constant) ||
      !isNonEmptyString(constant.id) ||
      !isNonEmptyString(constant.name) ||
      typeof constant.value !== 'number' ||
      !Number.isFinite(constant.value) ||
      !isNonEmptyString(constant.unit)
    )
      errors.push('constants: schema phần tử không hợp lệ.');
  }
}

function validatePrecipitates(value: unknown, errors: string[]): void {
  const hasMetadata = validateMetadata(value, 'precipitates', errors);
  if (!isRecord(value) || !hasMetadata) return;
  if (!Array.isArray(value.entries)) {
    errors.push('precipitates: thiếu mảng entries.');
    return;
  }
  if (value.entries.length === 0)
    errors.push('precipitates: mảng entries không được rỗng.');
  for (const entry of value.entries) {
    if (
      !isRecord(entry) ||
      !isNonEmptyString(entry.formula) ||
      !isNonEmptyString(entry.name) ||
      !isNonEmptyString(entry.color) ||
      !isNonEmptyString(entry.note)
    )
      errors.push('precipitates: schema phần tử không hợp lệ.');
  }
}

export function validateReferenceData(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ['reference: schema gốc không hợp lệ.'];
  validateElements(value.elements, errors);
  validateSolubility(value.solubility, errors);
  validateValences(value.valences, errors);
  validateActivitySeries(value.activitySeries, errors);
  validateConstants(value.constants, errors);
  validatePrecipitates(value.precipitates, errors);
  return errors;
}

export function assertValidReferenceData(
  value: unknown
): asserts value is ReferenceData {
  const errors = validateReferenceData(value);
  if (errors.length) throw new Error(errors.join('\n'));
}

export type {
  ActivitySeriesDataset,
  ConstantsDataset,
  ElementsDataset,
  PrecipitatesDataset,
  SolubilityDataset,
  ValenceDataset
};
