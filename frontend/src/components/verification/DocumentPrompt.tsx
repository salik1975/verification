import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

export function DocumentPrompt() {
  const { t } = useTranslation();
  return (
    <Card className="h-full flex flex-col bg-muted">
      <CardHeader className="text-center pb-2">
        <h3 className="text-lg font-medium underline">Verify Document ID</h3>

        <p className="text-sm text-muted-foreground">
          {t("verify.upload.instruction")}
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center p-4 pt-0">
        <ul className="text-sm space-y-2 pl-5">
          <li className="list-disc">{t("verify.upload.drivers.license")}</li>
          <li className="list-disc">{t("verify.upload.passport")}</li>
        </ul>
      </CardContent>
    </Card>
  );
}