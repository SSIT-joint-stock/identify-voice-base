import { useCallback, useEffect, useRef, useState } from "react";

import { useScrollOffset } from "@/hooks/use-scroll-offset";

interface UseTranslationAutoScrollOptions {
  enabled: boolean;
  text: string;
  offsetY?: number;
}

function isTextareaAtBottom(textarea: HTMLTextAreaElement) {
  return (
    textarea.scrollHeight - textarea.scrollTop - textarea.clientHeight < 32
  );
}

export function useTranslationAutoScroll({
  enabled,
  text,
  offsetY = 96,
}: UseTranslationAutoScrollOptions) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isPausedRef = useRef(false);
  const [isJumpVisible, setIsJumpVisible] = useState(false);
  const { targetRef, scrollToOffset } = useScrollOffset<HTMLDivElement>({
    enabled: false,
    offsetY,
  });

  const updateJumpVisibility = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    setIsJumpVisible(isPausedRef.current && !isTextareaAtBottom(textarea));
  }, []);

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      scrollToOffset();

      window.requestAnimationFrame(() => {
        textarea.scrollTo({
          top: textarea.scrollHeight,
          behavior,
        });
        setIsJumpVisible(false);
      });
    },
    [scrollToOffset],
  );

  const pauseAutoScroll = useCallback(() => {
    if (!enabled) return;

    isPausedRef.current = true;
    updateJumpVisibility();
  }, [enabled, updateJumpVisibility]);

  const resumeAutoScroll = useCallback(() => {
    isPausedRef.current = false;
    scrollToLatest();
  }, [scrollToLatest]);

  const handleTextareaScroll = useCallback(() => {
    if (!enabled) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    if (isTextareaAtBottom(textarea)) {
      isPausedRef.current = false;
      setIsJumpVisible(false);
      return;
    }

    isPausedRef.current = true;
    setIsJumpVisible(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !text) {
      isPausedRef.current = false;
      return;
    }

    let frameId: number;

    if (isPausedRef.current) {
      frameId = window.requestAnimationFrame(updateJumpVisibility);
    } else {
      frameId = window.requestAnimationFrame(() => scrollToLatest());
    }

    return () => window.cancelAnimationFrame(frameId);
  }, [enabled, scrollToLatest, text, updateJumpVisibility]);

  return {
    containerRef: targetRef,
    textareaRef,
    isJumpVisible: enabled && isJumpVisible,
    pauseAutoScroll,
    resumeAutoScroll,
    handleTextareaScroll,
  };
}

export type TranslationAutoScrollControls = ReturnType<
  typeof useTranslationAutoScroll
>;
