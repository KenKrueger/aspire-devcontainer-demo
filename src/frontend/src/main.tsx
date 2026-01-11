import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import "./index.css";
import { ThemeProvider } from "./lib/theme";
import { queryClient } from "./db/query-client";
import { router } from "./router";
import { MyToastRegion } from "./components/ui/Toast";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
        <MyToastRegion />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
