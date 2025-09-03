import { z } from "zod";

// Common validation schemas
export const pollTitleSchema = z
  .string()
  .min(1, "Poll title is required")
  .min(5, "Poll title must be at least 5 characters long")
  .max(500, "Poll title must be 500 characters or less")
  .trim();

export const pollDescriptionSchema = z
  .string()
  .max(2000, "Description must be 2000 characters or less")
  .optional()
  .nullable();

export const pollOptionSchema = z
  .string()
  .min(1, "Option text must be at least 1 character long")
  .max(1000, "Option text must be 1000 characters or less")
  .trim();

export const pollOptionsArraySchema = z
  .array(pollOptionSchema)
  .min(2, "At least 2 poll options are required")
  .max(10, "Maximum 10 poll options allowed")
  .refine(
    (options: string[]) => {
      const trimmedOptions = options.map((opt: string) =>
        opt.toLowerCase().trim(),
      );
      return new Set(trimmedOptions).size === trimmedOptions.length;
    },
    {
      message: "Poll options must be unique",
    },
  );

export const pollExpirationSchema = z.preprocess((arg: any) => {
  if (typeof arg === "string" && arg !== "") return new Date(arg);
  if (arg instanceof Date) return arg;
  return null;
}, z.date().min(new Date(), "Expiration date must be in the future").optional().nullable());

// Complete poll creation schema
export const createPollSchema = z.object({
  title: pollTitleSchema,
  description: pollDescriptionSchema,
  options: pollOptionsArraySchema,
  is_public: z.boolean().default(true),
  allow_multiple_votes: z.boolean().default(false),
  allow_anonymous_votes: z.boolean().default(true),
  expires_at: pollExpirationSchema,
});

// Validation utility functions
export function validatePollTitle(title: string): {
  isValid: boolean;
  error?: string;
} {
  const result = pollTitleSchema.safeParse(title);
  return {
    isValid: result.success,
    error: result.success ? undefined : result.error.errors[0].message,
  };
}

export function validatePollDescription(description: string): {
  isValid: boolean;
  error?: string;
} {
  const result = pollDescriptionSchema.safeParse(description);
  return {
    isValid: result.success,
    error: result.success ? undefined : result.error.errors[0].message,
  };
}

export function validatePollOptions(options: string[]): {
  isValid: boolean;
  error?: string;
} {
  const filteredOptions = options.filter((opt) => opt.trim() !== "");
  const result = pollOptionsArraySchema.safeParse(filteredOptions);
  return {
    isValid: result.success,
    error: result.success ? undefined : result.error.errors[0].message,
  };
}

export function validatePollExpiration(expiresAt: Date | null): {
  isValid: boolean;
  error?: string;
} {
  const result = pollExpirationSchema.safeParse(expiresAt);
  return {
    isValid: result.success,
    error: result.success ? undefined : result.error.errors[0].message,
  };
}

// Helper function to clean and prepare options
export function cleanPollOptions(options: string[]): string[] {
  return options
    .map((option) => option.trim())
    .filter((option) => option !== "");
}

// Complete form validation function
export function validateCreatePollForm(formData: any): {
  isValid: boolean;
  errors: Record<string, string>;
  cleanedData?: any;
} {
  const errors: Record<string, string> = {};

  // Clean options first
  const cleanedOptions = cleanPollOptions(formData.options || []);
  const cleanedData = {
    ...formData,
    options: cleanedOptions,
  };

  const result = createPollSchema.safeParse(cleanedData);

  if (result.success) {
    return {
      isValid: true,
      errors: {},
      cleanedData: result.data,
    };
  }

  // Map validation errors to field names
  result.error.errors.forEach((error: any) => {
    const fieldName = error.path.join(".");
    errors[fieldName] = error.message;
  });

  return {
    isValid: false,
    errors,
  };
}
