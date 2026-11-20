"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast.error("لطفاً رمز عبور فعلی خود را وارد کنید.");
      return;
    }

    if (newPassword.trim().length < 4) {
      toast.error("رمز عبور جدید باید حداقل ۴ کاراکتر باشد.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("رمز عبور جدید با تکرار آن مطابقت ندارد.");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("رمز عبور جدید نمی‌تواند همانند رمز عبور فعلی باشد.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/password/change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.error || "خطا در تغییر رمز عبور.");
        return;
      }

      toast.success(data.message || "رمز عبور با موفقیت به‌روزرسانی شد.");
      handleClose(false);
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-navy flex items-center gap-2 text-base font-semibold">
            <KeyRound className="h-5 w-5 text-navy" />
            تغییر رمز عبور
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            برای حفظ امنیت حساب کاربری خود، یک رمز عبور جدید با حداقل ۴ کاراکتر انتخاب نمایید.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Current Password */}
          <div className="space-y-1.5">
            <Label htmlFor="curr-pass" className="text-xs font-medium">
              رمز عبور فعلی
            </Label>
            <div className="relative">
              <Input
                id="curr-pass"
                type={showCurrent ? "text" : "password"}
                dir="ltr"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="رمز عبور فعلی"
                className="text-left font-mono h-9 pr-3 pl-9"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-hidden"
                aria-label={showCurrent ? "مخفی‌سازی رمز" : "نمایش رمز"}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="new-pass" className="text-xs font-medium">
              رمز عبور جدید
            </Label>
            <div className="relative">
              <Input
                id="new-pass"
                type={showNew ? "text" : "password"}
                dir="ltr"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="حداقل ۴ کاراکتر"
                className="text-left font-mono h-9 pr-3 pl-9"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-hidden"
                aria-label={showNew ? "مخفی‌سازی رمز" : "نمایش رمز"}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="conf-pass" className="text-xs font-medium">
              تکرار رمز عبور جدید
            </Label>
            <div className="relative">
              <Input
                id="conf-pass"
                type={showConfirm ? "text" : "password"}
                dir="ltr"
                required
                minLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="تکرار رمز عبور جدید"
                className="text-left font-mono h-9 pr-3 pl-9"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-hidden"
                aria-label={showConfirm ? "مخفی‌سازی رمز" : "نمایش رمز"}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
              className="text-xs cursor-pointer"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-xs bg-navy hover:bg-navy-dark text-white cursor-pointer"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />}
              ذخیره تغییرات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
