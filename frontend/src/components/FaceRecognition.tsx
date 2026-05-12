import { useDriverLicense } from "@/pages/context/DriverLicenseContext";
import { MdOutlineFace6 } from "react-icons/md";

export function FaceRecognition() {
  const { driverLicenseData, videoFace, idFace, resultData } = useDriverLicense();

  const imageSize = "w-[80px] h-[80px]";

  // 🔍 Find index of verified result with lowest distance
  const getHighlightIndex = () => {
    if (!Array.isArray(resultData)) return -1;

    const verifiedResults = resultData.filter(r => r.verified);
    if (verifiedResults.length === 0) return -1;

    let minIndex = -1;
    let minDistance = Infinity;

    verifiedResults.forEach(result => {
      const idx = resultData.indexOf(result);
      if (result.distance < minDistance) {
        minDistance = result.distance;
        minIndex = idx;
      }
    });

    return minIndex;
  };

  const highlightIndex = getHighlightIndex(); // dynamically computed

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex flex-row items-center justify-center gap-4">
        {/* Document face */}
        <div className={`${imageSize} relative flex flex-col items-center`}>
          {idFace ? (
                         <div className="w-full h-full border border-border rounded-lg overflow-hidden bg-muted flex flex-col">
               <div className="pt-2 px-3 pb-1 flex justify-center">
                 <img
                   src={idFace}
                   alt="Main Document Face"
                   className="max-w-full max-h-12 object-contain rounded"
                 />
               </div>
               <div className="bg-black/60 text-white text-[8px] px-1 py-0.5 text-center font-medium mt-auto">
                 ID Face
               </div>
             </div>
          ) : (
                         <div className="w-full h-full bg-muted border border-border rounded-lg flex items-center justify-center p-4 relative">
               <MdOutlineFace6 className="w-8 h-8 text-muted-foreground" />
               <span className="absolute bottom-2 left-0 right-0 text-xs text-foreground font-medium text-center">ID Face</span>
             </div>
          )}
        </div>

        {/* Video faces */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`${imageSize} relative flex flex-col items-center`}
          >
            {videoFace?.[i] ? (
                             <div className="w-full h-full border border-border rounded-lg overflow-hidden bg-muted flex flex-col">
                 <div className="pt-2 px-3 pb-1 flex justify-center">
                   <img
                     src={videoFace[i]}
                     alt={`Video Face ${i}`}
                     className="max-w-full max-h-12 object-contain rounded"
                   />
                 </div>
                 <div className="bg-black/60 text-white text-[8px] px-1 py-0.5 text-center font-medium mt-auto">
                   Live Face{i + 1}
                 </div>
               </div>
            ) : (
                                          <div className="w-full h-full bg-muted border border-border rounded-lg flex items-center justify-center p-4 relative">
               <MdOutlineFace6 className="w-8 h-8 text-muted-foreground" />
               <span className="absolute bottom-2 left-0 right-0 text-[10px] text-foreground font-medium text-center leading-tight">Live Face{i + 1}</span>
             </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
