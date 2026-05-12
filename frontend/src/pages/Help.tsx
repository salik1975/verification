
import { AppLayout } from "@/components/AppLayout";
import { useAppearance } from "@/components/contexts/AppearanceContext";

const Help = () => {
  const { appearance, loading: appearanceLoading } = useAppearance();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="prose prose-lg max-w-none dark:prose-invert">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            {appearanceLoading ? (
              // Show loading skeleton while appearance data is loading
              <>
                <div className="h-16 w-16 rounded-full bg-muted animate-pulse"></div>
                <div className="h-12 w-32 bg-muted animate-pulse rounded"></div>
              </>
            ) : (
              <>
                <img 
                  src={appearance.productLogo} 
                  alt="Logo" 
                  className="h-16 w-16 rounded-full"
                />
                {appearance.hasNameImage ? (
                  <img
                    src={appearance.productNameImage}
                    alt="Brand Name"
                    className="h-12 object-contain"
                  />
                ) : (
                  <h1 className="text-3xl font-bold" style={{ color: appearance.primaryColor }}>VeraFi.Me</h1>
                )}
              </>
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">User Manual</h2>
          <p className="text-lg text-muted-foreground mb-4">Professional Identity Verification Platform</p>
          <div className="flex justify-center space-x-4 text-sm">
            <a href="#getting-started" className="hover:underline" style={{ color: appearance.primaryColor }}>Getting Started</a>
            <span className="text-muted-foreground">•</span>
            <a href="#features" className="hover:underline" style={{ color: appearance.primaryColor }}>Features</a>
            <span className="text-muted-foreground">•</span>
            <a href="#user-guide" className="hover:underline" style={{ color: appearance.primaryColor }}>User Guide</a>
            <span className="text-muted-foreground">•</span>
            <a href="#troubleshooting" className="hover:underline" style={{ color: appearance.primaryColor }}>Troubleshooting</a>
            <span className="text-muted-foreground">•</span>
            <a href="#support" className="hover:underline" style={{ color: appearance.primaryColor }}>Support</a>
          </div>
        </div>

        <hr className="my-6 border-border" />

        {/* Table of Contents - Compact */}
        <div className="mb-6 bg-muted/50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-foreground mb-3">Table of Contents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <a href="#overview" className="hover:underline" style={{ color: appearance.primaryColor }}>Overview</a>
            <a href="#getting-started" className="hover:underline" style={{ color: appearance.primaryColor }}>Getting Started</a>
            <a href="#authentication" className="hover:underline" style={{ color: appearance.primaryColor }}>Authentication</a>
            <a href="#identity-verification-process" className="hover:underline" style={{ color: appearance.primaryColor }}>Identity Verification Process</a>
            <a href="#document-management" className="hover:underline" style={{ color: appearance.primaryColor }}>Document Management</a>
            <a href="#configuration-management" className="hover:underline" style={{ color: appearance.primaryColor }}>Configuration Management</a>
            <a href="#user-roles-permissions" className="hover:underline" style={{ color: appearance.primaryColor }}>User Roles & Permissions</a>
            <a href="#troubleshooting" className="hover:underline" style={{ color: appearance.primaryColor }}>Troubleshooting</a>
            <a href="#best-practices" className="hover:underline" style={{ color: appearance.primaryColor }}>Best Practices</a>
            <a href="#support-contact" className="hover:underline" style={{ color: appearance.primaryColor }}>Support & Contact</a>
          </div>
        </div>

        <hr className="my-6 border-border" />

        {/* Overview */}
        <section id="overview" className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Overview</h2>
          <p className="text-muted-foreground mb-6">
            VeraFi.Me is a comprehensive identity verification platform designed to streamline document processing, face recognition, and liveness detection. Built with modern web technologies, it provides a secure, user-friendly interface for identity verification workflows.
          </p>
          
          <h3 className="text-xl font-medium text-foreground mb-4">Key Features</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li>🔐 <strong>Multi-Factor Authentication</strong> - Password and OTP-based login</li>
            <li>📄 <strong>Document Processing</strong> - Support for passports, driver licenses, and ID cards</li>
            <li>👤 <strong>Face Recognition</strong> - Advanced biometric verification</li>
            <li>🎥 <strong>Liveness Detection</strong> - Video-based anti-spoofing technology</li>
            <li>📱 <strong>Phone Verification</strong> - SMS OTP verification</li>
            <li>⚙️ <strong>Dynamic Configuration</strong> - Real-time system settings management</li>
            <li>🔒 <strong>Role-Based Access Control</strong> - Granular permission management</li>
          </ul>
        </section>

        {/* Getting Started */}
        <section id="getting-started" className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Getting Started</h2>
          
          <h3 className="text-xl font-medium text-foreground mb-4">System Requirements</h3>
          <ul className="space-y-2 text-muted-foreground mb-6">
            <li><strong>Browser:</strong> Chrome 90+, Firefox 88+, Safari 14+, Edge 90+</li>
            <li><strong>Camera:</strong> Webcam for face recognition and liveness detection</li>
            <li><strong>Microphone:</strong> For audio verification (optional)</li>
            <li><strong>Internet:</strong> Stable connection for real-time processing</li>
          </ul>

          <h3 className="text-xl font-medium text-foreground mb-4">First-Time Setup</h3>
          <ol className="space-y-4 text-muted-foreground">
            <li>
              <strong>Access the Platform</strong>
              <ul className="ml-6 mt-2 space-y-1">
                <li>Navigate to your VeraFi.Me instance</li>
                <li>You'll be redirected to the login page</li>
              </ul>
            </li>
            <li>
              <strong>Initial Login</strong>
              <ul className="ml-6 mt-2 space-y-1">
                <li>Use your provided credentials</li>
                <li>Choose your role (Admin or Operator)</li>
                <li>Select authentication method (Password or OTP)</li>
              </ul>
            </li>
            <li>
              <strong>Dashboard Overview</strong>
              <ul className="ml-6 mt-2 space-y-1">
                <li>Familiarize yourself with the sidebar navigation</li>
                <li>Review available features based on your role</li>
                <li>Check system status and configuration</li>
              </ul>
            </li>
          </ol>
        </section>

        {/* Authentication */}
        <section id="authentication" className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Authentication</h2>
          
          <h3 className="text-xl font-medium text-foreground mb-4">Login Methods</h3>
          <p className="text-muted-foreground mb-4">VeraFi.Me supports two authentication methods for enhanced security:</p>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-foreground mb-2">Password Authentication</h4>
              <ol className="ml-6 space-y-1 text-muted-foreground">
                <li>Enter your username or email</li>
                <li>Enter your password</li>
                <li>Select your role from the dropdown</li>
                <li>Click "Login"</li>
              </ol>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-foreground mb-2">OTP Authentication</h4>
              <ol className="ml-6 space-y-1 text-muted-foreground">
                <li>Enter your username or email</li>
                <li>Click "Login with OTP"</li>
                <li>Check your email for the 6-digit OTP</li>
                <li>Enter the OTP in the verification field</li>
                <li>Select your role from the dropdown</li>
                <li>Click "Login with OTP"</li>
              </ol>
            </div>
          </div>

          <h3 className="text-xl font-medium text-foreground mt-8 mb-4">Password Reset</h3>
          <p className="text-muted-foreground mb-4">If you forget your password:</p>
          <ol className="ml-6 space-y-1 text-muted-foreground">
            <li>Click "Forgot Password?" on the login page</li>
            <li>Enter your email address</li>
            <li>Click "Send OTP"</li>
            <li>Check your email for the reset OTP</li>
            <li>Enter the OTP in the verification field</li>
            <li>Enter your new password</li>
            <li>Confirm your new password</li>
            <li>Click "Reset Password"</li>
          </ol>

          <h3 className="text-xl font-medium text-foreground mt-8 mb-4">Session Management</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li>Sessions automatically expire after inactivity</li>
            <li>You can manually logout using the logout button in the top-right corner</li>
            <li>Multiple login attempts may temporarily lock your account</li>
          </ul>
        </section>

        {/* Identity Verification Process */}
        <section id="identity-verification-process" className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Identity Verification Process</h2>
          
          <h3 className="text-xl font-medium text-foreground mb-4">Step-by-Step Verification Workflow</h3>
          
          <div className="space-y-8">
            <div>
              <h4 className="text-lg font-medium text-foreground mb-2">1. Document Upload</h4>
              <ul className="space-y-1 text-muted-foreground mb-3">
                <li><strong>Supported Formats:</strong> JPG, PNG, PDF</li>
                <li><strong>Document Types:</strong> Passports, Driver Licenses, ID Cards</li>
                <li><strong>File Size:</strong> Maximum 10MB per file</li>
              </ul>
              <p className="text-muted-foreground mb-2"><strong>Process:</strong></p>
              <ol className="ml-6 space-y-1 text-muted-foreground">
                <li>Navigate to the Verification page</li>
                <li>Click "Upload Document" or drag and drop files</li>
                <li>Select document type if prompted</li>
                <li>Wait for automatic document analysis</li>
                <li>Review extracted information</li>
              </ol>
            </div>

            <div>
              <h4 className="text-lg font-medium text-foreground mb-2">2. Face Recognition</h4>
              <ul className="space-y-1 text-muted-foreground mb-3">
                <li><strong>Requirements:</strong> Clear, well-lit photo</li>
                <li><strong>Format:</strong> JPG, PNG</li>
                <li><strong>Size:</strong> Maximum 5MB</li>
              </ul>
              <p className="text-muted-foreground mb-2"><strong>Process:</strong></p>
              <ol className="ml-6 space-y-1 text-muted-foreground">
                <li>Upload a clear photo of the person</li>
                <li>System automatically extracts facial features</li>
                <li>Face is compared against document photo</li>
                <li>Confidence score is displayed</li>
              </ol>
            </div>

            <div>
              <h4 className="text-lg font-medium text-foreground mb-2">3. Liveness Detection</h4>
              <ul className="space-y-1 text-muted-foreground mb-3">
                <li><strong>Duration:</strong> 10 seconds</li>
                <li><strong>Requirements:</strong> Good lighting, stable camera</li>
                <li><strong>Audio:</strong> Speak the displayed phrase clearly</li>
              </ul>
              <p className="text-muted-foreground mb-2"><strong>Process:</strong></p>
              <ol className="ml-6 space-y-1 text-muted-foreground">
                <li>Click "Start Liveness Check"</li>
                <li>Position your face in the camera view</li>
                <li>Read the displayed phrase aloud</li>
                <li>Maintain eye contact throughout the recording</li>
                <li>Wait for processing and verification</li>
              </ol>
            </div>

            <div>
              <h4 className="text-lg font-medium text-foreground mb-2">4. Phone Verification</h4>
              <ul className="space-y-1 text-muted-foreground mb-3">
                <li><strong>Supported Countries:</strong> USA, Canada, India</li>
                <li><strong>Format:</strong> 10-digit phone number</li>
                <li><strong>OTP:</strong> 6-digit verification code</li>
              </ul>
              <p className="text-muted-foreground mb-2"><strong>Process:</strong></p>
              <ol className="ml-6 space-y-1 text-muted-foreground">
                <li>Select your country code</li>
                <li>Enter your 10-digit phone number</li>
                <li>Click "Get OTP"</li>
                <li>Enter the 6-digit OTP received via SMS</li>
                <li>Click "Verify OTP"</li>
              </ol>
            </div>
          </div>

          <h3 className="text-xl font-medium text-foreground mt-8 mb-4">Verification Results</h3>
          <p className="text-muted-foreground mb-4">After completing all steps, you'll see:</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>✅ <strong>Document Verification Status</strong></li>
            <li>✅ <strong>Face Recognition Confidence Score</strong></li>
            <li>✅ <strong>Liveness Detection Result</strong></li>
            <li>✅ <strong>Phone Verification Status</strong></li>
            <li>✅ <strong>Overall Verification Status</strong></li>
          </ul>
        </section>

        {/* Document Management */}
        <section id="document-management" className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Document Management</h2>
          
          <h3 className="text-xl font-medium text-foreground mb-4">Supported Document Types</h3>
          <div className="overflow-x-auto my-6">
            <table className="min-w-full border border-border rounded-lg">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground bg-muted/50 border border-border">Document Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground bg-muted/50 border border-border">Supported Formats</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground bg-muted/50 border border-border">Features</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 border border-border"><strong>Passport</strong></td>
                  <td className="px-4 py-3 border border-border">All major countries</td>
                  <td className="px-4 py-3 border border-border">OCR extraction, face detection</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border"><strong>Driver License</strong></td>
                  <td className="px-4 py-3 border border-border">US States, Canadian Provinces</td>
                  <td className="px-4 py-3 border border-border">Field extraction, validation</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border"><strong>ID Card</strong></td>
                  <td className="px-4 py-3 border border-border">Government-issued</td>
                  <td className="px-4 py-3 border border-border">Data verification, photo matching</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-medium text-foreground mb-4">Document Processing Features</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><strong>Automatic Field Extraction:</strong> Name, date of birth, document number</li>
            <li><strong>Face Detection:</strong> Automatic extraction from documents</li>
            <li><strong>Data Validation:</strong> Cross-reference with government databases</li>
            <li><strong>Quality Assessment:</strong> Blur detection and image quality scoring</li>
          </ul>

          <h3 className="text-xl font-medium text-foreground mt-8 mb-4">Best Practices for Document Upload</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-foreground mb-2">1. Image Quality</h4>
              <ul className="ml-6 space-y-1 text-muted-foreground">
                <li>Ensure good lighting</li>
                <li>Avoid shadows and glare</li>
                <li>Use high-resolution camera</li>
                <li>Keep document flat and unwrinkled</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-medium text-foreground mb-2">2. Document Positioning</h4>
              <ul className="ml-6 space-y-1 text-muted-foreground">
                <li>Capture entire document</li>
                <li>Ensure all text is readable</li>
                <li>Avoid cutting off edges</li>
                <li>Keep camera steady</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-medium text-foreground mb-2">3. File Format</h4>
              <ul className="ml-6 space-y-1 text-muted-foreground">
                <li>Use JPG or PNG for photos</li>
                <li>Use PDF for scanned documents</li>
                <li>Ensure file size is under 10MB</li>
                <li>Check image resolution (minimum 300 DPI)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Configuration Management */}
        <section id="configuration-management" className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Configuration Management</h2>
          
          <h3 className="text-xl font-medium text-foreground mb-4">Accessing Configuration (Admin Only)</h3>
          <ol className="ml-6 space-y-1 text-muted-foreground">
            <li>Navigate to "Manage Configuration" in the sidebar</li>
            <li>Review current system settings</li>
            <li>Modify feature flags as needed</li>
            <li>Save changes</li>
          </ol>

          <h3 className="text-xl font-medium text-foreground mt-8 mb-4">Available Configuration Options</h3>
          <div className="overflow-x-auto my-6">
            <table className="min-w-full border border-border rounded-lg">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground bg-muted/50 border border-border">Setting</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground bg-muted/50 border border-border">Description</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground bg-muted/50 border border-border">Default</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground bg-muted/50 border border-border">Impact</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 border border-border"><strong>Store ID and License Photos</strong></td>
                  <td className="px-4 py-3 border border-border">Save uploaded documents</td>
                  <td className="px-4 py-3 border border-border">Enabled</td>
                  <td className="px-4 py-3 border border-border">Storage usage, compliance</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border"><strong>Store Video</strong></td>
                  <td className="px-4 py-3 border border-border">Save liveness videos</td>
                  <td className="px-4 py-3 border border-border">Enabled</td>
                  <td className="px-4 py-3 border border-border">Storage usage, audit trail</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border"><strong>Store Extracted Faces</strong></td>
                  <td className="px-4 py-3 border border-border">Save face images</td>
                  <td className="px-4 py-3 border border-border">Enabled</td>
                  <td className="px-4 py-3 border border-border">Storage usage, analysis</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border"><strong>AES Encryption Key</strong></td>
                  <td className="px-4 py-3 border border-border">File encryption</td>
                  <td className="px-4 py-3 border border-border">Masked</td>
                  <td className="px-4 py-3 border border-border">Security, data protection</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-medium text-foreground mb-4">Configuration Best Practices</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><strong>Regular Reviews:</strong> Check settings monthly</li>
            <li><strong>Backup Before Changes:</strong> Document current settings</li>
            <li><strong>Test Changes:</strong> Verify functionality after updates</li>
            <li><strong>Monitor Storage:</strong> Track disk space usage</li>
          </ul>
        </section>

        {/* User Roles & Permissions */}
        <section id="user-roles-permissions" className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">User Roles & Permissions</h2>
          
          <h3 className="text-xl font-medium text-foreground mb-4">Role Overview</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-foreground mb-2">Admin Role</h4>
              <p className="text-muted-foreground mb-2"><strong>Full system access including:</strong></p>
              <ul className="ml-6 space-y-1 text-muted-foreground">
                <li>✅ Identity verification</li>
                <li>✅ Document management</li>
                <li>✅ Configuration management</li>
                <li>✅ User management</li>
                <li>✅ System monitoring</li>
                <li>✅ Verification logs</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-foreground mb-2">Operator Role</h4>
              <p className="text-muted-foreground mb-2"><strong>Limited access for verification tasks:</strong></p>
              <ul className="ml-6 space-y-1 text-muted-foreground">
                <li>✅ Identity verification</li>
                <li>✅ Document processing</li>
                <li>✅ Basic reporting</li>
                <li>❌ Configuration changes</li>
                <li>❌ User management</li>
              </ul>
            </div>
          </div>

          <h3 className="text-xl font-medium text-foreground mt-8 mb-4">Permission Matrix</h3>
          <div className="overflow-x-auto my-6">
            <table className="min-w-full border border-border rounded-lg">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground bg-muted/50 border border-border">Feature</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground bg-muted/50 border border-border">Admin</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground bg-muted/50 border border-border">Operator</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 border border-border">Verification</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border">Document Upload</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border">Face Recognition</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border">Liveness Detection</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border">Phone Verification</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border">Configuration</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                  <td className="px-4 py-3 border border-border">❌</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border">User Management</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                  <td className="px-4 py-3 border border-border">❌</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 border border-border">Verification Logs</td>
                  <td className="px-4 py-3 border border-border">✅</td>
                  <td className="px-4 py-3 border border-border">❌</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-medium text-foreground mb-4">Role Selection</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li>Choose your role during login</li>
            <li>Your session is limited to selected role permissions</li>
            <li>Contact your administrator to change roles</li>
            <li>Multiple roles can be assigned to one user</li>
          </ul>
        </section>

        {/* Support & Contact */}
        <section id="support-contact" className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Support & Contact</h2>
          
          <h3 className="text-xl font-medium text-foreground mb-4">Getting Help</h3>
          
          <h4 className="text-lg font-medium text-foreground mb-2">Self-Service Resources</h4>
          <ul className="space-y-2 text-muted-foreground mb-6">
            <li><strong>This User Manual:</strong> Comprehensive guide and troubleshooting</li>
            <li><strong>In-App Help:</strong> Context-sensitive help within the application</li>
            <li><strong>FAQ Section:</strong> Common questions and answers</li>
            <li><strong>Video Tutorials:</strong> Step-by-step walkthroughs</li>
          </ul>

          <h4 className="text-lg font-medium text-foreground mb-2">Contact Information</h4>
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-foreground mb-1">Technical Support</h5>
              <ul className="space-y-1 text-muted-foreground">
                <li>Email: [Contact your system administrator]</li>
                <li>Phone: [Contact your system administrator]</li>
                <li>Hours: [Contact your system administrator]</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-foreground mb-1">Emergency Support</h5>
              <ul className="space-y-1 text-muted-foreground">
                <li>After-hours: [Contact your system administrator]</li>
                <li>Critical issues: [Contact your system administrator]</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-foreground mb-1">Administrative Support</h5>
              <ul className="space-y-1 text-muted-foreground">
                <li>Email: [Contact your system administrator]</li>
                <li>Phone: [Contact your system administrator]</li>
                <li>Hours: [Contact your system administrator]</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-border">
          <p className="text-muted-foreground">
            <strong>VeraFi.Me User Manual</strong> • Version 0.0.2 • Last Updated: August 2025
          </p>
          <p className="text-muted-foreground mt-2">
            For the latest updates, visit our{" "}
            <a href="https://kognitools.kognitoai.com/projects/acufi-qa/frontend/help" className="text-primary hover:text-primary/80 hover:underline" target="_blank" rel="noopener noreferrer">
              documentation portal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Help;
