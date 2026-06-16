export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function parseJsonBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function throwApiClientError(res: Response): Promise<never> {
  let message = res.statusText || `Request failed with status ${res.status}`;

  try {
    const text = await res.text();
    if (text) {
      const body = JSON.parse(text) as { error?: string };
      if (body.error) message = body.error;
    }
  } catch {
    // 非 JSON 错误体时保留默认 message
  }

  throw new ApiClientError(message, res.status);
}

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

export async function apiJson<T>(path: string, init?: FetchInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    await throwApiClientError(res);
  }
  return parseJsonBody<T>(res);
}

export async function apiForm<T>(
  path: string,
  formData: FormData,
  init?: Omit<FetchInit, "body">,
): Promise<T> {
  const res = await fetch(path, { ...init, body: formData });
  if (!res.ok) {
    await throwApiClientError(res);
  }
  return parseJsonBody<T>(res);
}
