"use client";

import Image from "next/image";
import { useAnalytics } from "@/libs/analytics";

export default function BMCButton() {
  const { event } = useAnalytics();

  return (
    <a
      href="https://coff.ee/baptiste.may"
      target="_blank"
      onClick={() => event("donation-click")}
    >
      <Image src="/bmc-button.svg" alt="" width={182} height={51} />
    </a>
  );
}
