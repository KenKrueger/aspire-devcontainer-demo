import { RouterProvider as AriaRouterProvider } from "react-aria-components";
import {
  Outlet,
  createRootRoute,
  useRouter,
  type NavigateOptions,
  type ToOptions,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

declare module "react-aria-components" {
  interface RouterConfig {
    href: string | ToOptions;
    routerOptions: Omit<NavigateOptions, keyof ToOptions>;
  }
}

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const router = useRouter();

  return (
    <AriaRouterProvider
      navigate={(href, opts) => {
        if (href == null) {
          return;
        }

        if (typeof href === "string") {
          if (!href) {
            return;
          }

          router.navigate({ to: href, ...(opts ?? {}) } as unknown as NavigateOptions);
          return;
        }

        router.navigate({ ...href, ...(opts ?? {}) } as unknown as NavigateOptions);
      }}
      useHref={(href) => {
        if (href == null) {
          return "";
        }

        if (typeof href === "string") {
          if (!href) {
            return "";
          }

          return router.buildLocation({ to: href } as unknown as ToOptions).href;
        }

        return router.buildLocation(href as unknown as ToOptions).href;
      }}
    >
      <Outlet />
      {import.meta.env.DEV ? (
        <TanStackRouterDevtools position="bottom-right" />
      ) : null}
    </AriaRouterProvider>
  );
}
