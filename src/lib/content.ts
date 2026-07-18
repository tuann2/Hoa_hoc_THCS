// Catalog-only compatibility facade. Full lesson data is loaded by contentLoader.
export {
  findLessonSummary,
  findUnitSummary,
  getAvailableLessonCount,
  getUnitCatalog,
  getUnitsByPart,
  partLabels
} from './contentCatalog';

export { getUnitCatalog as getAllUnits } from './contentCatalog';
export {
  findUnitSummary as findUnit,
  findLessonSummary as findLesson
} from './contentCatalog';
