import { CheckCircle2, XCircle } from "lucide-react";

export const ComparisonStep = ({ title, completed = true, failed = false }: { title: string, completed?: boolean, failed?: boolean }) => (
  <div className="flex items-center gap-3">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
      failed ? 'bg-red-500 text-white' : completed ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
    }`}>
      {failed ? <XCircle className="w-4 h-4" /> : completed && <CheckCircle2 className="w-4 h-4" />}
    </div>
    <span className={`text-sm ${failed ? 'text-red-500 font-medium' : completed ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
      {title}
    </span>
  </div>
);
