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
        path: "note/*",
        lazy: async () => {
          const { default: NotePage } = await import("./pages/NotePage");
          return { Component: NotePage };
        },
      },
      {
        path: "tag/:tag",
        lazy: async () => {
          const { default: TagPage } = await import("./pages/TagPage");
          return { Component: TagPage };
        },
      },
      {
        path: "*",
        lazy: async () => {
          const { default: CategoryPage } = await import("./pages/CategoryPage");
          return { Component: CategoryPage };
        },
      },
    ],
  },
];
