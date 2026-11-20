"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, QrCode, Keyboard, Sparkles, CheckCircle2 } from "lucide-react";

interface JoinClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function JoinClassDialog({
  open,
  onOpenChange,
  onSuccess,
}: JoinClassDialogProps) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [activeTab, setActiveTab] = useState("manual");

  const handleSubmit = async (codeToSubmit?: string) => {
    if (submittingRef.current) return;
    const target = (codeToSubmit || code).trim();
    if (!target) {
      toast.error("لطفاً کد کلاس یا اطلاعات بارکد را وارد کنید.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/academy/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeOrToken: target }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "با موفقیت به کلاس پیوستید.");
        setCode("");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error || "خطا در پیوستن به کلاس.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه هنگام ارتباط با سرور.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            عضویت در کلاس کنکور جدید
          </DialogTitle>
          <DialogDescription className="text-xs">
            برای ورود به کلاس، کد ارائه شده توسط استاد را وارد نمایید یا بارکد کلاس
            را ثبت کنید.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="manual" className="text-xs gap-1.5">
              <Keyboard className="w-4 h-4" />
              ورود با کد کلاس
            </TabsTrigger>
            <TabsTrigger value="qr" className="text-xs gap-1.5">
              <QrCode className="w-4 h-4" />
              بارکد / اسکنر
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-code">کد ۶ رقمی کلاس (نمونه: CLS-82X14A)</Label>
              <Input
                id="class-code"
                placeholder="CLS-XXXXXX"
                dir="ltr"
                className="font-mono text-center text-lg tracking-widest uppercase h-12"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground text-right leading-relaxed">
                این کد را می‌توانید از استاد دوره، مسئول آموزشگاه یا پوستر کلاس
                دریافت کنید.
              </p>
            </div>

            <Button
              type="button"
              className="w-full h-11 text-sm gap-2"
              onClick={() => handleSubmit()}
              disabled={submitting || !code.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال بررسی و عضویت...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  پیوستن به کلاس
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="qr" className="space-y-3">
            <div className="p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-3 bg-muted/20">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold">اسکن بارکد کلاس</div>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                اگر استاد بارکد QR کلاس را روی تخته یا نمایشگر قرار داده است،
                می‌توانید با دوربین گوشی آن را اسکن کنید یا توکن آن را در کادر دستی
                وارد نمایید.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">یا توکن اختصاصی بارکد را وارد کنید:</Label>
              <Input
                placeholder="توکن یا کد اسکن‌شده..."
                dir="ltr"
                className="font-mono text-xs"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <Button
              type="button"
              className="w-full h-11 text-sm gap-2"
              onClick={() => handleSubmit()}
              disabled={submitting || !code.trim()}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "پیوستن با بارکد"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
