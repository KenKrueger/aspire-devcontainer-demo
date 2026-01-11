"use client";

import * as React from "react";
import {
  Link as AriaLink,
  type LinkProps as AriaLinkProps,
  composeRenderProps,
} from "react-aria-components";
import { createLink, type LinkComponent } from "@tanstack/react-router";
import { tv } from "tailwind-variants";
import { focusRing } from "@/lib/react-aria-utils";

interface StyledLinkProps extends AriaLinkProps {
  variant?: "primary" | "secondary";
}

const styles = tv({
  extend: focusRing,
  base: "underline disabled:no-underline disabled:cursor-default forced-colors:disabled:text-[GrayText] transition rounded-xs [-webkit-tap-highlight-color:transparent]",
  variants: {
    variant: {
      primary:
        "text-blue-600 dark:text-blue-500 underline decoration-blue-600/60 hover:decoration-blue-600 dark:decoration-blue-500/60 dark:hover:decoration-blue-500",
      secondary:
        "text-neutral-700 dark:text-neutral-300 underline decoration-neutral-700/50 hover:decoration-neutral-700 dark:decoration-neutral-300/70 dark:hover:decoration-neutral-300",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

const StyledLinkComponent = React.forwardRef<HTMLAnchorElement, StyledLinkProps>((props, ref) => {
  return (
    <AriaLink
      {...props}
      ref={ref}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({ ...renderProps, className, variant: props.variant }),
      )}
    />
  );
});

StyledLinkComponent.displayName = "StyledLinkComponent";

const CreatedLinkComponent = createLink(StyledLinkComponent);

export const RouterLink: LinkComponent<typeof StyledLinkComponent> = (props) => {
  return <CreatedLinkComponent preload="intent" {...props} />;
};
