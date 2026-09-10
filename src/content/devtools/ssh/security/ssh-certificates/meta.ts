import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "SSH 证书和普通密钥差在哪？",
  description:
    "SSH 证书机制全解：TrustedUserCAKeys 签发制如何替掉 authorized_keys 名单、principal 限定的是账号不是机器、短有效期代替撤销（SSH 为什么没有 CRL）、host 证书消灭 TOFU 首连提示，以及过期锁死与 CA 泄露的爆炸半径。",
  difficulty: "进阶",
  tags: ["SSH 证书", "CA", "TrustedUserCAKeys", "principal", "短期凭证"],
  updated: "2026-09-10",
} satisfies NoteMeta;
