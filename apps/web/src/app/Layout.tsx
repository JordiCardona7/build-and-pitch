import { useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { BRAND } from "@/shared/brand";

export function Layout() {
  useEffect(() => {
    document.title = BRAND.name;
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Link
            to="/"
            className="font-display text-lg font-extrabold tracking-tight text-ink hover:text-marker-blue"
          >
            {BRAND.name}
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
