
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import ManageConfiguration from "./ManageConfiguration";

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="container px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            {t("app.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("app.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 py-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">{t("index.why_verify")}</h2>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <div className="mt-0.5 size-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="size-3 text-primary" />
                </div>
                <div>
                  <span className="font-medium">{t("index.enhanced_security")}</span>
                  <p className="text-sm text-muted-foreground">{t("index.enhanced_security_desc")}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 size-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="size-3 text-primary" />
                </div>
                <div>
                  <span className="font-medium">{t("index.compliance")}</span>
                  <p className="text-sm text-muted-foreground">{t("index.compliance_desc")}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5 size-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="size-3 text-primary" />
                </div>
                <div>
                  <span className="font-medium">{t("index.seamless")}</span>
                  <p className="text-sm text-muted-foreground">{t("index.seamless_desc")}</p>
                </div>
              </li>
            </ul>
            <div className="pt-4">
              <Button size="lg" onClick={() => navigate("/verification")}>
                {t("nav.verify")}
              </Button>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border bg-card">
            <div className="aspect-[4/3] bg-muted flex items-center justify-center">
              <div className="text-center p-6">
                <div className="mx-auto size-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="size-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t("index.secure_verification")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("index.secure_verification_desc")}
                </p>
              </div>
            </div>
            <div className="p-4 bg-card">
              <h3 className="font-medium mb-2">{t("index.how_it_works")}</h3>
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <div className="size-5 rounded-full bg-primary flex items-center justify-center text-xs text-white">1</div>
                  <span className="text-sm">{t("verify.step1")}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="size-5 rounded-full bg-primary flex items-center justify-center text-xs text-white">2</div>
                  <span className="text-sm">{t("verify.step2")}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="size-5 rounded-full bg-primary flex items-center justify-center text-xs text-white">3</div>
                  <span className="text-sm">{t("verify.step3")}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="size-5 rounded-full bg-primary flex items-center justify-center text-xs text-white">4</div>
                  <span className="text-sm">{t("verify.step4")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
