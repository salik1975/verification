import { SubFeature, MainFeature } from '@/services/manageSubscriptionService';

// Color themes for different main features - using neutral colors that don't conflict with service/tier colors
export const FEATURE_COLORS = {
  'ENABLE_DOCUMENT_ID_VERIFICATION': {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    hover: 'hover:bg-slate-200'
  },
  'ENABLE_FACE_ID_VERIFICATION': {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    hover: 'hover:bg-gray-200'
  },
  'ENABLE_SMS_EMAIL_VERIFICATION': {
    bg: 'bg-zinc-100',
    text: 'text-zinc-700',
    border: 'border-zinc-300',
    hover: 'hover:bg-zinc-200'
  }
} as const;

// Sanitize feature key for display
export function sanitizeFeatureKey(featureKey: string): string {
  return featureKey
    .replace('ENABLE_', '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get color theme for a feature
export function getFeatureColor(mainFeatureKey: string) {
  return FEATURE_COLORS[mainFeatureKey as keyof typeof FEATURE_COLORS] || {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-300',
    hover: 'hover:bg-stone-200'
  };
}

// Get all sub-features from main features
export function getAllSubFeatures(mainFeatures: MainFeature[]): SubFeature[] {
  return mainFeatures.flatMap(main => main.sub_features);
}

// Get main feature key for a sub-feature
export function getMainFeatureKeyForSubFeature(
  subFeatureKey: string, 
  mainFeatures: MainFeature[]
): string | null {
  for (const main of mainFeatures) {
    if (main.sub_features.some(sub => sub.sub_feature_key === subFeatureKey)) {
      return main.main_feature_key;
    }
  }
  return null;
}

// Check if all sub-features of a main feature are selected
export function areAllSubFeaturesSelected(
  mainFeatureKey: string,
  selectedSubFeatures: string[],
  mainFeatures: MainFeature[]
): boolean {
  const mainFeature = mainFeatures.find(m => m.main_feature_key === mainFeatureKey);
  if (!mainFeature) return false;
  
  return mainFeature.sub_features.every(sub => 
    selectedSubFeatures.includes(sub.sub_feature_key)
  );
}

// Get selected sub-features for a main feature
export function getSelectedSubFeaturesForMain(
  mainFeatureKey: string,
  selectedSubFeatures: string[],
  mainFeatures: MainFeature[]
): string[] {
  const mainFeature = mainFeatures.find(m => m.main_feature_key === mainFeatureKey);
  if (!mainFeature) return [];
  
  return mainFeature.sub_features
    .filter(sub => selectedSubFeatures.includes(sub.sub_feature_key))
    .map(sub => sub.sub_feature_key);
}
