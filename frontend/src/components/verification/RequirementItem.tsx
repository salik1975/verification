export const RequirementItem = ({ text, completed = true }: { text: string, completed?: boolean }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${completed ? 'bg-green-500' : 'bg-gray-300'}`} />
    <span className="text-sm text-gray-600">{text}</span>
  </div>
);
