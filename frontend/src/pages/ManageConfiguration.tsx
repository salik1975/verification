import { useEffect, useState, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfigService } from "@/services/configService";
import { ConfigStoreRow } from "@/services/types";
import { toast } from "@/hooks/use-toast";
import { Upload, Palette, Settings, Search, Key, User, FileText, Video, Upload as UploadIcon, Eye, Phone, MessageSquare, Mic, CheckCircle, Shield, UserCheck } from "lucide-react";
import { LuScanFace } from "react-icons/lu";
import { MdOutlineVideoCameraFront } from "react-icons/md";
import { CgProfile } from "react-icons/cg";
import { ColorPicker } from "@/components/ui/color-picker";
import { VerificationPreview } from "@/components/VerificationPreview";
import { useAppearance } from "@/components/contexts/AppearanceContext";
import AcuCheckLogoIcon from "@/assets/AcuCheck-LogoIcon.png";

const BOOL_KEYS = [
  "STORE_ID_AND_LICENSE_PHOTO",
  "STORE_VIDEO",
  "STORE_EXTRACTED_FACES",
  // Verification configuration boolean keys
  "ENABLE_DOCUMENT_UPLOAD",
  "ENABLE_CRITICAL_FIELDS_CHECK",
  "ENABLE_LIVENESS_CHECK",
  "ENABLE_VIDEO_FACE",
  "ENABLE_FACE_MATCH",
  "ENABLE_PHRASE_VERIFICATION",
  "ENABLE_LIVE_PHRASE",
  "ENABLE_OTP_VERIFICATION",
  "ENABLE_EMAIL_VERIFICATION",
];

// Special keys that should be displayed but not as toggles
const SPECIAL_KEYS = [
  "AES_KEY"
];

// Keys to exclude from the configuration tab (these are handled in appearance tab)
const APPEARANCE_KEYS = [
  "PRODUCT_LOGO",
  "PRODUCT_NAME_IMAGE", 
  "PRIMARY_COLOR"
];

// Icon mapping for configuration settings
const getSettingIcon = (keyName: string) => {
  switch (keyName) {
    case "AES_KEY":
      return Key;
    case "STORE_EXTRACTED_FACES":
      return CgProfile;
    case "STORE_ID_AND_LICENSE_PHOTO":
      return FileText;
    case "STORE_VIDEO":
      return Video;
    case "ENABLE_DOCUMENT_UPLOAD":
      return UploadIcon;
    case "ENABLE_FACE_MATCH":
      return LuScanFace;
    case "ENABLE_LIVENESS_CHECK":
      return Eye;
    case "ENABLE_OTP_VERIFICATION":
      return Phone;
    case "ENABLE_PHRASE_VERIFICATION":
      return MessageSquare;
    case "ENABLE_LIVE_PHRASE":
      return Mic;
    case "ENABLE_CRITICAL_FIELDS_CHECK":
      return CheckCircle;
    case "ENABLE_VIDEO_FACE":
      return MdOutlineVideoCameraFront;
    default:
      return Settings;
  }
};

