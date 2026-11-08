import Link from "next/link";
import { logout } from "./actions";

export function AdminNav({ current }: { current: "order" | "booking" }) {
  const link = (key: typeof current, href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm ${
        current === key ? "bg-foreground font-semibold text-background" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex gap-1 rounded-full border border-line p-1">
        {link("order", "/admin", "Order baju")}
        {link("booking", "/admin/booking", "Booking")}
      </div>
      <form action={logout}>
        <button className="text-sm text-muted hover:text-foreground">Log keluar</button>
      </form>
    </div>
  );
}
