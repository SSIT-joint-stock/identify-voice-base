import { LoaderCircle, SquareTerminal, Wrench } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";
import {
  TERMINAL_OPEN_COOLDOWN_MS,
  TERMINAL_PROTOCOL_URI,
} from "../terminal-launcher.utils";

interface OpenTerminalEntryPointProps {
  collapsed?: boolean;
}

export function OpenTerminalEntryPoint({
  collapsed = false,
}: OpenTerminalEntryPointProps) {
  const location = useLocation();
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const cooldownTimer = useRef<number | null>(null);
  const isSetupActive = location.pathname === ROUTES.TERMINAL_SETUP;

  useEffect(
    () => () => {
      if (cooldownTimer.current !== null) {
        window.clearTimeout(cooldownTimer.current);
      }
    },
    [],
  );

  const handleOpenTerminal = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isCoolingDown) {
      event.preventDefault();
      return;
    }

    setIsCoolingDown(true);
    toast.info(
      "Đã gửi yêu cầu mở Terminal. Vui lòng xác nhận trong browser nếu được hỏi.",
    );

    cooldownTimer.current = window.setTimeout(() => {
      setIsCoolingDown(false);
      cooldownTimer.current = null;
    }, TERMINAL_OPEN_COOLDOWN_MS);
  };

  const rowClassName =
    "flex h-11 w-full items-center rounded-md text-sm font-medium text-gray-800 transition-all hover:bg-primary-50 hover:text-primary-600 focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none";

  return (
    <div className={cn("mt-2", collapsed ? "px-2" : "px-3")}>
      {!collapsed ? (
        <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          Terminal Ubuntu
        </p>
      ) : null}

      <div className="space-y-1">
        <a
          href={TERMINAL_PROTOCOL_URI}
          aria-label="Open Terminal"
          aria-disabled={isCoolingDown || undefined}
          title="Mở Terminal"
          onClick={handleOpenTerminal}
          className={cn(
            rowClassName,
            collapsed ? "justify-center px-0" : "gap-3 px-3",
            isCoolingDown && "pointer-events-none opacity-60",
          )}
        >
          {isCoolingDown ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin" />
          ) : (
            <SquareTerminal className="size-4 shrink-0" />
          )}
          {!collapsed ? <span className="text-nowrap">Mở Terminal</span> : null}
        </a>

        <Link
          to={ROUTES.TERMINAL_SETUP}
          aria-label="Terminal không mở? Xem hướng dẫn"
          title="Cài đặt Terminal"
          className={cn(
            rowClassName,
            collapsed ? "justify-center px-0" : "gap-3 px-3",
            isSetupActive && "bg-primary-50 text-primary-600",
          )}
        >
          <Wrench className="size-4 shrink-0" />
          {!collapsed ? (
            <span className="text-nowrap">Cài đặt Terminal</span>
          ) : null}
        </Link>
      </div>
    </div>
  );
}
