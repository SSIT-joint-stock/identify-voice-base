import { Clock3, Wrench } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface IsUpdateProps {
  title?: string;
  description?: string;
}

export function IsUpdate({
  title = "Tính năng đang được cập nhật",
  description = "Chức năng này đang trong quá trình hoàn thiện. Vui lòng quay lại ở bản cập nhật tiếp theo.",
}: IsUpdateProps) {
  return (
    <Card className="rounded-2xl border-amber-200 bg-amber-50/60 shadow-sm">
      <CardHeader className="border-b border-amber-100">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Wrench className="size-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-start gap-3 pt-4 text-sm text-amber-900">
        <Clock3 className="mt-0.5 size-4 shrink-0" />
        <p>{description}</p>
      </CardContent>
    </Card>
  );
}
