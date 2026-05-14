import { logoutResponse } from "@/lib/api/proxy";

export async function POST() {
  return logoutResponse();
}
