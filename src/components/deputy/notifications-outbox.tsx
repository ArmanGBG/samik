"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
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
import { toast } from "sonner";
import {
  Loader2,
  Bell,
  Send,
  Trash2,
  Edit3,
  CheckCircle2,
  Phone,
  Users,
  CheckSquare,
  Square,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Poll every 5s for real-time updates (SSE could also be used here
    // — the send-bulk endpoint emits `notification:sent` events that
    // the live dashboard already consumes. For the outbox page, polling
    // is simpler and adequate since the deputy is actively viewing it.)
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

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
    const r = await fetch(`/api/v1/notifications/outbox/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!d.ok) {
      toast.error(d.error ?? "حذف ناموفق بود.");
      return;
    }
    toast.success("پیش‌نویس حذف شد.");
    load();
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
    } finally {
      setSending(false);
    }
  }

  const draftCount = drafts.length;
  const sentToday = items.filter((i) => i.status === "SENT").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
            <Bell className="h-6 w-6" />
            کارتابل پیامک
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            پیش‌نویس پیامک‌های غیبت — ویرایش، حذف یا ارسال گروهی.
          </p>
        </div>
        {draftCount > 0 && (
          <Button
            onClick={sendBulk}
            disabled={sending || selected.size === 0}
            className="bg-emerald hover:bg-emerald-dark gap-2 shadow-lg shadow-emerald/20"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            ارسال پیامک گروهی ({selected.size > 0 ? selected.size.toLocaleString("fa-IR") : "۰"})
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-center">
          <div className="text-2xl font-bold text-warning">{draftCount.toLocaleString("fa-IR")}</div>
          <div className="text-xs text-muted-foreground">در انتظار ارسال</div>
        </div>
        <div className="rounded-xl border border-emerald/20 bg-emerald/5 p-3 text-center">
          <div className="text-2xl font-bold text-emerald">{sentToday.toLocaleString("fa-IR")}</div>
          <div className="text-xs text-muted-foreground">ارسال‌شده امروز</div>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{selected.size.toLocaleString("fa-IR")}</div>
          <div className="text-xs text-muted-foreground">انتخاب‌شده</div>
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-navy flex items-center justify-between">
            <span>پیش‌نویس‌ها ({draftCount})</span>
            {draftCount > 0 && (
              <button
                onClick={selectAll}
                className="text-xs text-navy hover:underline flex items-center gap-1"
              >
                {selected.size === drafts.length ? (
                  <><Square className="h-3.5 w-3.5" /> لغو انتخاب همه</>
                ) : (
                  <><CheckSquare className="h-3.5 w-3.5" /> انتخاب همه</>
                )}
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : draftCount === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald/40" />
              هیچ پیش‌نویس پیامکی در انتظار نیست.
            </div>
          ) : (
            <div className="space-y-2">
              {drafts.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all",
                    selected.has(item.id)
                      ? "border-emerald bg-emerald/5"
                      : "border-border hover:border-navy/30"
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className="mt-1 shrink-0"
                  >
                    {selected.has(item.id) ? (
                      <CheckSquare className="h-5 w-5 text-emerald" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{item.studentName}</span>
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                        غیبت
                      </Badge>
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {item.recipientPhone}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {new Date(item.createdAt).toLocaleTimeString("fa-IR")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.messageBody}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className="text-info hover:text-info hover:bg-info/10"
                      title="ویرایش متن"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => discard(item.id, item.studentName)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="حذف پیش‌نویس"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-navy">ویرایش متن پیامک</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">گیرنده</Label>
              <p className="text-sm font-medium mt-0.5">
                {editing?.studentName} • <span dir="ltr">{editing?.recipientPhone}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>متن پیامک</Label>
              <Textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-left">
                {editText.length.toLocaleString("fa-IR")} / ۵۰۰
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>انصراف</Button>
            <Button
              onClick={saveEdit}
              disabled={!editText.trim()}
              className="bg-emerald hover:bg-emerald-dark"
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
