import { assertValidReferenceData } from './referenceValidation';
import type { ReferenceData } from '../types/reference';

type JsonModule = { default: unknown };

const loaders = {
  elements: () => import('../../content/reference/elements.json'),
  solubility: () => import('../../content/reference/solubility.json'),
  valences: () => import('../../content/reference/valences.json'),
  activitySeries: () => import('../../content/reference/activity-series.json'),
  constants: () => import('../../content/reference/constants.json'),
  precipitates: () => import('../../content/reference/precipitates.json')
} satisfies Record<keyof ReferenceData, () => Promise<JsonModule>>;

let cache: Promise<ReferenceData> | undefined;

export function loadReferenceData(): Promise<ReferenceData> {
  if (cache) return cache;
  cache = Promise.all(
    Object.entries(loaders).map(
      async ([key, load]) => [key, (await load()).default] as const
    )
  )
    .then((entries) => {
      const data = Object.fromEntries(entries);
      assertValidReferenceData(data);
      return data;
    })
    .catch((error: unknown) => {
      cache = undefined;
      throw error instanceof Error
        ? error
        : new Error('Không tải được dữ liệu tra cứu.');
    });
  return cache;
}

export function resetReferenceLoaderForTests() {
  cache = undefined;
}
