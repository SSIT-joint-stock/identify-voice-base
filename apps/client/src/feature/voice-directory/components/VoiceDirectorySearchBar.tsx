import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  Hash,
  IdCard,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";
import type { VoiceDirectorySearchField } from "../types/voice-directory.types";

type SearchFieldOption = {
  id: VoiceDirectorySearchField;
  label: string;
  description: string;
  aliases: string[];
  icon: typeof Search;
  numericShortcut?: boolean;
  inputMode?: "text" | "numeric";
  placeholder: string;
};

const SEARCH_FIELD_OPTIONS: SearchFieldOption[] = [
  {
    id: "name",
    label: "Họ và tên",
    description: "Tra cứu theo tên người đã định danh.",
    aliases: ["ten", "ho va ten", "nguoi dung"],
    icon: UserRound,
    placeholder: "Nhập họ và tên cần tìm...",
  },
  {
    id: "hometown",
    label: "Quê quán",
    description: "Tìm theo quê quán hoặc nơi xuất thân.",
    aliases: ["que quan", "que", "noi sinh"],
    icon: MapPin,
    placeholder: "Nhập quê quán cần tìm...",
  },
  {
    id: "phone_number",
    label: "Số điện thoại",
    description: "Tra cứu theo số điện thoại liên hệ.",
    aliases: ["sdt", "so dien thoai", "dien thoai", "phone"],
    icon: Phone,
    numericShortcut: true,
    inputMode: "numeric",
    placeholder: "Nhập số điện thoại cần tìm...",
  },
  {
    id: "citizen_identification",
    label: "CCCD",
    description: "Tìm theo số căn cước hoặc giấy tờ định danh.",
    aliases: ["cccd", "can cuoc", "cmnd", "dinh danh"],
    icon: IdCard,
    numericShortcut: true,
    inputMode: "numeric",
    placeholder: "Nhập số CCCD cần tìm...",
  },
  {
    id: "criminal_record",
    label: "Tiền án tiền sự",
    description: "Tra cứu theo vụ việc hoặc năm trong hồ sơ án tích.",
    aliases: ["tien an tien su", "tien an", "tien su", "an tich"],
    icon: ShieldAlert,
    placeholder: "Nhập vụ việc hoặc năm cần tìm...",
  },
  {
    id: "passport",
    label: "Hộ chiếu",
    description: "Tìm theo số hộ chiếu đã lưu trên hồ sơ.",
    aliases: ["ho chieu", "passport"],
    icon: FileText,
    numericShortcut: true,
    placeholder: "Nhập số hộ chiếu cần tìm...",
  },
  {
    id: "age",
    label: "Độ tuổi",
    description: "Tra cứu theo độ tuổi được lưu trong hồ sơ.",
    aliases: ["do tuoi", "tuoi", "age"],
    icon: Hash,
    inputMode: "numeric",
    placeholder: "Nhập độ tuổi cần tìm...",
  },
  {
    id: "gender",
    label: "Giới tính",
    description: "Tra cứu theo giới tính đã lưu trong hồ sơ.",
    aliases: ["gioi tinh", "nam", "nu", "male", "female"],
    icon: UserRound,
    placeholder: "Nhập Nam hoặc Nữ...",
  },
];

function normalizeKeyword(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
}

function isNumericSearch(value: string) {
  return /^\d+$/.test(value.trim());
}

function getVisibleOptions(
  value: string,
  selectedField: VoiceDirectorySearchField | null,
) {
  if (selectedField) {
    const selectedOption = SEARCH_FIELD_OPTIONS.find(
      (option) => option.id === selectedField,
    );

    return SEARCH_FIELD_OPTIONS.slice().sort((left, right) => {
      if (left.id === selectedOption?.id) return -1;
      if (right.id === selectedOption?.id) return 1;
      return left.label.localeCompare(right.label, "vi");
    });
  }

  const keyword = normalizeKeyword(value);

  if (!keyword) {
    return SEARCH_FIELD_OPTIONS;
  }

  if (isNumericSearch(value)) {
    return SEARCH_FIELD_OPTIONS.filter((option) => option.numericShortcut);
  }

  return SEARCH_FIELD_OPTIONS.filter((option) => {
    const haystacks = [option.label, option.description, ...option.aliases];
    return haystacks.some((item) => normalizeKeyword(item).includes(keyword));
  });
}

