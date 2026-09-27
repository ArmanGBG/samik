import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WelcomeCardProps {
  role: string;
  roleLabel: string;
  schoolName: string;
  features: Array<{ title: string; description: string; status: "ready" | "soon" }>;
}

const STATUS_LABEL: Record<string, string> = {
  ready: "آماده",
  soon: "به‌زودی",
};

export function WelcomeCard({
  role,
  roleLabel,
  schoolName,
  features,
}: WelcomeCardProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-gradient-to-l from-navy to-navy-dark text-white border-0">
        <CardHeader>
          <div className="flex items-center gap-2 text-emerald text-xs font-medium mb-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald animate-pulse" />
            فاز ۱ — پیاده‌سازی موفق بود
          </div>
          <CardTitle className="text-2xl">
            خوش آمدید، {roleLabel}
          </CardTitle>
          <CardDescription className="text-white/80">
            شما با نقش <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">{role}</span> در مدرسه{" "}
            <span className="font-semibold">{schoolName}</span> وارد شده‌اید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-white/10 p-3">
              <p className="text-xs text-white/60">وضعیت نشست</p>
              <p className="text-sm font-medium mt-1">Contextual Token فعال</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <p className="text-xs text-white/60">فیلتر مستاجر</p>
              <p className="text-sm font-medium mt-1">RLS شبیه‌سازی‌شده</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <p className="text-xs text-white/60">میدل‌ور</p>
              <p className="text-sm font-medium mt-1">۳ لایه فعال</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-navy">امکانات این نقش</CardTitle>
          <CardDescription>
            قابلیت‌های قابل دسترس برای شما. موارد «به‌زودی» در فازهای بعدی پیاده‌سازی می‌شوند.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f) => (
              <div
                key={f.title}
                className={cn(
                  "rounded-lg border p-3 flex items-start justify-between gap-3",
                  f.status === "ready"
                    ? "border-emerald/40 bg-emerald/5"
                    : "border-border bg-muted/40 opacity-70"
                )}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {f.description}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs px-2 py-1 rounded-full font-medium",
                    f.status === "ready"
                      ? "bg-emerald text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {STATUS_LABEL[f.status]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
