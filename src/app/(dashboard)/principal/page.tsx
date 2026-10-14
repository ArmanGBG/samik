"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  GraduationCap, 
  DoorClosed, 
  CalendarClock, 
  ClipboardCheck, 
  Bell, 
  LayoutDashboard,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

const DASHBOARD_LINKS = [
  {
    title: "کادر و پرسنل",
    description: "مدیریت مدیران، معاونین و معلمان مدرسه",
    icon: Users,
    href: "/principal/staff",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    borderColor: "hover:border-blue-600/50 hover:ring-blue-600/20"
  },
  {
    title: "دانش‌آموزان",
    description: "ثبت‌نام و تخصیص دانش‌آموزان به کلاس‌ها",
    icon: GraduationCap,
    href: "/principal/students",
    color: "text-emerald-600",
    bgColor: "bg-emerald-600/10",
    borderColor: "hover:border-emerald-600/50 hover:ring-emerald-600/20"
  },
  {
    title: "کلاس‌ها",
    description: "تعریف کلاس‌ها بر اساس پایه و رشته",
    icon: DoorClosed,
    href: "/principal/structure/classrooms",
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
    borderColor: "hover:border-amber-600/50 hover:ring-amber-600/20"
  },
  {
    title: "برنامه هفتگی و زنگ‌ها",
    description: "زمان‌بندی زنگ‌ها و ساخت برنامه هفتگی",
    icon: CalendarClock,
    href: "/principal/timetable",
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
    borderColor: "hover:border-purple-600/50 hover:ring-purple-600/20"
  },
  {
    title: "حضور و غیاب زنده",
    description: "مشاهده وضعیت حضور و غیاب در لحظه",
    icon: ClipboardCheck,
    href: "/deputy/live-attendance",
    color: "text-rose-600",
    bgColor: "bg-rose-600/10",
    borderColor: "hover:border-rose-600/50 hover:ring-rose-600/20"
  },
  {
    title: "کارتابل پیامک",
    description: "بررسی و ارسال پیامک‌های غیبت و اطلاع‌رسانی",
    icon: Bell,
    href: "/deputy/notifications",
    color: "text-cyan-600",
    bgColor: "bg-cyan-600/10",
    borderColor: "hover:border-cyan-600/50 hover:ring-cyan-600/20"
  }
];

export default function PrincipalDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="داشبورد مدیریت مدرسه"
        subtitle="دسترسی سریع به بخش‌های مختلف سیستم یکپارچه سامیک"
        icon={LayoutDashboard}
      />
      
      <ScrollReveal delay={30}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DASHBOARD_LINKS.map((link, i) => {
            const Icon = link.icon;
            return (
              <Link key={i} href={link.href} className="block group">
                <Card className={cn("h-full transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ring-1 ring-transparent", link.borderColor)}>
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
                    <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 group-hover:-rotate-3 shrink-0", link.bgColor, link.color)}>
                      <Icon className="w-7 h-7" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-lg text-navy group-hover:text-navy-light transition-colors">
                        {link.title}
                      </CardTitle>
                      <CardDescription className="text-xs leading-relaxed line-clamp-2">
                        {link.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors justify-end gap-1 pt-1 border-t border-border/50">
                      <span>ورود به بخش</span>
                      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </ScrollReveal>
    </div>
  );
}