export default function ManageConfiguration() {
  const [config, setConfig] = useState<ConfigStoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("config");
  const [searchQuery, setSearchQuery] = useState("");

  // Appearance settings state
  const [appearanceSettings, setAppearanceSettings] = useState({
    productLogo: null as File | null,
    productNameImage: null as File | null,
    primaryColor: "#6478CF",
  });
  const [appearanceEdited, setAppearanceEdited] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(AcuCheckLogoIcon);
  const [nameImagePreview, setNameImagePreview] = useState<string>(AcuCheckLogoIcon);
  const [hasNameImageFromDB, setHasNameImageFromDB] = useState(false);
  
  // Refs for file inputs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const nameImageInputRef = useRef<HTMLInputElement>(null);
  
  // Global appearance context
  const { refreshAppearance } = useAppearance();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configData, appearanceData] = await Promise.all([
          ConfigService.getConfigStore(),
          ConfigService.getAppearanceSettings()
        ]);
        
        setConfig(configData);
        
        // Set appearance settings from database
        setAppearanceSettings(prev => ({
          ...prev,
          primaryColor: appearanceData.primaryColor
        }));
        
        // Set preview images from database
        if (appearanceData.productLogo) {
          setLogoPreview(appearanceData.productLogo);
        }
        if (appearanceData.productNameImage) {
          setNameImagePreview(appearanceData.productNameImage);
          setHasNameImageFromDB(true);
        }
        
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch configuration");
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleCheckboxChange = (key_name: string, checked: boolean) => {
    setEdited((prev) => ({ ...prev, [key_name]: checked ? "True" : "False" }));
    setConfig((prev) =>
      prev.map((row) =>
        row.key_name === key_name ? { ...row, value: checked ? "True" : "False" } : row
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Only create items for keys that have been edited
    const itemsToUpdate = Object.keys(edited)
      .filter(key => BOOL_KEYS.includes(key))
      .map(key => ({
        key_name: key,
        value: edited[key],
        description: config.find(row => row.key_name === key)?.description || '',
        is_available: true
      }));
    
    if (itemsToUpdate.length === 0) {
      setSaving(false);
      return;
    }
    
    try {
      await ConfigService.updateConfigStore(itemsToUpdate);
      toast({ title: "Configuration updated successfully" });
      setEdited({});
    } catch (err) {
      toast({ title: "Failed to update configuration", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Appearance settings handlers
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "image/svg+xml" || file.type === "image/png") {
        setAppearanceSettings(prev => ({ ...prev, productLogo: file }));
        setAppearanceEdited(true);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setLogoPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        toast({ 
          title: "Invalid file type", 
          description: "Please select an SVG or PNG file",
          variant: "destructive" 
        });
      }
    }
  };

  const handleNameImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "image/svg+xml" || file.type === "image/png") {
        setAppearanceSettings(prev => ({ ...prev, productNameImage: file }));
        setAppearanceEdited(true);
        setHasNameImageFromDB(true); // Set flag when new file is uploaded
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setNameImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        toast({ 
          title: "Invalid file type", 
          description: "Please select an SVG or PNG file",
          variant: "destructive" 
        });
      }
    }
  };

  const handleColorChange = (color: string) => {
    // Validate hex color
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexRegex.test(color)) {
      setAppearanceSettings(prev => ({ ...prev, primaryColor: color }));
      setAppearanceEdited(true);
    }
  };

  const handleSaveAppearance = async () => {
    try {
      const settingsToUpdate: any = {};
      
      // Save if we have a new logo preview (different from default)
      if (logoPreview && logoPreview !== AcuCheckLogoIcon) {
        settingsToUpdate.productLogo = logoPreview;
      }
      if (nameImagePreview && nameImagePreview !== AcuCheckLogoIcon) {
        settingsToUpdate.productNameImage = nameImagePreview;
      }
      if (appearanceSettings.primaryColor) {
        settingsToUpdate.primaryColor = appearanceSettings.primaryColor;
      }
      
      await ConfigService.updateAppearanceSettings(settingsToUpdate);
      
      // Refresh global appearance settings
      await refreshAppearance();
      
      toast({ title: "Appearance settings saved successfully" });
      setAppearanceEdited(false);
    } catch (err) {
      toast({ 
        title: "Failed to save appearance settings", 
        variant: "destructive" 
      });
    }
  };

  // Filter and sort config based on search query
  const filteredConfig = config
    .filter((row) => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      return (
        row.key_name.toLowerCase().includes(searchLower) ||
        row.description.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => a.key_name.localeCompare(b.key_name)); // Sort alphabetically by key_name

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-accent text-accent-foreground px-6 py-6 rounded-lg mr-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold mb-2 text-white">Manage Configuration</h1>
            <p className="text-white">View and update system configuration settings</p>
          </div>
        </div>

        {/* Sub Header with Tabs */}
        <div className="mt-8 bg-card rounded-lg p-6 mb-[-4rem]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full bg-background border-2 border-border shadow-lg rounded-lg p-1">
              <TabsTrigger 
                value="config" 
                className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:scale-105 data-[state=active]:z-10 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:z-0 transition-all duration-200 font-medium border-0 focus:border-0 focus:ring-0 rounded-md h-14"
              >
                Configuration
              </TabsTrigger>
              <TabsTrigger 
                value="appearance"
                className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=active]:scale-105 data-[state=active]:z-10 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:z-0 transition-all duration-200 font-medium border-0 focus:border-0 focus:ring-0 rounded-md h-14"
              >
                Appearance
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 mt-8 mr-6">
        <div className="max-w-7xl mx-auto border border-border rounded-lg p-6 bg-card">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="config" className="space-y-6">
              {/* Search and Update Section */}
              <div className="flex justify-between items-center">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search settings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={Object.keys(edited).length === 0 || saving}
                  className="px-8"
                >
                  {saving ? "Updating..." : "Update"}
                </Button>
              </div>

              {/* Configuration Cards Grid */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading configuration...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Filter out appearance settings and show boolean keys and special keys */}
                  {filteredConfig
                    .filter((row) => BOOL_KEYS.includes(row.key_name) || SPECIAL_KEYS.includes(row.key_name))
                    .map((row, index) => {
                      const IconComponent = getSettingIcon(row.key_name);
                      const isSpecialKey = SPECIAL_KEYS.includes(row.key_name);
                      const isAvailable = row.is_available !== false; // Default to true if not specified
                      
                      return (
                        <div 
                          key={`${searchQuery}-${row.key_name}-${index}`} 
                          className={`bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 relative hover:scale-[1.02] animate-in fade-in-0 slide-in-from-bottom-4 duration-500 ${
                            !isAvailable ? 'opacity-50 grayscale' : ''
                          }`}
                          style={{
                            animationDelay: `${index * 100}ms`,
                            animationFillMode: 'both'
                          }}
                        >
                          {/* Toggle Switch or Masked Input - Top Right */}
                          <div className="absolute top-4 right-4">
                            {isSpecialKey ? (
                              <div className="bg-muted px-3 py-1 rounded-md">
                                <span className="text-muted-foreground font-mono text-sm tracking-wider">
                                  {row.value ? "•".repeat(Math.min(row.value.length, 12)) : "••••••••••••"}
                                </span>
                              </div>
                            ) : (
                              <Switch
                                checked={row.value === "True"}
                                onCheckedChange={(checked) =>
                                  handleCheckboxChange(row.key_name, !!checked)
                                }
                                disabled={!isAvailable}
                              />
                            )}
                          </div>
                          
                          {/* Icon and Content */}
                          <div className="flex flex-col items-start">
                            {/* Icon */}
                            <div className="mb-4">
                              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-sm ${
                                !isAvailable ? 'bg-gray-200 dark:bg-gray-700' : 'bg-muted'
                              }`}>
                                <IconComponent className={`w-10 h-10 ${
                                  !isAvailable ? 'text-gray-400' : 'text-muted-foreground'
                                }`} />
                              </div>
                            </div>
                            
                            {/* Title and Description */}
                            <div className="w-full">
                              <h3 className={`font-semibold mb-3 text-base ${
                                !isAvailable ? 'text-gray-500' : 'text-foreground'
                              }`}>
                                {row.key_name.replace(/_/g, " ")}
                              </h3>
                              <p className={`text-sm leading-relaxed ${
                                !isAvailable ? 'text-gray-400' : 'text-muted-foreground'
                              }`}>
                                {row.description}
                                {!isAvailable && (
                                  <span className="block mt-2 text-xs text-red-500 font-medium">
                                    Not available for your tenant
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="appearance">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[600px]">
                {/* Left Column - Settings */}
                <div className="border rounded-lg bg-card p-6">
                  <div>
                    {/* Product Logo Upload */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold mb-4">Product Logo</h3>
                      <div className="flex items-center gap-6">
                        <div className="flex-shrink-0">
                          <img 
                            src={logoPreview} 
                            alt="Product Logo" 
                            className="w-16 h-16 object-contain border border-border rounded-lg bg-background"
                          />
                        </div>
                        <div className="flex-1">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => logoInputRef.current?.click()}
                            className="w-full"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Logo
                          </Button>
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <p className="text-sm text-muted-foreground mt-2">
                            Recommended: 200x200px, PNG or JPG
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Product Name Image Upload */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold mb-4">Product Name Image</h3>
                      <div className="flex items-center gap-6">
                        <div className="flex-shrink-0">
                          <img 
                            src={nameImagePreview} 
                            alt="Product Name" 
                            className="w-32 h-12 object-contain border border-border rounded-lg bg-background"
                          />
                        </div>
                        <div className="flex-1">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => nameImageInputRef.current?.click()}
                            className="w-full"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Name Image
                          </Button>
                          <input
                            ref={nameImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleNameImageUpload}
                            className="hidden"
                          />
                          <p className="text-sm text-muted-foreground mt-2">
                            Recommended: 300x100px, PNG or JPG
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Primary Color Picker */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold mb-4">Primary Color</h3>
                      <div className="flex items-center gap-4">
                        <ColorPicker
                          value={appearanceSettings.primaryColor}
                          onChange={(color) => {
                            setAppearanceSettings(prev => ({ ...prev, primaryColor: color }));
                            setAppearanceEdited(true);
                          }}
                        />
                        <div className="flex-1">
                          <Input
                            value={appearanceSettings.primaryColor}
                            onChange={(e) => {
                              setAppearanceSettings(prev => ({ ...prev, primaryColor: e.target.value }));
                              setAppearanceEdited(true);
                            }}
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <Button
                      type="button"
                      onClick={handleSaveAppearance}
                      disabled={!appearanceEdited || saving}
                      className="w-full"
                    >
                      {saving ? "Saving..." : "Save Appearance Settings"}
                    </Button>
                  </div>
                </div>

                {/* Right Column - Preview */}
                <div className="border rounded-lg bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Preview</h3>
                  <VerificationPreview
                    logoUrl={logoPreview}
                    nameImageUrl={nameImagePreview}
                    primaryColor={appearanceSettings.primaryColor}
                    hasNameImage={!!appearanceSettings.productNameImage || hasNameImageFromDB}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 
