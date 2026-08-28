import type { RouteObject } from "react-router-dom";
import App from "./App";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { default: HomePage } = await import("./pages/HomePage");
          return { Component: HomePage };
        },
      },
      {
        path: "*",
        lazy: async () => {
          const { default: NotePage } = await import("./pages/NotePage");
          return { Component: NotePage };
        },
      },
    ],
  },
];
