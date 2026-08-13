import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadReferenceData,
  resetReferenceLoaderForTests
} from '../../src/lib/referenceLoader';

describe('reference loader', () => {
  beforeEach(() => resetReferenceLoaderForTests());
  it('loads all six data tables asynchronously and caches the result', async () => {
    const first = await loadReferenceData();
    const second = await loadReferenceData();
    expect(first).toBe(second);
    expect(
      first.elements.elements.find((element) => element.symbol === 'Fe')
    ).toBeDefined();
    expect(first.constants.constants[0].value).toBe(24.79);
  });
});
