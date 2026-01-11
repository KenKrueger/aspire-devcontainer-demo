"use client";
import { SearchIcon, XIcon } from "lucide-react";
import {
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
  type ValidationResult,
} from "react-aria-components";
import { Description, FieldError, FieldGroup, Input, Label } from "@/components/ui/Field";
import { composeTailwindRenderProps } from "@/lib/react-aria-utils";
import { FieldButton } from "@/components/ui/FieldButton";

export interface SearchFieldProps extends AriaSearchFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
}

export function SearchField({
  label,
  description,
  errorMessage,
  placeholder,
  ...props
}: SearchFieldProps) {
  return (
    <AriaSearchField
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "group flex flex-col gap-2 min-w-[40px] font-body max-w-full",
      )}
    >
      {label && <Label>{label}</Label>}
      <FieldGroup>
        <SearchIcon
          aria-hidden
          className="w-4 h-4 ml-2 text-muted forced-colors:text-[ButtonText] group-disabled:text-muted forced-colors:group-disabled:text-[GrayText]"
        />
        <Input
          placeholder={placeholder}
          className="pl-2 [&::-webkit-search-cancel-button]:hidden"
        />
        <FieldButton slot="clear" className="mr-1 w-6 group-empty:hidden">
          <XIcon aria-hidden className="w-4 h-4" />
        </FieldButton>
      </FieldGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </AriaSearchField>
  );
}
