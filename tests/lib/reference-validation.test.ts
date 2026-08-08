import { describe, expect, it } from 'vitest';
import { validateReferenceData } from '../../src/lib/referenceValidation';

const valid = {
  elements: {
    source: 's',
    version: 'v',
    conditions: 'c',
    elements: [
      {
        symbol: 'H',
        name: 'Hiđro',
        atomicNumber: 1,
        atomicMass: 1,
        period: 1,
        group: 1
      }
    ]
  },
  solubility: {
    source: 's',
    version: 'v',
    conditions: 'c',
    legend: {},
    cations: ['Na+'],
    anions: ['Cl-'],
    matrix: { 'Na+': { 'Cl-': 'T' } }
  },
  valences: { source: 's', version: 'v', conditions: 'c', entries: [] },
  activitySeries: { source: 's', version: 'v', conditions: 'c', series: [] },
  constants: { source: 's', version: 'v', conditions: 'c', constants: [] },
  precipitates: { source: 's', version: 'v', conditions: 'c', entries: [] }
};

describe('reference validation', () => {
  it('accepts a complete minimal dataset', () =>
    expect(validateReferenceData(valid)).toEqual([]));
  it.each([
    ['elements', 'elements'],
    ['solubility', 'solubility'],
    ['valences', 'valences'],
    ['activitySeries', 'activity-series'],
    ['constants', 'constants'],
    ['precipitates', 'precipitates']
  ] as const)(
    'fails absent, null, and non-object %s datasets',
    (key, datasetName) => {
      for (const missingValue of [undefined, null, 'not-an-object']) {
        const data = structuredClone(valid) as Record<string, unknown>;
        data[key] = missingValue;
        expect(validateReferenceData(data).join('\n')).toContain(
          `${datasetName}: schema không hợp lệ.`
        );
      }
    }
  );
  it('fails duplicate element symbols', () => {
    const data = structuredClone(valid);
    data.elements.elements.push({ ...data.elements.elements[0] });
    expect(validateReferenceData(data).join('\n')).toContain('trùng ký hiệu H');
  });
  it('fails implausible atomic mass', () => {
    const data = structuredClone(valid);
    data.elements.elements[0].atomicMass = 301;
    expect(validateReferenceData(data).join('\n')).toContain(
      'ngoài khoảng hợp lí'
    );
  });
  it('fails a solubility value outside the closed enum', () => {
    const data = structuredClone(valid);
    data.solubility.matrix['Na+']['Cl-'] = 'X';
    expect(validateReferenceData(data).join('\n')).toContain(
      'không thuộc enum'
    );
  });
  it('fails missing source', () => {
    const data = structuredClone(valid);
    data.constants.source = '';
    expect(validateReferenceData(data).join('\n')).toContain(
      'constants: thiếu source'
    );
  });
  it('fails a missing solubility matrix cell', () => {
    const data = structuredClone(valid);
    delete (data.solubility.matrix['Na+'] as { 'Cl-'?: string })['Cl-'];
    expect(validateReferenceData(data).join('\n')).toContain('thiếu ô Na+/Cl-');
  });
});
