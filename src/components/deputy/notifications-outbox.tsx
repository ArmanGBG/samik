"use client";

import { useState, useEffect, useCallback } from "react";
import { useRealtimeEvent } from "@/lib/realtime/realtime-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Loader2,
  Bell,
  Send,
  Trash2,
  Edit3,
  CheckCircle2,
  Mail,
  CheckSquare,
  Square,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { EmptyState } from "@/components/shared/empty-state";

interface OutboxItem {
  id: string;
  studentId: string;
  studentName: string;
  recipientPhone: string;
  eventType: string;
  messageBody: string;
  status: "DRAFT" | "SENT" | "FAILED" | "DISCARDED";
  createdAt: string;
  sentAt: string | null;
}

export function NotificationsOutbox() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<OutboxItem | null>(null);
  const [editText, setEditText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/notifications/outbox?status=DRAFT");
      const d = await r.json();
      if (d.ok) setItems(d.outbox);
    } catch (err) {
      console.error("[LOAD_OUTBOX_ERROR]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time synchronization: automatically re-fetch whenever new attendance
  // creates SMS drafts, or when an absence is excused and draft is discarded!
  useRealtimeEvent(
    ["attendance:submitted", "attendance:excused", "notification:updated"],
    () => {
      void load();
    }
  );

  const drafts = items.filter((i) => i.status === "DRAFT");

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === drafts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(drafts.map((d) => d.id)));
    }
  }

  async function handleEdit(item: OutboxItem) {
    setEditing(item);
    setEditText(item.messageBody);
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const r = await fetch(`/api/v1/notifications/outbox/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageBody: editText }),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ویرایش ناموفق بود.");
        return;
      }
      toast.success("متن پیامک ویرایش شد.");
      setEditing(null);
      load();
    } catch {
      toast.error("خطای شبکه.");
    }
  }

  async function discard(id: string, name: string) {
    if (!confirm(`حذف پیش‌نویس پیامک برای ${name}؟`)) return;
    try {
      const r = await fetch(`/api/v1/notifications/outbox/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "حذف ناموفق بود.");
        return;
      }
      toast.success("پیش‌نویس حذف شد.");
      load();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    }
  }

  async function sendBulk() {
    if (selected.size === 0) return;
    setSending(true);
    try {
      const r = await fetch("/api/v1/notifications/outbox/send-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const d = await r.json();
      if (!d.ok && r.status !== 202) {
        toast.error(d.error ?? "ارسال ناموفق بود.");
        return;
      }
      // 202 Accepted — the work is happening in the background
      toast.success(
        `${d.queuedCount || selected.size} پیامک در صف ارسال قرار گرفت. در پس‌زمینه ارسال می‌شوند.`,
        { duration: 6000 }
      );
      setSelected(new Set());
      // The polling will pick up the SENT status as the background job completes
    } catch {
      toast.error("خطا در ارسال پیامک‌ها به سرور.");
    } finally {
      setSending(false);
    }
  }

  const draftCount = drafts.length;
  const sentToday = items.filter((i) => i.status === "SENT").length;
  const allSelected = draftCount > 0 && selected.size === draftCount;

  // Bulk-send action button — emerald bg, shows selected count, loading state.
  const bulkSendAction = draftCount > 0 && (
    <Button
      onClick={sendBulk}
      disabled={sending || selected.size === 0}
      className="bg-emerald hover:bg-emerald-dark shadow-md shadow-emerald/20 cursor-pointer gap-2"
    >
      {sending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال ارسال پیامک‌ها...
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          {selected.size > 0
            ? `تأیید و ارسال پیامک‌ها به اولیا (${selected.size.toLocaleString("fa-IR")})`
            : "ارسال پیامک‌ها به اولیا (موردی انتخاب نشده)"}
        </>
      )}
    </Button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="کارتابل پیامک"
        subtitle="پیش‌نویس پیامک‌های غیبت — ویرایش، حذف یا ارسال گروهی به اولیا."
        icon={Bell}
        actions={bulkSendAction}
      />

      {/* KPI row — 3 cards: pending / sent today / selected */}
      <KpiCardGrid
        cards={[
          {
            label: "در انتظار ارسال",
            value: draftCount,
            icon: Mail,
            tint: "warning",
          },
          {
            label: "ارسال‌شده امروز",
            value: sentToday,
            icon: CheckCircle2,
            tint: "emerald",
          },
          {
            label: "انتخاب‌شده",
            value: selected.size,
            icon: Send,
            tint: "navy",
          },
        ]}
      />

      {/* Drafts list */}
      <ScrollReveal delay={120}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-navy flex items-center justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-2">
                پیش‌نویس‌ها
                <Badge variant="outline" className="text-xs tabular-nums">
                  {draftCount.toLocaleString("fa-IR")}
                </Badge>
              </span>
              <div className="flex items-center gap-3">
                {/* Polling indicator */}
                <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  به‌روزرسانی خودکار هر ۵ ثانیه
                </span>
                {draftCount > 0 && (
                  <button
                    type="button"
                    onClick={selectAll}
                    aria-label={allSelected ? "لغو انتخاب همه پیامک‌ها" : "انتخاب همه پیامک‌های در انتظار ارسال"}
                    className="text-xs text-navy hover:text-navy-dark hover:underline flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 rounded px-1"
                  >
                    {allSelected ? (
                      <>
                        <Square className="h-3.5 w-3.5" />
                        لغو انتخاب همه
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-3.5 w-3.5" />
                        انتخاب همه
                      </>
                    )}
                  </button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-navy" />
              </div>
            ) : draftCount === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="هیچ پیش‌نویس پیامکی در انتظار نیست."
                description="به‌محض ثبت غیبت توسط معلمان، پیش‌نویس پیامک‌ها در اینجا نمایش داده می‌شوند."
              />
            ) : (
              <div className="space-y-2">
                {drafts.map((item, i) => {
                  const isSelected = selected.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "stagger-item flex items-start gap-3 p-3 rounded-lg border transition-all",
                        isSelected
                          ? "border-emerald bg-emerald/5"
                          : "border-border hover:border-navy/30"
                      )}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      {/* Custom-styled checkbox (shadcn/Radix — not default browser) */}
                      <div className="pt-0.5 shrink-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(item.id)}
                          aria-label={`انتخاب ${item.studentName}`}
                          className="data-[state=checked]:bg-emerald data-[state=checked]:border-emerald cursor-pointer"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{item.studentName}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-warning/10 text-warning border-warning/30"
                          >
                            غیبت
                          </Badge>
                          <span
                            className="text-xs text-muted-foreground tabular-nums font-mono"
                            dir="ltr"
                          >
                            {item.recipientPhone}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <span>•</span>
                            <span dir="ltr" className="tabular-nums font-mono">
                              {new Date(item.createdAt).toLocaleTimeString("fa-IR")}
                            </span>
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {item.messageBody}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(item)}
                                className="h-8 w-8 text-info hover:text-info hover:bg-info/10 cursor-pointer"
                                aria-label={`ویرایش متن پیامک برای ${item.studentName}`}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <span>ویرایش متن پیامک</span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => discard(item.id, item.studentName)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                aria-label={`حذف پیش‌نویس پیامک ${item.studentName}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <span>حذف این پیش‌نویس</span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-navy">ویرایش متن پیامک ارسالی</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">دانش‌آموز و شماره دریافت‌کننده</Label>
              <p className="text-sm font-medium mt-0.5">
                {editing?.studentName} •{" "}
                <span dir="ltr" className="tabular-nums font-mono">
                  {editing?.recipientPhone}
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">متن پیامک ارسالی به ولی</Label>
              <Textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none tabular-nums"
              />
              <p className="text-xs text-muted-foreground text-left tabular-nums">
                {editText.length.toLocaleString("fa-IR")} / ۵۰۰ نویسه
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              className="cursor-pointer"
            >
              انصراف و بستن
            </Button>
            <Button
              onClick={saveEdit}
              disabled={!editText.trim()}
              className="bg-emerald hover:bg-emerald-dark cursor-pointer gap-2"
            >
              ذخیره تغییرات متن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
