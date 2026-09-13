import { postBackendJsonWithBody } from "@/platform/http/client";
import type { McxPreviewRequest, McxPreviewResponse } from "./types";

export async function previewMcxMarket(payload: McxPreviewRequest) {
  return postBackendJsonWithBody<McxPreviewResponse, McxPreviewRequest>(
    "/api/v1/mcx/upstox/preview",
    payload,
  );
}
