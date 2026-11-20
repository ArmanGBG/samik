"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QrCode, Copy, Check, Printer } from "lucide-react";

interface QrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  qrToken: string;
}

export function QrModal({
  open,
  onOpenChange,
  classId,
  className,
  qrToken,
}: QrModalProps) {
  const [copied, setCopied] = useState(false);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    qrToken
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(classId);
    setCopied(true);
    toast.success("کد کلاس با موفقیت کپی شد.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <title>بارکد ورود به کلاس ${className}</title>
        <style>
          @page { size: A4 portrait; margin: 20mm; }
          body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; }
          .container { border: 2px dashed #0284c7; padding: 40px; border-radius: 20px; max-width: 600px; margin: 0 auto; }
          h1 { color: #0f172a; font-size: 28px; margin-bottom: 8px; }
          p { color: #64748b; font-size: 16px; margin-top: 0; }
          .qr { width: 300px; height: 300px; margin: 30px auto; display: block; }
          .code-box { background: #f1f5f9; padding: 16px 32px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: monospace; display: inline-block; margin-top: 10px; color: #0284c7; }
          .instructions { margin-top: 30px; font-size: 15px; color: #334155; line-height: 1.8; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>کلاس کنکور: ${className}</h1>
          <p>سامانه مدیریت آموزشی سامیک</p>
          <img src="${qrImageUrl}" class="qr" alt="QR Code" />
          <div>کد اتصال دستی به کلاس:</div>
          <div class="code-box">${classId}</div>
          <div class="instructions">
            <strong>راهنمای داوطلبان:</strong><br>
            ۱. وارد سامانه سامیک شوید.<br>
            ۲. در صفحه کلاس‌ها، بارکد بالا را با دوربین گوشی اسکن کرده یا کد کلاس را وارد کنید.
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">{className}</DialogTitle>
          <DialogDescription className="text-center text-xs">
            بارکد و کد اختصاصی اتصال دانش‌آموزان به کلاس
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-3 space-y-4">
          <div className="p-3 bg-white border-2 border-primary/20 rounded-2xl shadow-sm">
            <img
              src={qrImageUrl}
              alt="QR Code"
              width={220}
              height={220}
              className="rounded-lg"
            />
          </div>

          <div className="space-y-1.5 w-full">
            <div className="text-xs text-muted-foreground">کد اتصال مستقیم:</div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-2xl font-bold tracking-wider text-primary bg-primary/10 px-4 py-1.5 rounded-lg border border-primary/20">
                {classId}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                title="کپی کد کلاس"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="text-[12px] text-muted-foreground leading-relaxed bg-muted/40 p-2.5 rounded-lg border">
            دانش‌آموزان می‌توانند با اسکن این تصویر یا وارد کردن کد فوق، بلافاصله عضو
            کلاس شوند.
          </div>

          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4" />
              چاپ پوستر کلاس
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
