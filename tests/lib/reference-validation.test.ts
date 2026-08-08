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
        group: 1,
        category: 'Phi kim'
      }
    ]
  },
  solubility: {
    source: 's',
    version: 'v',
    conditions: 'c',
    legend: {
      T: 'Tan',
      K: 'Ít tan',
      I: 'Không tan',
      B: 'Bị phân huỷ',
      '-': 'Không có dữ liệu'
    },
    cations: ['Na+'],
    anions: ['Cl-'],
    matrix: { 'Na+': { 'Cl-': 'T' } }
  },
  valences: {
    source: 's',
    version: 'v',
    conditions: 'c',
    entries: [{ formula: 'H', name: 'Hiđro', valences: ['I'] }]
  },
  activitySeries: {
    source: 's',
    version: 'v',
    conditions: 'c',
    series: ['K'],
    note: 'n'
  },
  constants: {
    source: 's',
    version: 'v',
    conditions: 'c',
    constants: [{ id: 'c', name: 'Constant', value: 1, unit: 'u' }]
  },
  precipitates: {
    source: 's',
    version: 'v',
    conditions: 'c',
    entries: [
      { formula: 'AgCl', name: 'Bạc clorua', color: 'Trắng', note: 'n' }
    ]
  }
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
  it.each([
    [
      'missing category',
      'elements: schema phần tử không hợp lệ.',
      (data: typeof valid) =>
        delete (data.elements.elements[0] as { category?: string }).category
    ],
    [
      'atomic number outside range',
      'elements: atomicNumber H ngoài khoảng 1–118.',
      (data: typeof valid) => {
        data.elements.elements[0].atomicNumber = 119;
      }
    ],
    [
      'period outside range',
      'elements: period H ngoài khoảng 1–7.',
      (data: typeof valid) => {
        data.elements.elements[0].period = 8;
      }
    ],
    [
      'group outside range',
      'elements: group H ngoài khoảng 1–18.',
      (data: typeof valid) => {
        data.elements.elements[0].group = 19;
      }
    ],
    [
      'empty elements',
      'elements: mảng elements không được rỗng.',
      (data: typeof valid) => {
        data.elements.elements = [];
      }
    ]
  ])('fails elements with %s', (_name, expected, mutate) => {
    const data = structuredClone(valid);
    mutate(data);
    expect(validateReferenceData(data)).toContain(expected);
  });
  it('fails duplicate atomic numbers', () => {
    const data = structuredClone(valid);
    data.elements.elements.push({ ...data.elements.elements[0], symbol: 'D' });
    expect(validateReferenceData(data).join('\n')).toContain(
      'trùng số hiệu nguyên tử 1'
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
  it.each([
    [
      'invalid valence entry',
      'valences: schema phần tử không hợp lệ.',
      (data: typeof valid) => {
        data.valences.entries[0] =
          'RÁC' as unknown as (typeof data.valences.entries)[number];
      }
    ],
    [
      'empty valence fields',
      'valences: schema phần tử không hợp lệ.',
      (data: typeof valid) => {
        Object.assign(data.valences.entries[0], {
          formula: '',
          name: '',
          valences: []
        });
      }
    ],
    [
      'empty valences',
      'valences: mảng entries không được rỗng.',
      (data: typeof valid) => {
        data.valences.entries = [];
      }
    ],
    [
      'invalid precipitate entry',
      'precipitates: schema phần tử không hợp lệ.',
      (data: typeof valid) => {
        data.precipitates.entries[0] =
          null as unknown as (typeof data.precipitates.entries)[number];
      }
    ],
    [
      'empty precipitate fields',
      'precipitates: schema phần tử không hợp lệ.',
      (data: typeof valid) => {
        Object.assign(data.precipitates.entries[0], {
          formula: '',
          name: '',
          color: '',
          note: ''
        });
      }
    ],
    [
      'empty precipitates',
      'precipitates: mảng entries không được rỗng.',
      (data: typeof valid) => {
        data.precipitates.entries = [];
      }
    ],
    [
      'non-numeric constant value',
      'constants: schema phần tử không hợp lệ.',
      (data: typeof valid) => {
        Object.assign(data.constants.constants[0], {
          value: 'hai bốn phẩy bảy chín'
        });
      }
    ],
    [
      'empty constant fields',
      'constants: schema phần tử không hợp lệ.',
      (data: typeof valid) => {
        Object.assign(data.constants.constants[0], {
          id: '',
          name: '',
          value: Number.NaN,
          unit: ''
        });
      }
    ],
    [
      'empty constants',
      'constants: mảng constants không được rỗng.',
      (data: typeof valid) => {
        data.constants.constants = [];
      }
    ],
    [
      'non-string activity series',
      'activity-series: series phải là mảng chuỗi không rỗng.',
      (data: typeof valid) => {
        data.activitySeries.series = [1, 2, 3] as unknown as string[];
      }
    ],
    [
      'empty activity series',
      'activity-series: series phải là mảng chuỗi không rỗng.',
      (data: typeof valid) => {
        data.activitySeries.series = [];
      }
    ],
    [
      'missing activity note',
      'activity-series: thiếu note.',
      (data: typeof valid) => {
        data.activitySeries.note = '';
      }
    ],
    [
      'missing solubility legend entry',
      'solubility: thiếu chú giải T.',
      (data: typeof valid) =>
        delete (data.solubility.legend as { T?: string }).T
    ],
    [
      'empty solubility cations',
      'solubility: cations phải là mảng chuỗi không rỗng.',
      (data: typeof valid) => {
        data.solubility.cations = [];
      }
    ],
    [
      'empty solubility anions',
      'solubility: anions phải là mảng chuỗi không rỗng.',
      (data: typeof valid) => {
        data.solubility.anions = [];
      }
    ]
  ])('fails %s', (_name, expected, mutate) => {
    const data = structuredClone(valid);
    mutate(data);
    expect(validateReferenceData(data)).toContain(expected);
  });
});
