export interface ReferenceMetadata {
  source: string;
  version: string;
  conditions: string;
}

export interface ElementReference {
  symbol: string;
  name: string;
  atomicNumber: number;
  atomicMass: number;
  period: number;
  group: number;
  category: string;
}

export interface ElementsDataset extends ReferenceMetadata {
  elements: ElementReference[];
}

export type SolubilityValue = 'T' | 'K' | 'I' | 'B' | '-';

export interface SolubilityDataset extends ReferenceMetadata {
  legend: Record<SolubilityValue, string>;
  cations: string[];
  anions: string[];
  matrix: Record<string, Record<string, SolubilityValue>>;
}

export interface ValenceDataset extends ReferenceMetadata {
  entries: Array<{ formula: string; name: string; valences: string[] }>;
}

export interface ActivitySeriesDataset extends ReferenceMetadata {
  series: string[];
  note: string;
}

export interface ConstantsDataset extends ReferenceMetadata {
  constants: Array<{ id: string; name: string; value: number; unit: string }>;
}

export interface PrecipitatesDataset extends ReferenceMetadata {
  entries: Array<{
    formula: string;
    name: string;
    color: string;
    note: string;
  }>;
}

export interface ReferenceData {
  elements: ElementsDataset;
  solubility: SolubilityDataset;
  valences: ValenceDataset;
  activitySeries: ActivitySeriesDataset;
  constants: ConstantsDataset;
  precipitates: PrecipitatesDataset;
}
