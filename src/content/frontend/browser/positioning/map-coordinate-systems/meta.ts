import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "为什么 GPS 坐标丢到高德地图会偏几百米？",
  description:
    "WGS-84/GCJ-02/BD-09 三系分工：加偏发生在地图层而非系统层。各定位通道输出速查、谷歌地图图层歧义、「统一而非还原」的转换方向原则。",
  difficulty: "进阶",
  type: "question",
  tags: ["定位", "坐标系", "GCJ-02", "地图", "移动端"],
  updated: "2026-09-23",
} satisfies NoteMeta;
