import { CheckCircle2, XCircle } from "lucide-react";

export const ProgressStep = ({ 
  icon: Icon, 
  title, 
  completed = false, 
  failed = false 
}: { 
  icon: any, 
  title: string, 
  completed?: boolean, 
  failed?: boolean 
}) => (
  <div className="flex flex-col items-center gap-2">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
      failed ? 'bg-red-500 text-white' : completed ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
    }`}>
      {failed ? <XCircle className="w-5 h-5" /> : completed ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
    </div>
    <span className={`text-sm text-center ${failed ? 'text-red-500 font-medium' : completed ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
      {title}
    </span>
  </div>
);
