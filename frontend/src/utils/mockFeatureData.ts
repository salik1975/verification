import { MainFeature } from '@/services/manageSubscriptionService';

// Mock data based on the feature_map.txt structure
export const mockMainFeatures: MainFeature[] = [
  {
    main_feature_key: 'ENABLE_DOCUMENT_ID_VERIFICATION',
    sub_features: [
      {
        sub_feature_key: 'ENABLE_DOCUMENT_UPLOAD',
        sub_feature_description: 'Enable document upload functionality',
        main_feature_key: 'ENABLE_DOCUMENT_ID_VERIFICATION'
      },
      {
        sub_feature_key: 'ENABLE_CRITICAL_FIELDS_CHECK',
        sub_feature_description: 'Enable critical fields validation',
        main_feature_key: 'ENABLE_DOCUMENT_ID_VERIFICATION'
      },
      {
        sub_feature_key: 'ENABLE_DOCUMENT_EXTRACTION',
        sub_feature_description: 'Enable document data extraction',
        main_feature_key: 'ENABLE_DOCUMENT_ID_VERIFICATION'
      },
      {
        sub_feature_key: 'ENABLE_DOCUMENT_VALIDATION',
        sub_feature_description: 'Enable document authenticity validation',
        main_feature_key: 'ENABLE_DOCUMENT_ID_VERIFICATION'
      }
    ]
  },
  {
    main_feature_key: 'ENABLE_FACE_ID_VERIFICATION',
    sub_features: [
      {
        sub_feature_key: 'ENABLE_FACE_MATCH',
        sub_feature_description: 'Enable face matching between document and live capture',
        main_feature_key: 'ENABLE_FACE_ID_VERIFICATION'
      },
      {
        sub_feature_key: 'ENABLE_LIVE_PHRASE',
        sub_feature_description: 'Enable live phrase verification during video capture',
        main_feature_key: 'ENABLE_FACE_ID_VERIFICATION'
      },
      {
        sub_feature_key: 'ENABLE_LIVENESS_CHECK',
        sub_feature_description: 'Enable liveness detection to prevent spoofing',
        main_feature_key: 'ENABLE_FACE_ID_VERIFICATION'
      },
      {
        sub_feature_key: 'ENABLE_VIDEO_FACE',
        sub_feature_description: 'Enable video face capture for liveness verification',
        main_feature_key: 'ENABLE_FACE_ID_VERIFICATION'
      },
      {
        sub_feature_key: 'ENABLE_FACE_EXTRACTION',
        sub_feature_description: 'Enable face extraction from documents',
        main_feature_key: 'ENABLE_FACE_ID_VERIFICATION'
      }
    ]
  },
  {
    main_feature_key: 'ENABLE_SMS_EMAIL_VERIFICATION',
    sub_features: [
      {
        sub_feature_key: 'ENABLE_OTP_VERIFICATION',
        sub_feature_description: 'Enable phone OTP verification',
        main_feature_key: 'ENABLE_SMS_EMAIL_VERIFICATION'
      },
      {
        sub_feature_key: 'ENABLE_EMAIL_VERIFICATION',
        sub_feature_description: 'Enable email OTP verification',
        main_feature_key: 'ENABLE_SMS_EMAIL_VERIFICATION'
      }
    ]
  },
  {
    main_feature_key: 'ENABLE_COMPLETE_BUNDLE',
    sub_features: [
      {
        sub_feature_key: 'ENABLE_DOCUMENT_UPLOAD',
        sub_feature_description: 'Enable document upload functionality',
        main_feature_key: 'ENABLE_COMPLETE_BUNDLE'
      },
      {
        sub_feature_key: 'ENABLE_CRITICAL_FIELDS_CHECK',
        sub_feature_description: 'Enable critical fields validation',
        main_feature_key: 'ENABLE_COMPLETE_BUNDLE'
      },
      {
        sub_feature_key: 'ENABLE_DOCUMENT_EXTRACTION',
        sub_feature_description: 'Enable document data extraction',
        main_feature_key: 'ENABLE_COMPLETE_BUNDLE'
      },
      {
        sub_feature_key: 'ENABLE_DOCUMENT_VALIDATION',
        sub_feature_description: 'Enable document authenticity validation',
        main_feature_key: 'ENABLE_COMPLETE_BUNDLE'
      },
      {
        sub_feature_key: 'ENABLE_FACE_MATCH',
        sub_feature_description: 'Enable face matching between document and live capture',
        main_feature_key: 'ENABLE_COMPLETE_BUNDLE'
      },
      {
        sub_feature_key: 'ENABLE_LIVE_PHRASE',
        sub_feature_description: 'Enable live phrase verification during video capture',
        main_feature_key: 'ENABLE_COMPLETE_BUNDLE'
      },
      {
        sub_feature_key: 'ENABLE_LIVENESS_CHECK',
        sub_feature_description: 'Enable liveness detection to prevent spoofing',
        main_feature_key: 'ENABLE_COMPLETE_BUNDLE'
      },
      {
        sub_feature_key: 'ENABLE_VIDEO_FACE',
        sub_feature_description: 'Enable video face capture for liveness verification',
        main_feature_key: 'ENABLE_COMPLETE_BUNDLE'
      },
      {
        sub_feature_key: 'ENABLE_FACE_EXTRACTION',
        sub_feature_description: 'Enable face extraction from documents',
        main_feature_key: 'ENABLE_COMPLETE_BUNDLE'
      },
      {
        sub_feature_key: 'ENABLE_OTP_VERIFICATION',
        sub_feature_description: 'Enable phone OTP verification',
        main_feature_key: 'ENABLE_COMPLETE_BUNDLE'
      },
      {
        sub_feature_key: 'ENABLE_EMAIL_VERIFICATION',
        sub_feature_description: 'Enable email OTP verification',
        main_feature_key: 'ENABLE_COMPLETE_BUNDLE'
      }
    ]
  }
];
