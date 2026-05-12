import React from 'react';
import { Badge } from '@/components/ui/badge';
import { sanitizeFeatureKey, getFeatureColor } from '@/utils/featureUtils';
import { SubFeature } from '@/services/manageSubscriptionService';

interface FeatureTagProps {
  subFeature: SubFeature;
  className?: string;
}

export function FeatureTag({ subFeature, className = '' }: FeatureTagProps) {
  const colors = getFeatureColor(subFeature.main_feature_key);
  
  return (
    <Badge
      variant="secondary"
      className={`${colors.bg} ${colors.text} ${colors.border} ${colors.hover} px-2 py-1 text-xs font-medium border ${className}`}
      title={subFeature.sub_feature_description}
    >
      {sanitizeFeatureKey(subFeature.sub_feature_key)}
    </Badge>
  );
}

interface FeatureTagsProps {
  subFeatures: SubFeature[];
  className?: string;
}

export function FeatureTags({ subFeatures, className = '' }: FeatureTagsProps) {
  if (!subFeatures || subFeatures.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {subFeatures.map((subFeature) => (
        <FeatureTag key={subFeature.sub_feature_key} subFeature={subFeature} />
      ))}
    </div>
  );
}
