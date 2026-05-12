import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MainFeature, SubFeature } from '@/services/manageSubscriptionService';
import { sanitizeFeatureKey, getFeatureColor, areAllSubFeaturesSelected } from '@/utils/featureUtils';
import { FeatureTags } from './FeatureTag';

interface FeatureSelectorProps {
  mainFeatures: MainFeature[];
  selectedSubFeatures: string[];
  onSelectionChange: (selectedSubFeatures: string[]) => void;
  className?: string;
}

export function FeatureSelector({ 
  mainFeatures, 
  selectedSubFeatures, 
  onSelectionChange,
  className = '' 
}: FeatureSelectorProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<string[]>([]);

  const toggleMainFeature = (mainFeatureKey: string) => {
    const mainFeature = mainFeatures.find(m => m.main_feature_key === mainFeatureKey);
    if (!mainFeature) return;

    const allSelected = areAllSubFeaturesSelected(mainFeatureKey, selectedSubFeatures, mainFeatures);
    
    if (allSelected) {
      // Deselect all sub-features of this main feature
      const newSelection = selectedSubFeatures.filter(
        subKey => !mainFeature.sub_features.some(sub => sub.sub_feature_key === subKey)
      );
      onSelectionChange(newSelection);
    } else {
      // Select all sub-features of this main feature
      const subFeatureKeys = mainFeature.sub_features.map(sub => sub.sub_feature_key);
      const newSelection = [...new Set([...selectedSubFeatures, ...subFeatureKeys])];
      onSelectionChange(newSelection);
    }
  };

  const toggleSubFeature = (subFeatureKey: string) => {
    const newSelection = selectedSubFeatures.includes(subFeatureKey)
      ? selectedSubFeatures.filter(key => key !== subFeatureKey)
      : [...selectedSubFeatures, subFeatureKey];
    onSelectionChange(newSelection);
  };

  const toggleExpanded = (mainFeatureKey: string) => {
    setExpandedFeatures(prev => 
      prev.includes(mainFeatureKey)
        ? prev.filter(key => key !== mainFeatureKey)
        : [...prev, mainFeatureKey]
    );
  };

  const getSelectedSubFeaturesForMain = (mainFeatureKey: string): SubFeature[] => {
    const mainFeature = mainFeatures.find(m => m.main_feature_key === mainFeatureKey);
    if (!mainFeature) return [];
    
    return mainFeature.sub_features.filter(sub => 
      selectedSubFeatures.includes(sub.sub_feature_key)
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Label className="text-sm font-medium">Service Features</Label>
      <div className="space-y-2">
        {mainFeatures.map((mainFeature) => {
          const colors = getFeatureColor(mainFeature.main_feature_key);
          const isExpanded = expandedFeatures.includes(mainFeature.main_feature_key);
          const allSelected = areAllSubFeaturesSelected(mainFeature.main_feature_key, selectedSubFeatures, mainFeatures);
          const selectedSubFeaturesForMain = getSelectedSubFeaturesForMain(mainFeature.main_feature_key);

          return (
            <Collapsible key={mainFeature.main_feature_key} open={isExpanded}>
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`main-${mainFeature.main_feature_key}`}
                        checked={allSelected}
                        onCheckedChange={() => toggleMainFeature(mainFeature.main_feature_key)}
                      />
                      <Label 
                        htmlFor={`main-${mainFeature.main_feature_key}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {sanitizeFeatureKey(mainFeature.main_feature_key)}
                      </Label>
                    </div>
                    <CollapsibleTrigger
                      onClick={() => toggleExpanded(mainFeature.main_feature_key)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </CollapsibleTrigger>
                  </div>
                  
                  {/* Show selected sub-features as tags */}
                  {selectedSubFeaturesForMain.length > 0 && (
                    <div className="mt-2">
                      <FeatureTags subFeatures={selectedSubFeaturesForMain} />
                    </div>
                  )}
                </CardHeader>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2 pl-6">
                      {mainFeature.sub_features.map((subFeature) => (
                        <div key={subFeature.sub_feature_key} className="flex items-center space-x-3">
                          <Checkbox
                            id={`sub-${subFeature.sub_feature_key}`}
                            checked={selectedSubFeatures.includes(subFeature.sub_feature_key)}
                            onCheckedChange={() => toggleSubFeature(subFeature.sub_feature_key)}
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor={`sub-${subFeature.sub_feature_key}`}
                              className="text-sm cursor-pointer"
                            >
                              {sanitizeFeatureKey(subFeature.sub_feature_key)}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {subFeature.sub_feature_description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
      
      {/* Summary of selected features */}
      {selectedSubFeatures.length > 0 && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <Label className="text-sm font-medium mb-2 block">Selected Features:</Label>
          <FeatureTags 
            subFeatures={mainFeatures.flatMap(main => 
              main.sub_features.filter(sub => selectedSubFeatures.includes(sub.sub_feature_key))
            )} 
          />
        </div>
      )}
    </div>
  );
}
