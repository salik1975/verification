import React from "react";
import { CheckCircle2, FileText, Shield, Camera, HelpCircle, Home, Settings, ScrollText, Eye, Moon, Globe, LogOut, Upload, Video } from "lucide-react";
import HelpImage from "@/assets/help_img.png";
import { MdOutlineFace6 } from "react-icons/md";

interface VerificationPreviewProps {
  logoUrl: string;
  nameImageUrl: string;
  primaryColor: string;
  hasNameImage: boolean;
}

export function VerificationPreview({ logoUrl, nameImageUrl, primaryColor, hasNameImage }: VerificationPreviewProps) {
  return (
    <div className="verification-preview-container border rounded-lg bg-background overflow-hidden relative" style={{ height: '350px' }}>
      <div className="verification-preview" style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: '285.7%', height: '285.7%' }}>
        <div className="bg-background flex h-full">
          {/* Sidebar */}
          <div className="w-64 bg-white dark:bg-[#0e142a] border-r border-border flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="bg-white dark:bg-[#0e142a] rounded-tr-[35px] p-4 border-b border-border flex-shrink-0">
                             <div className="flex items-center gap-2">
                 <img
                   src={logoUrl}
                   alt="Logo"
                   className="w-10 rounded-full"
                 />
                                   {hasNameImage ? (
                    <img
                      src={nameImageUrl}
                      alt="Brand Name"
                      className="h-6 object-contain"
                    />
                  ) : (
                    <h1 className="font-poppins font-bold text-xl text-foreground">
                      VeraFi.Me
                    </h1>
                  )}
               </div>
            </div>

            {/* Sidebar Menu */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-2">
                                 <div 
                   className="flex items-center gap-3 px-3 py-2 rounded-lg text-white"
                   style={{ backgroundColor: primaryColor }}
                 >
                   <Shield className="w-5 h-5" />
                   <span className="text-sm font-medium">Verify My Identity</span>
                 </div>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Manage ID Document</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Manage Configuration</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
                  <ScrollText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Verification Logs</span>
                </div>
              </div>
            </div>

                         {/* Sidebar Footer - Help Section */}
             <div className="rounded-br-[35px] bg-white dark:bg-[#0e142a] p-5 flex-shrink-0">
               <div className="rounded-[20px] p-3 flex flex-col items-start justify-start text-left bg-[#eff2ff] dark:bg-[#2e3655] h-[200px] overflow-hidden relative pb-8">
                 <h1 className="text-base font-semibold mb-2 self-start">
                   Support & Help
                 </h1>
                 <button
                   className="self-start w-[60%]"
                   style={{
                     background: `linear-gradient(0deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                     border: "none",
                     boxShadow: `
                       inset 0 2px 4px rgba(255, 255, 255, 0.4),
                       inset 0 -2px 4px rgba(0, 0, 0, 0.2),
                       0 0.7em 1.5em -0.5em ${primaryColor}99
                     `,
                     padding: "10px ",
                     letterSpacing: "0.05em",
                     borderRadius: "20em",
                     color: "white",
                     fontSize: ".85em",
                   }}
                 >
                   Quick Help
                 </button>
                 <img
                   src={HelpImage}
                   alt="Contact Support"
                   className="absolute bottom-2 left-0 right-0 mx-auto w-[60%]"
                 />
               </div>
             </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Header */}
            <div className="w-full sticky top-0 z-40 bg-background border-b border-border">
              <div className="container flex h-14 items-center justify-between px-4">
                <div></div>
                                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                     <Moon className="w-4 h-4 text-white" />
                   </div>
                   <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                     <Globe className="w-4 h-4 text-white" />
                   </div>
                   <button className="w-8 h-8 rounded-full bg-[#43495a] flex items-center justify-center">
                     <LogOut className="w-4 h-4 text-white" />
                   </button>
                 </div>
              </div>
            </div>

                         {/* Verification Page Content */}
             <div className="min-h-screen bg-background">
               {/* Header */}
               <div 
                 className="px-6 py-6 rounded-lg mr-6"
                 style={{ backgroundColor: primaryColor }}
               >
                 <div className="flex justify-between items-start">
                   <div>
                     <h1 className="text-2xl font-semibold mb-2 text-white">Identity Verification</h1>
                     <p className="text-white">Verify document authenticity and validate identity</p>
                   </div>
                   <button 
                     className="px-4 py-2 bg-white bg-opacity-20 text-white border-0 rounded"
                   >
                     Submit Log
                   </button>
                 </div>

                 {/* Progress Steps */}
                 <div className="mt-8 bg-card rounded-lg p-6 mb-[-4rem]">
                   <div className="flex justify-between items-center max-w-4xl mx-auto">
                     <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5 text-green-500" />
                       <span className="text-sm font-medium">Document Scanned</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5 text-green-500" />
                       <span className="text-sm font-medium">ID Face Extracted</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5 text-green-500" />
                       <span className="text-sm font-medium">Face Matched</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5 text-green-500" />
                       <span className="text-sm font-medium">Identity Validated</span>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Main Content */}
               <div className="p-6 mt-8">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto border border-border rounded-lg p-6 bg-card">
                   
                   {/* Step 1: Verify Document ID */}
                   <div className="border border-border rounded-lg p-4">
                     <div className="flex items-center gap-3 mb-4">
                       <FileText className="w-5 h-5 text-muted-foreground" />
                       <h2 className="text-xl font-bold text-foreground">STEP 1 : Verify Document ID</h2>
                     </div>
                     <div className="border-b border-border mb-4 -mx-4 px-4"></div>
                     
                     {/* Document Upload Area */}
                     <div className="bg-muted p-4 rounded-lg">
                       <div className="text-center py-8">
                         <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                         <p className="text-muted-foreground">Upload document to begin verification</p>
                       </div>
                     </div>

                     {/* Upload Document Button */}
                     <div className="mt-4">
                       <button 
                         className="w-full py-2 px-4 text-white rounded-lg flex items-center justify-center gap-2"
                         style={{ backgroundColor: primaryColor }}
                       >
                         <Upload className="w-4 h-4" />
                         Upload Document
                       </button>
                     </div>

                     {/* Requirements Section */}
                     <div className="mt-6">
                       <div className="border border-border rounded-lg p-6 bg-card">
                         <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                           <FileText className="w-4 h-4" />
                           Requirements
                         </h3>
                         <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                           <div className="flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-green-500" />
                             <span className="text-sm text-foreground">Clear, high-resolution images</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-green-500" />
                             <span className="text-sm text-foreground">All four corners visible</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-green-500" />
                             <span className="text-sm text-foreground">No glare or shadows</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-green-500" />
                             <span className="text-sm text-foreground">Valid and unexpired ID</span>
                           </div>
                         </div>
                       </div>
                     </div>

                     <hr className="my-6 border-border" />
                     
                     {/* Phone Number Verification */}
                     <div className="mt-6">
                       <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                         <Shield className="w-4 h-4" />
                         Phone Number Verification
                       </h3>
                       <div className="bg-muted p-4 rounded-lg">
                         <div className="space-y-4">
                           <div className="flex justify-center gap-2">
                             <select className="border-2 border-gray-300 rounded-lg px-3 py-2 bg-background text-foreground">
                               <option value="+1">🇺🇸 USA (+1)</option>
                               <option value="+1">🇨🇦 Canada (+1)</option>
                               <option value="+91">🇮🇳 India (+91)</option>
                             </select>
                             <input
                               type="tel"
                               placeholder="Phone Number"
                               className="w-48 border-2 border-gray-300 rounded-lg px-3 py-2 bg-background text-foreground"
                             />
                           </div>
                           <div className="flex justify-center">
                                                           <button 
                                className="px-6 py-2 text-white rounded-lg"
                                style={{ backgroundColor: primaryColor }}
                              >
                                Get OTP
                              </button>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Step 2: ID Face Verification */}
                   <div className="border border-border rounded-lg p-4">
                     <div className="flex items-center gap-3 mb-4">
                       <Shield className="w-5 h-5 text-muted-foreground" />
                       <h2 className="text-xl font-bold text-foreground">STEP 2 : ID Face Verification</h2>
                     </div>
                     <div className="border-b border-border mb-4 -mx-4 px-4"></div>
                     
                     {/* Video Capture Area */}
                     <div className="bg-muted p-4 rounded-lg">
                       <div className="text-center py-8">
                         <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                         <p className="text-muted-foreground">Record video for face verification</p>
                       </div>
                     </div>

                     {/* Capture Video Button */}
                     <div className="mt-4">
                       <button 
                         className="w-full py-2 px-4 text-white rounded-lg flex items-center justify-center gap-2"
                         style={{ backgroundColor: primaryColor }}
                       >
                         <Video className="w-4 h-4" />
                         Capture Video
                       </button>
                     </div>

                     {/* Face Comparison Section */}
                     <div className="mt-6">
                       <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                         <Camera className="w-4 h-4" />
                         Face Comparison (ID Face VS Live Face - from video)
                       </h3>
                       <div className="bg-muted p-4 rounded-lg">
                         <div className="flex flex-row items-center justify-center gap-4">
                           {/* Document face */}
                           <div className="w-[80px] h-[80px] relative flex flex-col items-center">
                             <div className="w-full h-full bg-muted border border-border rounded-lg flex items-center justify-center p-4 relative">
                               <MdOutlineFace6 className="w-8 h-8 text-muted-foreground" />
                               <span className="absolute bottom-2 left-0 right-0 text-xs text-foreground font-medium text-center">ID Face</span>
                             </div>
                           </div>

                           {/* Video faces */}
                           {Array.from({ length: 3 }).map((_, i) => (
                             <div
                               key={i}
                               className="w-[80px] h-[80px] relative flex flex-col items-center"
                             >
                               <div className="w-full h-full bg-muted border border-border rounded-lg flex items-center justify-center p-4 relative">
                                 <MdOutlineFace6 className="w-8 h-8 text-muted-foreground" />
                                 <span className="absolute bottom-2 left-0 right-0 text-[10px] text-foreground font-medium text-center leading-tight">Live Face{i + 1}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     </div>

                     {/* Face Comparison Analysis */}
                     <div className="mt-6">
                       <div className="border border-border rounded-lg p-6 bg-card">
                         <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                           <Eye className="w-4 h-4" />
                           Face Comparison Analysis
                         </h3>
                         <div className="flex justify-between items-center mt-4">
                           <div className="flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-green-500" />
                             <span className="text-sm text-foreground">ID Photo Extraction</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-green-500" />
                             <span className="text-sm text-foreground">Liveness Detection</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-green-500" />
                             <span className="text-sm text-foreground">Live Phrase Check</span>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 