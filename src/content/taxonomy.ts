import type { TaxonomyNode } from "../lib/types";

export const taxonomy: Record<string, TaxonomyNode> = {
  frontend: {
    label: "前端",
    color: "#3b82f6",
    icon: "Globe",
    children: {
      javascript: {
        label: "JavaScript",
        children: {
          "event-loop": {
            label: "事件循环",
          },
        },
      },
    },
  },
};
