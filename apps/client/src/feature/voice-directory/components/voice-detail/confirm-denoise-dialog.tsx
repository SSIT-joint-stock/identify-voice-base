import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDenoiseDialogProps {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ConfirmDenoiseDialog({
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: ConfirmDenoiseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Lọc ồn audio đăng ký?</DialogTitle>
          <DialogDescription className="space-y-3 text-sm leading-relaxed">
            <p>
              Lọc ồn có thể loại bỏ một phần âm thanh thô và đặc trưng giọng tự
              nhiên của người nói. Trong một số trường hợp, việc này có thể làm
              kết quả định danh giảm đáng kể.
            </p>

            <p className="font-semibold">
              Chỉ tiếp tục nếu mẫu hiện tại bị nhiễu nhiều và bạn chấp nhận rủi
              ro này.
            </p>

            <div className="rounded-md border bg-muted/20 p-3">
              <p className="mb-1 font-semibold">Lưu ý quan trọng:</p>
              <p>
                Hiện tại hệ thống AI Core{" "}
                <span className="font-semibold">
                  chưa hỗ trợ API cập nhật lại voice embedding
                </span>{" "}
                khi bạn thay đổi mẫu giọng nói.
              </p>
              <p className="mt-2">
                Điều này có nghĩa là nếu bạn cập nhật voice bằng file audio đã
                lọc ồn, dữ liệu giọng nói trong database backend sẽ được cập
                nhật, nhưng{" "}
                <span className="font-semibold">
                  vector embedding đang lưu trong AI Core sẽ không thay đổi
                </span>
                .
              </p>
              <p className="mt-2">
                Sự không đồng bộ này có thể dẫn đến sai lệch trong quá trình
                định danh sau này.
              </p>
            </div>

            <p className="font-semibold text-destructive">
              Vui lòng chỉ tiếp tục khi bạn thực sự chắc chắn muốn sử dụng mẫu
              giọng đã lọc ồn và chấp nhận rủi ro trên.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Xác nhận lọc ồn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
