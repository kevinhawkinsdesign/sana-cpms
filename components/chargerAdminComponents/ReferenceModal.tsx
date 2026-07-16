'use client'

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SharedModal } from "@/components/shared/SharedModal";
import { Input, FormButton } from "@/components/shared/SharedComponents";
import { Loader2 } from "lucide-react";

const schema = z.object({
  value: z.string().min(1, "This field is required"),
});

type FormData = z.infer<typeof schema>;

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void>;
  title: string;
  initialValue?: string;
  fieldName: string;
}

const ReferenceModal: React.FC<ReferenceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialValue = "",
  fieldName,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      value: initialValue,
    },
  });

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data.value);
    onClose();
  };

  return (
    <SharedModal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          label={fieldName}
          name="value"
          register={register}
          error={errors.value}
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

export default ReferenceModal;