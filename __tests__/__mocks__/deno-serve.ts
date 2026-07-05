let handler: ((req: Request) => Response | Promise<Response>) | null = null;

export function serve(h: (req: Request) => Response | Promise<Response>): void {
  handler = h;
}

export function __getHandler(): ((req: Request) => Response | Promise<Response>) | null {
  return handler;
}

export function __resetHandler(): void {
  handler = null;
}
