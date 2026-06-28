import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { RequireAuth } from "@/components/require-auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <MobileSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
        <NotificationPanel />
      </div>
    </RequireAuth>
  );
}
