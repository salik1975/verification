# VeraFi.Me User Manual

<div align="center">

![VeraFi.Me Logo](./AcuCheck-LogoIcon.png)

**Professional Identity Verification Platform**

[Getting Started](#getting-started) • [Features](#features) • [User Guide](#user-guide) • [Troubleshooting](#troubleshooting) • [Support](#support)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Identity Verification Process](#identity-verification-process)
- [Document Management](#document-management)
- [Configuration Management](#configuration-management)
- [User Roles & Permissions](#user-roles--permissions)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Support & Contact](#support--contact)

---

## Overview

VeraFi.Me is a comprehensive identity verification platform designed to streamline document processing, face recognition, and liveness detection. Built with modern web technologies, it provides a secure, user-friendly interface for identity verification workflows.

### Key Features

- 🔐 **Multi-Factor Authentication** - Password and OTP-based login
- 📄 **Document Processing** - Support for passports, driver licenses, and ID cards
- 👤 **Face Recognition** - Advanced biometric verification
- 🎥 **Liveness Detection** - Video-based anti-spoofing technology
- 📱 **Phone Verification** - SMS OTP verification
- ⚙️ **Dynamic Configuration** - Real-time system settings management
- 🔒 **Role-Based Access Control** - Granular permission management

---

## Getting Started

### System Requirements

- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Camera**: Webcam for face recognition and liveness detection
- **Microphone**: For audio verification (optional)
- **Internet**: Stable connection for real-time processing

### First-Time Setup

1. **Access the Platform**
   - Navigate to your VeraFi.Me instance
   - You'll be redirected to the login page

2. **Initial Login**
   - Use your provided credentials
   - Choose your role (Admin or Operator)
   - Select authentication method (Password or OTP)

3. **Dashboard Overview**
   - Familiarize yourself with the sidebar navigation
   - Review available features based on your role
   - Check system status and configuration

---

## Authentication

### Login Methods

VeraFi.Me supports two authentication methods for enhanced security:

#### Password Authentication
1. Enter your username or email
2. Enter your password
3. Select your role from the dropdown
4. Click "Login"

#### OTP Authentication
1. Enter your username or email
2. Click "Login with OTP"
3. Check your email for the 6-digit OTP
4. Enter the OTP in the verification field
5. Select your role from the dropdown
6. Click "Login with OTP"

### Password Reset

If you forget your password:

1. Click "Forgot Password?" on the login page
2. Enter your email address
3. Click "Send OTP"
4. Check your email for the reset OTP
5. Enter the OTP in the verification field
6. Enter your new password
7. Confirm your new password
8. Click "Reset Password"

### Session Management

- Sessions automatically expire after inactivity
- You can manually logout using the logout button in the top-right corner
- Multiple login attempts may temporarily lock your account

---

## Identity Verification Process

### Step-by-Step Verification Workflow

#### 1. Document Upload
- **Supported Formats**: JPG, PNG, PDF
- **Document Types**: Passports, Driver Licenses, ID Cards
- **File Size**: Maximum 10MB per file

**Process:**
1. Navigate to the Verification page
2. Click "Upload Document" or drag and drop files
3. Select document type if prompted
4. Wait for automatic document analysis
5. Review extracted information

#### 2. Face Recognition
- **Requirements**: Clear, well-lit photo
- **Format**: JPG, PNG
- **Size**: Maximum 5MB

**Process:**
1. Upload a clear photo of the person
2. System automatically extracts facial features
3. Face is compared against document photo
4. Confidence score is displayed

#### 3. Liveness Detection
- **Duration**: 10 seconds
- **Requirements**: Good lighting, stable camera
- **Audio**: Speak the displayed phrase clearly

**Process:**
1. Click "Start Liveness Check"
2. Position your face in the camera view
3. Read the displayed phrase aloud
4. Maintain eye contact throughout the recording
5. Wait for processing and verification

#### 4. Phone Verification
- **Supported Countries**: USA, Canada, India
- **Format**: 10-digit phone number
- **OTP**: 6-digit verification code

**Process:**
1. Select your country code
2. Enter your 10-digit phone number
3. Click "Get OTP"
4. Enter the 6-digit OTP received via SMS
5. Click "Verify OTP"

### Verification Results

After completing all steps, you'll see:

- ✅ **Document Verification Status**
- ✅ **Face Recognition Confidence Score**
- ✅ **Liveness Detection Result**
- ✅ **Phone Verification Status**
- ✅ **Overall Verification Status**

---

## Document Management

### Supported Document Types

| Document Type | Supported Formats | Features |
|---------------|-------------------|----------|
| **Passport** | All major countries | OCR extraction, face detection |
| **Driver License** | US States, Canadian Provinces | Field extraction, validation |
| **ID Card** | Government-issued | Data verification, photo matching |

### Document Processing Features

- **Automatic Field Extraction**: Name, date of birth, document number
- **Face Detection**: Automatic extraction from documents
- **Data Validation**: Cross-reference with government databases
- **Quality Assessment**: Blur detection and image quality scoring

### Best Practices for Document Upload

1. **Image Quality**
   - Ensure good lighting
   - Avoid shadows and glare
   - Use high-resolution camera
   - Keep document flat and unwrinkled

2. **Document Positioning**
   - Capture entire document
   - Ensure all text is readable
   - Avoid cutting off edges
   - Keep camera steady

3. **File Format**
   - Use JPG or PNG for photos
   - Use PDF for scanned documents
   - Ensure file size is under 10MB
   - Check image resolution (minimum 300 DPI)

---

## Configuration Management

### Accessing Configuration (Admin Only)

1. Navigate to "Manage Configuration" in the sidebar
2. Review current system settings
3. Modify feature flags as needed
4. Save changes

### Available Configuration Options

| Setting | Description | Default | Impact |
|---------|-------------|---------|--------|
| **Store ID and License Photos** | Save uploaded documents | Enabled | Storage usage, compliance |
| **Store Video** | Save liveness videos | Enabled | Storage usage, audit trail |
| **Store Extracted Faces** | Save face images | Enabled | Storage usage, analysis |
| **AES Encryption Key** | File encryption | Masked | Security, data protection |

### Configuration Best Practices

- **Regular Reviews**: Check settings monthly
- **Backup Before Changes**: Document current settings
- **Test Changes**: Verify functionality after updates
- **Monitor Storage**: Track disk space usage

---

## User Roles & Permissions

### Role Overview

#### Admin Role
**Full system access including:**
- ✅ Identity verification
- ✅ Document management
- ✅ Configuration management
- ✅ User management
- ✅ System monitoring
- ✅ Verification logs

#### Operator Role
**Limited access for verification tasks:**
- ✅ Identity verification
- ✅ Document processing
- ✅ Basic reporting
- ❌ Configuration changes
- ❌ User management

### Permission Matrix

| Feature | Admin | Operator |
|---------|-------|----------|
| Verification | ✅ | ✅ |
| Document Upload | ✅ | ✅ |
| Face Recognition | ✅ | ✅ |
| Liveness Detection | ✅ | ✅ |
| Phone Verification | ✅ | ✅ |
| Configuration | ✅ | ❌ |
| User Management | ✅ | ❌ |
| Verification Logs | ✅ | ❌ |

### Role Selection

- Choose your role during login
- Your session is limited to selected role permissions
- Contact your administrator to change roles
- Multiple roles can be assigned to one user

---

## Troubleshooting

### Common Issues & Solutions

#### Login Problems

**Issue**: "Invalid credentials" error
**Solutions**:
- Check username/email spelling
- Verify password is correct
- Ensure caps lock is off
- Try OTP login method

**Issue**: OTP not received
**Solutions**:
- Check spam/junk folder
- Verify email address is correct
- Wait 5 minutes before requesting new OTP
- Contact support if issue persists

#### Document Upload Issues

**Issue**: "File too large" error
**Solutions**:
- Compress image before upload
- Use lower resolution camera
- Convert to JPG format
- Ensure file is under 10MB

**Issue**: "Unsupported document type"
**Solutions**:
- Verify document is government-issued
- Check document is not expired
- Ensure all text is visible
- Try different lighting conditions

#### Face Recognition Issues

**Issue**: "No face detected"
**Solutions**:
- Ensure face is clearly visible
- Improve lighting conditions
- Remove glasses if possible
- Position face in center of frame

**Issue**: "Low confidence score"
**Solutions**:
- Use high-quality camera
- Ensure good lighting
- Remove obstructions (hats, masks)
- Try different angle

#### Liveness Detection Issues

**Issue**: "Recording failed"
**Solutions**:
- Grant camera permissions
- Check camera is working
- Ensure stable internet connection
- Try refreshing the page

**Issue**: "Phrase not recognized"
**Solutions**:
- Speak clearly and slowly
- Reduce background noise
- Ensure microphone is working
- Repeat the phrase if needed

#### Phone Verification Issues

**Issue**: "Invalid phone number"
**Solutions**:
- Enter exactly 10 digits
- Select correct country code
- Remove spaces and special characters
- Verify number is active

**Issue**: "OTP not received"
**Solutions**:
- Check SMS inbox
- Verify phone number is correct
- Wait 2-3 minutes for delivery
- Try requesting new OTP

### Browser Compatibility

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 90+ | ✅ Full Support | Recommended |
| Firefox | 88+ | ✅ Full Support | Good |
| Safari | 14+ | ✅ Full Support | Good |
| Edge | 90+ | ✅ Full Support | Good |

### Performance Optimization

- **Close unnecessary tabs** to free up memory
- **Use wired internet** for better stability
- **Restart browser** if experiencing issues
- **Clear browser cache** if problems persist

---

## Best Practices

### Security Guidelines

1. **Password Security**
   - Use strong, unique passwords
   - Never share credentials
   - Logout after each session
   - Enable 2FA if available

2. **Data Protection**
   - Don't share verification screenshots
   - Use secure networks only
   - Report suspicious activity
   - Follow company security policies

3. **Privacy Compliance**
   - Only process authorized documents
   - Respect data retention policies
   - Handle personal data carefully
   - Report data breaches immediately

### Verification Best Practices

1. **Document Quality**
   - Use high-resolution images
   - Ensure good lighting
   - Keep documents flat
   - Avoid shadows and glare

2. **Face Recognition**
   - Use clear, recent photos
   - Ensure face is well-lit
   - Remove accessories if possible
   - Maintain neutral expression

3. **Liveness Detection**
   - Find quiet environment
   - Ensure good lighting
   - Speak clearly and naturally
   - Follow on-screen instructions

4. **Phone Verification**
   - Use active phone number
   - Keep phone nearby
   - Enter number carefully
   - Check SMS promptly

### Workflow Optimization

1. **Batch Processing**
   - Group similar verifications
   - Prepare documents in advance
   - Use consistent lighting setup
   - Maintain organized workspace

2. **Quality Control**
   - Review results carefully
   - Flag suspicious documents
   - Document any issues
   - Follow up on failures

3. **Training & Support**
   - Attend training sessions
   - Read system updates
   - Practice with test data
   - Ask questions when unsure

---

## Support & Contact

### Getting Help

#### Self-Service Resources
- **This User Manual**: Comprehensive guide and troubleshooting
- **In-App Help**: Context-sensitive help within the application
- **FAQ Section**: Common questions and answers
- **Video Tutorials**: Step-by-step walkthroughs

#### Contact Information

**Technical Support**
- Email: support@verafi.me
- Phone: +1 (555) 123-4567
- Hours: Monday-Friday, 9 AM - 6 PM EST

**Emergency Support**
- After-hours: support@verafi.me (24/7 monitoring)
- Critical issues: +1 (555) 123-4568

**Administrative Support**
- Email: admin@verafi.me
- Phone: +1 (555) 123-4569
- Hours: Monday-Friday, 8 AM - 5 PM EST

### Reporting Issues

When reporting issues, please include:

1. **Issue Description**
   - What you were trying to do
   - What happened instead
   - Error messages received

2. **System Information**
   - Browser and version
   - Operating system
   - Device type (desktop/mobile)

3. **Steps to Reproduce**
   - Detailed step-by-step process
   - Screenshots if helpful
   - Time and date of occurrence

4. **User Information**
   - Your username (not password)
   - Role and permissions
   - Contact information

### Feature Requests

To request new features:

1. **Submit Request**
   - Email: features@verafi.me
   - Include detailed description
   - Explain business value
   - Provide use case examples

2. **Review Process**
   - Requests reviewed monthly
   - Priority based on impact
   - Development timeline provided
   - Status updates sent

### Training & Documentation

**Available Training**
- New user orientation
- Advanced features workshop
- Security awareness training
- Custom training sessions

**Documentation Updates**
- Manual updated quarterly
- Release notes for each update
- Video tutorials for new features
- Best practices guides

---

## Version History

### Current Version: 2.1.0

**New Features**
- Phone verification with country codes
- Enhanced liveness detection
- Improved document processing
- Dynamic configuration management

**Improvements**
- Better error handling
- Enhanced security features
- Improved user interface
- Performance optimizations

**Bug Fixes**
- Fixed login issues
- Resolved document upload problems
- Corrected face recognition accuracy
- Fixed browser compatibility issues

---

<div align="center">

**VeraFi.Me User Manual** • Version 2.1.0 • Last Updated: December 2024

For the latest updates, visit our [documentation portal](https://docs.verafi.me)

</div> 