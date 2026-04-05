import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingProps {
  size?: LoadingSize;
  fullPage?: boolean;
  className?: string;
  text?: string;
}

const sizeClasses: Record<LoadingSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

/**
 * Reusable Loading/Spinner component.
 * Can be used as a standalone spinner or a full-page overlay.
 */
export function Loading({ size = 'md', fullPage = false, className, text }: LoadingProps) {
  const content = (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={clsx('animate-spin text-primary', sizeClasses[size])} />
      {text && <p className="text-sm font-medium text-muted-foreground">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}
