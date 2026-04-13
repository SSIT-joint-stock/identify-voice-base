import { RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface PageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  onRefresh?: () => void | Promise<void>;
  showRefreshButton?: boolean;
}

export function PageLayout({
  title,
  description,
  children,
  onRefresh,
  showRefreshButton = true,
}: PageLayoutProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-primary-400 md:text-3xl">
            {title}
          </h1>
          {showRefreshButton ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={!onRefresh || isRefreshing}
            >
              <RefreshCw
                className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      {children}
    </div>
  );
}
