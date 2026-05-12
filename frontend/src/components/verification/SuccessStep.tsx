
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export function SuccessStep() {
  const { t } = useTranslation();

  return (
    <Card className="w-full">
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto size-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <Shield className="size-8 text-green-600 dark:text-green-300" />
        </div>
        <h3 className="text-xl font-semibold">{t("verify.success")}</h3>
        <p className="text-muted-foreground">
          Your identity verification has been submitted successfully.
          Our team will review your application and get back to you shortly.
        </p>
      </CardContent>
    </Card>
  );
}
