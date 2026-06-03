import { Loader2, Plus, Trash2 } from "lucide-react";
import type {
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormReturn,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { UpdateVoiceDirectoryFormValues } from "../../schemas/voice-directory.schema";

interface VoiceProfileFormProps {
  form: UseFormReturn<UpdateVoiceDirectoryFormValues>;
  fields: Array<
    FieldArrayWithId<UpdateVoiceDirectoryFormValues, "criminal_record", "id">
  >;
  isSaving: boolean;
  canModify: boolean;
  onSubmit: () => void;
  append: UseFieldArrayAppend<
    UpdateVoiceDirectoryFormValues,
    "criminal_record"
  >;
  remove: UseFieldArrayRemove;
}

export function VoiceProfileForm({
  form,
  fields,
  isSaving,
  canModify,
  onSubmit,
  append,
  remove,
}: VoiceProfileFormProps) {
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <h3 className="text-sm font-semibold">Thông tin cá nhân</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vd-name">Họ và tên</Label>
          <Input
            id="vd-name"
            placeholder="Nhập họ tên"
            disabled={!canModify}
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vd-cccd">CCCD</Label>
          <Input
            id="vd-cccd"
            placeholder="Nhập CCCD"
            disabled={!canModify}
            {...form.register("citizen_identification")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vd-phone">Số điện thoại</Label>
          <Input
            id="vd-phone"
            inputMode="tel"
            placeholder="Nhập số điện thoại"
            disabled={!canModify}
            {...form.register("phone_number")}
          />
          {form.formState.errors.phone_number ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.phone_number.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vd-gender">Giới tính</Label>
          <select
            id="vd-gender"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canModify}
            {...form.register("gender")}
          >
            <option value="">Chọn giới tính</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vd-age">Độ tuổi</Label>
          <Input
            id="vd-age"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Nhập tuổi"
            disabled={!canModify}
            {...form.register("age", {
              onChange: (event) => {
                event.target.value = event.target.value.replace(/\D/g, "");
              },
            })}
          />
          {form.formState.errors.age ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.age.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vd-hometown">Quê quán</Label>
          <Input
            id="vd-hometown"
            placeholder="Nhập quê quán"
            disabled={!canModify}
            {...form.register("hometown")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vd-job">Nghề nghiệp</Label>
          <Input
            id="vd-job"
            placeholder="Nhập nghề nghiệp"
            disabled={!canModify}
            {...form.register("job")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vd-passport">Hộ chiếu</Label>
          <Input
            id="vd-passport"
            placeholder="Nhập số hộ chiếu"
            disabled={!canModify}
            {...form.register("passport")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tiền án / tiền sự</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canModify}
            onClick={() => append({ case: "", year: "" })}
          >
            <Plus className="mr-1 size-4" />
            Thêm dòng
          </Button>
        </div>
        <div className="space-y-2">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có bản ghi.</p>
          ) : null}
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-end gap-4">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Vụ việc</Label>
                <Input
                  placeholder="Ví dụ: Tội trộm cắp"
                  disabled={!canModify}
                  {...form.register(`criminal_record.${index}.case`)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Năm</Label>
                <Input
                  placeholder="Nhập năm"
                  disabled={!canModify}
                  {...form.register(`criminal_record.${index}.year`)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-destructive transition-colors duration-300 hover:cursor-pointer hover:bg-red-50 hover:text-red-500"
                disabled={!canModify}
                onClick={() => remove(index)}
                aria-label="Xóa dòng"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        type="submit"
        disabled={isSaving || !canModify}
        className="w-full px-6 sm:w-auto"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Đang lưu…
          </>
        ) : (
          "Lưu thông tin"
        )}
      </Button>
    </form>
  );
}
