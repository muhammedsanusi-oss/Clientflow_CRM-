import { currentUserId } from "@project/auth";
import {
  getUser,
  listDeveloperNotifications,
  listExternalMonitorStates,
} from "@project/domain";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { MarkNotificationRead } from "./read-controls";

export const dynamic = "force-dynamic";

const notificationLabels: Record<string, string> = {
  WEBSITE_INQUIRY: "Website inquiry",
  OWNER_FEATURE_REQUEST: "Owner change request",
  CUSTOM_CRM_REQUEST: "Custom CRM lead",
  MANAGED_SERVICE_REQUEST: "Managed content change",
  SERVICE_DOWN: "Service outage",
  SERVICE_RECOVERED: "Service recovery",
};

export default async function NotificationsPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const user = await getUser(userId);
  if (!user?.isDeveloper) notFound();
  const [notifications, monitors] = await Promise.all([
    listDeveloperNotifications(userId),
    listExternalMonitorStates(userId),
  ]);
  const unreadCount = notifications.filter(notification => notification.readAt === null).length;

  return <main className="mx-auto max-w-4xl space-y-8 px-5 py-10">
    <Link href="/" className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Back to developer dashboard</Link>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-indigo-700">Developer workspace</p>
        <h1 className="mt-1 text-3xl font-semibold">Notifications</h1>
        <p className="mt-2 text-sm text-slate-600">{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}</p>
      </div>
      {unreadCount > 0 && <MarkNotificationRead />}
    </header>

    <section aria-labelledby="monitor-status-heading" className="space-y-3">
      <h2 id="monitor-status-heading" className="text-lg font-semibold">External monitor status</h2>
      {monitors.length ? <ul className="grid gap-3 sm:grid-cols-2">{monitors.map(monitor =>
        <li key={monitor.monitorId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
          <span className="font-medium">{monitor.monitorId}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${monitor.status === "UP" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
            {monitor.status}
          </span>
        </li>)}</ul> : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No external monitor has reported yet.</p>}
    </section>

    <section aria-labelledby="notification-list-heading" className="space-y-3">
      <h2 id="notification-list-heading" className="text-lg font-semibold">Recent activity</h2>
      {notifications.length ? <ul className="space-y-3">{notifications.map(notification =>
        <li key={notification.id} className={`rounded-xl border p-4 ${notification.readAt ? "border-slate-200 bg-white" : "border-indigo-200 bg-indigo-50/60"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{notificationLabels[notification.type] ?? "Notification"}</p>
              <h3 className="mt-1 font-semibold">{notification.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{notification.message}</p>
              <time dateTime={notification.createdAt.toISOString()} className="mt-2 block text-xs text-slate-500">{notification.createdAt.toLocaleString()}</time>
              {notification.href !== "/notifications" && <Link href={notification.href} className="mt-3 inline-block text-sm font-semibold text-indigo-700 underline">Review request</Link>}
            </div>
            {!notification.readAt && <MarkNotificationRead notificationId={notification.id} />}
          </div>
        </li>)}</ul> : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">You’re all caught up. New business, prospect, and monitor events will appear here.</p>}
    </section>
  </main>;
}
