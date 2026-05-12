import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Pipette } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  onClose?: () => void;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

export function ColorPicker({ value, onChange, onClose }: ColorPickerProps) {
  const [hsl, setHsl] = useState<HSL>({ h: 0, s: 100, l: 50 });
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert hex to HSL
  const hexToHsl = (hex: string): HSL => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    h /= 360;
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 1/3) {
      r = x; g = c; b = 0;
    } else if (1/3 <= h && h < 1/2) {
      r = 0; g = c; b = x;
    } else if (1/2 <= h && h < 2/3) {
      r = 0; g = x; b = c;
    } else if (2/3 <= h && h < 5/6) {
      r = x; g = 0; b = c;
    } else if (5/6 <= h && h <= 1) {
      r = c; g = 0; b = x;
    }

    const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  };

  // Initialize color from hex value
  useEffect(() => {
    if (value && /^#[0-9A-F]{6}$/i.test(value)) {
      setHsl(hexToHsl(value));
    }
  }, [value]);

  // Initialize with current value on mount and force initial draw
  useEffect(() => {
    if (value && /^#[0-9A-F]{6}$/i.test(value)) {
      const initialHsl = hexToHsl(value);
      setHsl(initialHsl);
    }
  }, []);

  // Force canvas redraw when HSL changes
  useEffect(() => {
    if (canvasRef.current) {
      drawCanvas();
    }
  }, [hsl.h, hsl.s, hsl.l]);

  // Draw color picker canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, `hsl(${hsl.h}, 100%, 50%)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add black gradient overlay
    const blackGradient = ctx.createLinearGradient(0, 0, 0, height);
    blackGradient.addColorStop(0, 'rgba(0,0,0,0)');
    blackGradient.addColorStop(1, 'rgba(0,0,0,1)');

    ctx.fillStyle = blackGradient;
    ctx.fillRect(0, 0, width, height);
  }, [hsl.h]);

  // Initial canvas draw and redraw when picker opens
  useEffect(() => {
    if (canvasRef.current) {
      drawCanvas();
    }
  }, [drawCanvas]);

  // Force canvas redraw when picker opens
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        drawCanvas();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle canvas click/drag
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleCanvasMouseMove(e);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const newS = x * 100;
    const newL = (1 - y) * 100;

    const newHsl = { ...hsl, s: newS, l: newL };
    setHsl(newHsl);
    onChange(hslToHex(newHsl.h, newS, newL));
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const newS = x * 100;
    const newL = (1 - y) * 100;

    const newHsl = { ...hsl, s: newS, l: newL };
    setHsl(newHsl);
    onChange(hslToHex(newHsl.h, newS, newL));
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  // Handle hue slider
  const handleHueMouseDown = (e: React.MouseEvent) => {
    setIsDraggingHue(true);
    handleHueMouseMove(e);
  };

  const handleHueClick = (e: React.MouseEvent) => {
    const slider = hueSliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newH = x * 360;

    const newHsl = { ...hsl, h: newH };
    setHsl(newHsl);
    onChange(hslToHex(newH, newHsl.s, newHsl.l));
  };

  const handleHueMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingHue) return;

    const slider = hueSliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newH = x * 360;

    const newHsl = { ...hsl, h: newH };
    setHsl(newHsl);
    onChange(hslToHex(newH, newHsl.s, newHsl.l));
  };

  const handleHueMouseUp = () => {
    setIsDraggingHue(false);
  };

  // Handle hex input
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      const newHsl = hexToHsl(hex);
      setHsl(newHsl);
      onChange(hex);
    }
  };

  // Eyedropper functionality
  const handleEyedropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        const hex = result.sRGBHex;
        const newHsl = hexToHsl(hex);
        setHsl(newHsl);
        onChange(hex);
      } catch (error) {
        console.log('Eyedropper cancelled');
      }
    }
  };

  // Global mouse event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleCanvasMouseMove(e as any);
      }
      if (isDraggingHue) {
        handleHueMouseMove(e as any);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsDraggingHue(false);
    };

    if (isDragging || isDraggingHue) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isDraggingHue, hsl]);

  // Click outside to close and escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="w-10 h-10 p-0 rounded-xl"
        onClick={() => {
          const newIsOpen = !isOpen;
          setIsOpen(newIsOpen);
          // Force canvas redraw when opening
          if (newIsOpen && canvasRef.current) {
            // Draw immediately and then again after a short delay to ensure it renders
            drawCanvas();
            setTimeout(() => {
              drawCanvas();
            }, 10);
          }
        }}
        title="Color picker"
      >
        <div 
          className="w-6 h-6 rounded border border-border"
          style={{ backgroundColor: value }}
        />
        <Pipette className="absolute w-3 h-3 text-white drop-shadow-sm" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[280px]">
          <div className="space-y-4">
            {/* Main color selection area */}
            <div className="relative">
                             <canvas
                 ref={canvasRef}
                 width={200}
                 height={200}
                 className="w-full h-48 rounded border border-border cursor-crosshair"
                 onMouseDown={handleCanvasMouseDown}
                 onClick={handleCanvasClick}
                 onMouseMove={handleCanvasMouseMove}
                 onMouseUp={handleCanvasMouseUp}
               />
              {/* Color selector */}
              <div
                className="absolute w-3 h-3 border-2 border-white rounded-full shadow-lg pointer-events-none"
                style={{
                  left: `${hsl.s}%`,
                  top: `${100 - hsl.l}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>

            {/* Hue slider */}
            <div className="relative">
                             <div
                 ref={hueSliderRef}
                 className="h-4 rounded border border-border cursor-pointer"
                 style={{
                   background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                 }}
                 onMouseDown={handleHueMouseDown}
                 onClick={handleHueClick}
                 onMouseMove={handleHueMouseMove}
                 onMouseUp={handleHueMouseUp}
               />
              {/* Hue selector */}
              <div
                className="absolute w-3 h-4 border-2 border-white rounded shadow-lg pointer-events-none"
                style={{
                  left: `${hsl.h / 360 * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>

            {/* Color preview and controls */}
            <div className="flex items-center gap-3">
              {/* Color preview */}
              <div
                className="w-12 h-12 rounded border border-border"
                style={{ backgroundColor: value }}
              />
              
              {/* Hex input */}
              <div className="flex-1">
                <Input
                  type="text"
                  value={value}
                  onChange={handleHexChange}
                  className="font-mono text-sm"
                  placeholder="#000000"
                />
              </div>

              {/* Eyedropper */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="w-8 h-8"
                onClick={handleEyedropper}
                title="Pick color from screen"
              >
                                 <Pipette className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 