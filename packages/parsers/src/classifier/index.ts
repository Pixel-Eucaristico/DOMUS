export { KEYWORD_MAP, NCM_MAP, normalizeText } from "./keywordMap";
export {
  classifyByNcm,
  classifyByKeyword,
  createKeywordClassifier,
  classifyByNcmWithSiscomex,
  createGeminiClassifier,
  createHybridClassifier,
  classifyItemFull,
  getSiscomexCache,
  restoreSiscomexCache,
} from "./classifyItem";
export type { GeminiConfig, ExtendedClassificationResult, ClassifyItemInput, ClassifyItemOptions } from "./classifyItem";
export {
  NCM_SUBCATEGORIES,
  SUBCATEGORY_HINTS,
  findSubcategoryByNcm,
  getSubcategoryById,
  getSubcategoriesForParent,
  getParentCategoryIds,
} from "./ncmCategories";
export type { NCMSubcategory } from "./ncmCategories";
export { lookupByEAN, clearEANCache } from "./eanLookup";
export type { EANLookupResult } from "./eanLookup";
