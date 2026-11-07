export async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: signal ?? AbortSignal.timeout(10000),
  })
  const data = await response.json().catch(() => ({ error: 'The server could not be reached. Please try again.' }))
  if (!response.ok) throw new Error(data.error ?? 'The request could not be completed.')
  return data as T
}
