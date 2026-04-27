import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { VoiceDirectoryListItem } from "@/feature/voice-directory/types/voice-directory.types";

export function InfoTooltip({
  children,
  value,
}: {
  children: ReactNode;
  value: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

export function GenderPill({
  gender,
}: {
  gender?: VoiceDirectoryListItem["gender"];
}) {
  if (gender === "MALE") {
    return (
      <InfoTooltip value="Nam">
        <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
          Nam
        </span>
      </InfoTooltip>
    );
  }

  if (gender === "FEMALE") {
    return (
      <InfoTooltip value="Nữ">
        <span className="inline-flex items-center rounded-md bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-700">
          Nữ
        </span>
      </InfoTooltip>
    );
  }

  return <span className="text-xs text-slate-400">-</span>;
}

export function AgePill({ age }: { age?: number | null }) {
  if (typeof age !== "number" || !Number.isFinite(age) || age <= 0) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  return (
    <InfoTooltip value={String(age)}>
      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        {age}
      </span>
    </InfoTooltip>
  );
}

export function PassportPill({ value }: { value?: string | null }) {
  if (!value) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  return (
    <InfoTooltip value={value}>
      <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
        <svg
          viewBox="0 0 24 24"
          className="size-3 shrink-0 text-indigo-500"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <circle cx="12" cy="10" r="3" />
          <path d="M9 10h6" />
          <path d="M12 7c1 1.7 1 4.3 0 6" />
          <path d="M8 17h8" />
        </svg>
        <span className="truncate">{value}</span>
      </span>
    </InfoTooltip>
  );
}
