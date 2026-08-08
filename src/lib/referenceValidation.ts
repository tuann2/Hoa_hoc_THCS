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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
    if (typeof value[key] !== 'string' || !value[key].trim()) {
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
  const symbols = new Set<string>();
  for (const element of value.elements) {
    if (
      !isRecord(element) ||
      typeof element.symbol !== 'string' ||
      typeof element.name !== 'string' ||
      typeof element.atomicNumber !== 'number' ||
      typeof element.atomicMass !== 'number' ||
      typeof element.period !== 'number' ||
      typeof element.group !== 'number'
    ) {
      errors.push('elements: schema phần tử không hợp lệ.');
      continue;
    }
    if (symbols.has(element.symbol))
      errors.push(`elements: trùng ký hiệu ${element.symbol}.`);
    symbols.add(element.symbol);
    if (element.atomicMass < 1 || element.atomicMass > 300)
      errors.push(
        `elements: nguyên tử khối ${element.symbol} ngoài khoảng hợp lí.`
      );
  }
}

function validateSolubility(value: unknown, errors: string[]): void {
  const hasMetadata = validateMetadata(value, 'solubility', errors);
  if (!isRecord(value)) return;
  if (
    !hasMetadata ||
    !Array.isArray(value.cations) ||
    !Array.isArray(value.anions) ||
    !isRecord(value.matrix)
  ) {
    errors.push('solubility: schema ma trận không hợp lệ.');
    return;
  }
  const matrix = value.matrix;
  for (const cation of value.cations) {
    const row = typeof cation === 'string' ? matrix[cation] : undefined;
    if (typeof cation !== 'string' || !isRecord(row)) {
      errors.push(`solubility: thiếu hàng ${String(cation)}.`);
      continue;
    }
    for (const anion of value.anions) {
      if (typeof anion !== 'string') {
        errors.push('solubility: anion không hợp lệ.');
        continue;
      }
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

function validateSimpleDataset(
  value: unknown,
  name: string,
  field: string,
  errors: string[]
): void {
  const hasMetadata = validateMetadata(value, name, errors);
  if (!isRecord(value) || !hasMetadata) return;
  if (!Array.isArray(value[field]))
    errors.push(`${name}: thiếu mảng ${field}.`);
}

export function validateReferenceData(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ['reference: schema gốc không hợp lệ.'];
  validateElements(value.elements, errors);
  validateSolubility(value.solubility, errors);
  validateSimpleDataset(value.valences, 'valences', 'entries', errors);
  validateSimpleDataset(
    value.activitySeries,
    'activity-series',
    'series',
    errors
  );
  validateSimpleDataset(value.constants, 'constants', 'constants', errors);
  validateSimpleDataset(value.precipitates, 'precipitates', 'entries', errors);
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
