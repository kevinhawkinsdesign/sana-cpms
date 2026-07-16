'use client'

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SharedModal } from "@/components/shared/SharedModal";
import { Input, Select, FormButton } from "@/components/shared/SharedComponents";
import { Loader2 } from "lucide-react";

const schema = z.object({
  model: z.string().min(1, "Model name is required"),
  manufacturerId: z.string().uuid("Please select a manufacturer"),
});

type FormData = z.infer<typeof schema>;

interface ModelReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  title: string;
  initialValue?: { model: string; manufacturerId: string };
  manufacturers: Array<{ id: string; manufacturer: string }>;
}

export const ModelReferenceModal: React.FC<ModelReferenceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialValue,
  manufacturers,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValue,
  });

  return (
    <SharedModal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Manufacturer"
          name="manufacturerId"
          register={register}
          error={errors.manufacturerId}
          required
          options={manufacturers.map((m) => ({
            value: m.id,
            label: m.manufacturer,
          }))}
        />

        <Input
          label="Model Name"
          name="model"
          register={register}
          error={errors.model}
          required
        />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
          >
            Cancel
          </button>
          <FormButton
            type="submit"
            label={isSubmitting ? "Saving..." : "Save"}
            disabled={isSubmitting}
            icon={isSubmitting ? Loader2 : undefined}
            rotateIcon={isSubmitting}
          />
        </div>
      </form>
    </SharedModal>
  );
};