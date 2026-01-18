export type NgrokMessage = {
  text: string;
  object?: Record<string, unknown> | unknown[];
};

export type NgrokClientOptions = {
  url: string;
  onMessage: (payload: NgrokMessage) => Promise<void> | void;
  onError?: (error: Error) => void;
  onStatus?: (status: string) => void;
  reconnectMs?: number;
};

const normalizePayload = (payload: unknown): NgrokMessage | null => {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const text = typeof record.text === 'string' ? record.text.trim() : '';
  if (!text) return null;

  const objectValue =
    record.object ?? record.options ?? record.data ?? record.payload ?? null;

  let object: Record<string, unknown> | unknown[] | undefined;
  if (Array.isArray(objectValue)) {
    object = objectValue;
  } else if (objectValue && typeof objectValue === 'object') {
    object = objectValue as Record<string, unknown>;
  }

  return object ? { text, object } : { text };
};

const decodeMessage = (data: unknown): string | null => {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf8');
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString(
      'utf8'
    );
  }
  if (Buffer.isBuffer(data)) {
    return data.toString('utf8');
  }
  return null;
};

export const startNgrokClient = (options: NgrokClientOptions) => {
  let socket: WebSocket | null = null;
  let closed = false;
  let queue = Promise.resolve();

  const handleError = (error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    options.onError?.(normalized);
  };

  const enqueue = (payload: NgrokMessage) => {
    queue = queue.then(() => options.onMessage(payload)).catch(handleError);
  };

  const connect = () => {
    if (closed) return;
    options.onStatus?.('connecting');
    socket = new WebSocket(options.url);

    socket.addEventListener('open', () => {
      options.onStatus?.('open');
    });

    socket.addEventListener('message', (event) => {
      try {
        const text = decodeMessage(event.data);
        if (!text) return;
        const payload = normalizePayload(JSON.parse(text));
        if (!payload) return;
        enqueue(payload);
      } catch (error) {
        handleError(error);
      }
    });

    socket.addEventListener('error', () => {
      handleError(new Error('Ngrok WebSocket error'));
    });

    socket.addEventListener('close', () => {
      options.onStatus?.('closed');
      if (closed) return;
      const delay = options.reconnectMs ?? 1500;
      setTimeout(connect, delay);
    });
  };

  connect();

  return {
    close: () => {
      closed = true;
      socket?.close();
    },
  };
};