export interface VoiceDirectorySearchBarProps {
  value: string;
  selectedField: VoiceDirectorySearchField | null;
  isFetching?: boolean;
  onValueChange: (value: string) => void;
  onSelectedFieldChange: (field: VoiceDirectorySearchField | null) => void;
}

export function VoiceDirectorySearchBar({
  value,
  selectedField,
  isFetching = false,
  onValueChange,
  onSelectedFieldChange,
}: VoiceDirectorySearchBarProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedOption =
    SEARCH_FIELD_OPTIONS.find((option) => option.id === selectedField) ?? null;
  const SelectedOptionIcon = selectedOption?.icon;
  const visibleOptions = getVisibleOptions(value, selectedField);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const handleSelectField = (field: VoiceDirectorySearchField) => {
    onSelectedFieldChange(field);
    onValueChange("");
    setOpen(false);
    setActiveIndex(-1);

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleClearField = () => {
    onSelectedFieldChange(null);
    setOpen(true);
    setActiveIndex(-1);

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!open || visibleOptions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => {
        if (current >= visibleOptions.length - 1) {
          return 0;
        }
        return current + 1;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => {
        if (current <= 0) {
          return visibleOptions.length - 1;
        }
        return current - 1;
      });
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const activeOption = visibleOptions[activeIndex];
      if (activeOption) {
        handleSelectField(activeOption.id);
      }
    }

    if (
      event.key === "Backspace" &&
      selectedField &&
      value.trim().length === 0
    ) {
      event.preventDefault();
      handleClearField();
    }
  };

  const inputPlaceholder =
    selectedOption?.placeholder ?? "Tìm theo tên, quê quán, CCCD, SĐT...";

  return (
    <div
      ref={wrapperRef}
      className="relative flex flex-1 flex-col rounded-md border border-input bg-white text-sm shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
    >
      <div className="flex h-9 min-w-0 items-center gap-1.5 pr-2 pl-2.5">
        <Search className="size-4 shrink-0 text-muted-foreground" />

        {selectedOption && SelectedOptionIcon ? (
          <button
            type="button"
            onClick={handleClearField}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2 py-0.5 text-xs font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
            aria-label={`Bỏ chọn trường ${selectedOption.label}`}
          >
            <SelectedOptionIcon className="size-3.5 text-muted-foreground" />
            <span>{selectedOption.label}</span>
            <X className="size-3 text-muted-foreground" />
          </button>
        ) : null}

        <input
          ref={inputRef}
          value={value}
          inputMode={selectedOption?.inputMode}
          onFocus={() => {
            if (!selectedField) {
              setOpen(true);
            }
            setActiveIndex(-1);
          }}
          onChange={(event) => {
            onValueChange(event.target.value);
            if (!selectedField) {
              setOpen(true);
            }
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          className="h-full w-full min-w-0 border-none bg-transparent p-0 text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground"
          aria-label="Tìm kiếm danh bạ"
          aria-expanded={open}
          aria-autocomplete="list"
        />

        <button
          type="button"
          onClick={() => {
            setOpen((current) => !current);
            setActiveIndex(-1);
          }}
          className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground transition"
          aria-label="Mở danh sách trường tìm kiếm"
        >
          <ChevronsUpDown className="size-4" />
        </button>

        {isFetching ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-slate-400" />
        ) : null}
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
          <div className="max-h-80 overflow-y-auto">
            {visibleOptions.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-400">
                Không có trường tìm kiếm phù hợp.
              </div>
            ) : (
              visibleOptions.map((option, index) => {
                const Icon = option.icon;
                const isActive = index === activeIndex;
                const isSelected = option.id === selectedOption?.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelectField(option.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition",
                      isActive || isSelected
                        ? "bg-primary-50"
                        : "hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600",
                        (isActive || isSelected) &&
                          "border-primary-200 bg-primary-100 text-primary-700",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        {option.label}
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                            <Check className="size-3" />
                            Đang chọn
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {option.description}
                      </span>
                    </span>

                    <ChevronRight
                      className={cn(
                        "mt-1 size-4 shrink-0 text-slate-400 transition",
                        (isActive || isSelected) && "text-primary-600",
                      )}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
