import { Check, Copy, Loader2, RefreshCw, ServerOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildInstallerCommand,
  type InstallerAction,
} from "../terminal-launcher.utils";

const actions: Array<{
  value: InstallerAction;
  label: string;
  description: string;
}> = [
  {
    value: "install",
    label: "Install",
    description: "Cài mới launcher và đăng ký protocol cho tài khoản hiện tại.",
  },
  {
    value: "reinstall",
    label: "Reinstall",
    description: "Làm mới các file launcher do ứng dụng đang quản lý.",
  },
  {
    value: "uninstall",
    label: "Uninstall",
    description: "Gỡ launcher và association thuộc ứng dụng khỏi tài khoản.",
  },
];

interface TerminalCommandWorkbenchProps {
  installerUrl: string;
  endpointState: "loading" | "ready" | "error";
  onRetry: () => void;
}

export function TerminalCommandWorkbench({
  installerUrl,
  endpointState,
  onRetry,
}: TerminalCommandWorkbenchProps) {
  const [activeAction, setActiveAction] = useState<InstallerAction>("install");
  const [copiedAction, setCopiedAction] = useState<InstallerAction | null>(
    null,
  );
  const [copyError, setCopyError] = useState(false);

  const handleCopy = async (action: InstallerAction) => {
    const command = buildInstallerCommand(installerUrl, action);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable");
      }

      await navigator.clipboard.writeText(command);
      setCopyError(false);
      setCopiedAction(action);
      toast.success("Command copied to clipboard");
      window.setTimeout(() => setCopiedAction(null), 1400);
    } catch {
      setCopyError(true);
      toast.error(
        "Không thể truy cập clipboard. Hãy chọn command để copy thủ công.",
      );
    }
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#dedfdf] bg-[#fafafa] shadow-[0_20px_50px_rgba(51,45,42,0.09)]">
      <div className="flex flex-col gap-3 border-b border-[#e2e3e3] bg-[#f2f3f3] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#d46a58]" />
            <span className="size-2.5 rounded-full bg-[#d4a558]" />
            <span className="size-2.5 rounded-full bg-[#6fa77d]" />
          </div>
          <span className="font-mono text-xs tracking-[0.18em] text-[#746c68] uppercase">
            ubuntu-host / launcher
          </span>
        </div>

        {endpointState === "loading" ? (
          <span className="inline-flex items-center gap-2 text-xs text-[#6f6966]">
            <Loader2 className="size-3.5 animate-spin" />
            Đang kiểm tra endpoint
          </span>
        ) : endpointState === "ready" ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]" />
            Endpoint sẵn sàng
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            onClick={onRetry}
          >
            <RefreshCw />
            Thử lại endpoint
          </Button>
        )}
      </div>

      <Tabs
        value={activeAction}
        onValueChange={(value) => setActiveAction(value as InstallerAction)}
        className="gap-0"
      >
        <div className="border-b border-[#e2e3e3] bg-[#f7f7f7] px-4 pt-4 sm:px-6">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none bg-transparent p-0">
            {actions.map((action) => (
              <TabsTrigger
                key={action.value}
                value={action.value}
                className="flex-none rounded-t-xl rounded-b-none border-0 px-4 py-2.5 text-[#746c68] data-[state=active]:bg-white data-[state=active]:text-[#3f3733] data-[state=active]:shadow-[0_-1px_0_#dedfdf,1px_0_0_#dedfdf,-1px_0_0_#dedfdf]"
              >
                {action.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {actions.map((action) => {
          const command = buildInstallerCommand(installerUrl, action.value);
          const isCopied = copiedAction === action.value;

          return (
            <TabsContent
              key={action.value}
              value={action.value}
              className="space-y-4 px-4 py-5 sm:px-6 sm:py-6"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#3f3733]">
                    {action.label} launcher
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#756d69]">
                    {action.description}
                  </p>
                </div>
                <span className="mt-2 text-[11px] tracking-wide text-[#938b87] uppercase sm:mt-0">
                  run on Ubuntu host
                </span>
              </div>

              <div className="group relative rounded-2xl border border-[#dfe1e1] bg-[#f3f4f4] p-4 pr-14 shadow-inner sm:p-5 sm:pr-16">
                <pre className="scrollbar-thin overflow-x-auto pb-1 font-mono text-[13px] leading-6 whitespace-pre text-[#493f3a] selection:bg-[#d9b09d] selection:text-[#2f2723]">
                  <code aria-label={`${action.label} command`}>{command}</code>
                </pre>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 border border-[#d7d9d9] bg-white text-[#706864] shadow-sm hover:bg-[#e9ebeb] hover:text-[#3f3733]"
                  aria-label={`Copy ${action.label} command`}
                  onClick={() => void handleCopy(action.value)}
                >
                  {isCopied ? <Check className="text-emerald-600" /> : <Copy />}
                </Button>
              </div>

              {copyError ? (
                <p role="status" className="text-xs text-amber-700">
                  Clipboard không khả dụng. Command vẫn có thể được chọn và copy
                  thủ công.
                </p>
              ) : null}

              {endpointState === "error" ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  <ServerOff className="mt-0.5 size-4 shrink-0" />
                  Endpoint hiện không phản hồi. Không chạy command cho đến khi
                  kiểm tra lại Docker và backend.
                </div>
              ) : null}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
