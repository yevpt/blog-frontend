import { type NextRequest, NextResponse } from "next/server";
import { jsonWithAuthSession, resolveAuthUser } from "@/lib/auth-session";

const REGISTER_MULTIPART_MAX_BYTES = 256 * 1024 + 64 * 1024;

function rejectOversizedRegister(req: NextRequest): NextResponse | null {
  const contentLength = req.headers.get("content-length");
  if (!contentLength) return null;
  const size = Number(contentLength);
  if (!Number.isFinite(size) || size <= 0) return null;
  if (size > REGISTER_MULTIPART_MAX_BYTES) {
    return NextResponse.json({ code: 400, message: "上传内容过大" }, { status: 413 });
  }
  return null;
}

/** 邮箱注册：流式透传 multipart/form-data，成功后写入登录 Cookie */
export async function POST(request: NextRequest) {
  const rejected = rejectOversizedRegister(request);
  if (rejected) return rejected;

  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("multipart/form-data") || !request.body) {
    return NextResponse.json({ code: 400, message: "请求格式错误" }, { status: 400 });
  }

  const res = await fetch(`${process.env.API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: request.body,
    duplex: "half",
  } as RequestInit);
  const data = await res.json();

  if (data.code !== 0) {
    return NextResponse.json(data, { status: res.status });
  }

  const user = resolveAuthUser(data.data);

  return jsonWithAuthSession({ ...data.data, user });
}
