import { forwardRef, type ComponentProps } from "react";
import { Link, useLocation } from "@/lib/router-compat";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<ComponentProps<typeof Link>, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  end?: boolean;
}

// Rewritten during the TanStack migration: react-router's function-form
// className({ isActive }) has no shim equivalent, so active state is derived
// from the current pathname instead.
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName: _pendingClassName, end, to, ...props }, ref) => {
    const { pathname } = useLocation();
    const target = typeof to === "string" ? ((to.split("?")[0] ?? "").split("#")[0] ?? "") : "";
    const normalized = target.length > 1 && target.endsWith("/") ? target.slice(0, -1) : target;
    const isActive = end
      ? pathname === normalized
      : pathname === normalized || (normalized !== "/" && pathname.startsWith(`${normalized}/`));
    return (
      <Link ref={ref} to={to} className={cn(className, isActive && activeClassName)} {...props} />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
