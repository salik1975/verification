
interface VerificationStepsProps {
  steps: readonly string[];
  currentStep: string;
  t: (key: string) => string;
}

export function VerificationSteps({ steps, currentStep, t }: VerificationStepsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {steps.map((step, index) => (
        <div
          key={step}
          className={`p-3 rounded-lg flex flex-col items-center justify-center text-center ${
            steps.indexOf(currentStep) === index
              ? "bg-primary/10 text-primary"
              : steps.indexOf(currentStep) > index
              ? "bg-muted text-muted-foreground"
              : "bg-muted/50 text-muted-foreground"
          }`}
        >
          <div
            className={`size-8 rounded-full flex items-center justify-center text-sm mb-2 ${
              steps.indexOf(currentStep) === index
                ? "bg-primary text-primary-foreground"
                : steps.indexOf(currentStep) > index
                ? "bg-muted-foreground text-muted"
                : "bg-muted-foreground/30 text-muted-foreground"
            }`}
          >
            {index + 1}
          </div>
          <span className="text-xs">
            {t(`verify.step${index + 1}`)}
          </span>
        </div>
      ))}
    </div>
  );
}
