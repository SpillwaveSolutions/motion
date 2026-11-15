/**
 * Fans one workspace file watch out to every open `/api/fs/events` stream.
 *
 * The dev server keeps ONE fs.watch for its whole life. A watch per stream
 * leaked: Bun 1.3 on macOS does not release a closed watch's handle, so each
 * page load left one behind.
 *
 * NOT imported by the browser bundle: this runs in the Bun dev-server process.
 */
export interface ChangeHub {
    /** Add a sender. Returns the unsubscribe. A sender that throws is dropped. */
    subscribe(send: () => void): () => void;
    /** Report one watched change. Signals all senders once per window. */
    notify(): void;
    readonly size: number;
}

export function createChangeHub(windowMs: number): ChangeHub {
    const senders = new Set<() => void>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    return {
        subscribe(send) {
            senders.add(send);
            return () => {
                senders.delete(send);
            };
        },
        notify() {
            // ponytail: a throttle, not a trailing debounce. A debounce that
            // restarts on each event never fires while a log file grows.
            if (timer) return;
            timer = setTimeout(() => {
                timer = null;
                for (const send of [...senders]) {
                    try {
                        send();
                    } catch {
                        senders.delete(send); // the client went away
                    }
                }
            }, windowMs);
        },
        get size() {
            return senders.size;
        },
    };
}
