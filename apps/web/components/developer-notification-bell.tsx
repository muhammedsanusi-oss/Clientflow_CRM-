import Link from "next/link";
import { getUnreadDeveloperNotificationCount } from "@project/domain";

export async function DeveloperNotificationBell({ developerId }: { developerId: string }) {
  const unreadCount = await getUnreadDeveloperNotificationCount(developerId);
  return <Link
    href="/notifications"
    aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
    className="relative flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-slate-600 transition hover:bg-slate-50"
  >
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="text-sm font-medium">Notifications</span>
    {unreadCount > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-bold leading-5 text-white">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>}
  </Link>;
}
