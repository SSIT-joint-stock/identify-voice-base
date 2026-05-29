import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import {
  type UpdateVoiceDirectoryFormValues,
  updateVoiceDirectoryFormSchema,
} from "../schemas/voice-directory.schema";
import type { VoiceDirectoryDetail } from "../types/voice-directory.types";
import { normalizeCriminalForForm } from "../components/voice-detail/voice-detail.utils";

export function useVoiceDetailForm(detail?: VoiceDirectoryDetail) {
  const form = useForm<UpdateVoiceDirectoryFormValues>({
    resolver: zodResolver(updateVoiceDirectoryFormSchema),
    defaultValues: {
      name: "",
      citizen_identification: "",
      phone_number: "",
      hometown: "",
      job: "",
      passport: "",
      age: "",
      gender: "",
      criminal_record: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "criminal_record",
  });

  useEffect(() => {
    if (!detail) return;

    form.reset({
      name: detail.name ?? "",
      citizen_identification: detail.citizen_identification ?? "",
      phone_number: detail.phone_number ?? "",
      hometown: detail.hometown ?? "",
      job: detail.job ?? "",
      passport: detail.passport ?? "",
      age:
        typeof detail.age === "number" && detail.age > 0
          ? String(detail.age)
          : "",
      gender:
        detail.gender === "MALE" || detail.gender === "FEMALE"
          ? detail.gender
          : "",
      criminal_record: normalizeCriminalForForm(detail.criminal_record),
    });
  }, [detail, form]);

  return {
    form,
    fields,
    append,
    remove,
  };
}
