/**
 * Universal CLI wrapper for external LLMs (opencode, claude, qwen).
 * Runs Bun.spawn -- only callable from a real Bun process (the dev server,
 * a Tauri Rust command's shelled-out equivalent, or a CLI script), never
 * directly from browser/webview-executed React code. See src/lib/llmClient.ts
 * for the browser-safe entry point that routes here through a Bun process.
 */

export type ModelProvider = 'opencode' | 'claude' | 'qwen';

export interface LLMOptions {
    model?: string;
    systemPrompt?: string;
    prompt: string;
    /** Optional timeout in milliseconds (default 120s). */
    timeoutMs?: number;
}

export interface LLMResponse {
    content: string;
    rawOutput: string;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Executes an LLM CLI command and returns the response.
 */
export async function callLLM(provider: ModelProvider, options: LLMOptions): Promise<LLMResponse> {
    let args: string[] = [];

    switch (provider) {
        case 'opencode':
            args = ['--model', options.model || 'gpt-4o', '--prompt', options.prompt];
            break;
        case 'claude':
            args = ['-p', options.prompt];
            if (options.systemPrompt) {
                args.push('--system-prompt', options.systemPrompt);
            }
            break;
        case 'qwen':
            args = ['--model', options.model || 'qwen-max', '--prompt', options.prompt];
            break;
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let timedOut = false;
    let proc: ReturnType<typeof Bun.spawn> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    try {
        // Bun.spawn returns a Subprocess immediately; await proc.exited for the exit code.
        proc = Bun.spawn([provider, ...args], {
            stdout: "pipe",
            stderr: "pipe",
        });

        timer = setTimeout(() => {
            timedOut = true;
            try {
                proc?.kill();
            } catch {
                // ignore kill errors
            }
        }, timeoutMs);

        // With stdout/stderr: "pipe", these are ReadableStreams (not inherited fds).
        const stdout = proc.stdout as ReadableStream<Uint8Array>;
        const stderr = proc.stderr as ReadableStream<Uint8Array>;

        const [exitCode, output, errorOutput] = await Promise.all([
            proc.exited,
            new Response(stdout).text(),
            new Response(stderr).text(),
        ]);

        if (timedOut) {
            throw new Error(`CLI ${provider} timed out after ${timeoutMs}ms`);
        }

        if (exitCode !== 0) {
            throw new Error(`CLI ${provider} failed with exit code ${exitCode}: ${errorOutput}`);
        }

        return {
            content: output.trim(),
            rawOutput: output
        };
    } catch (error) {
        console.error(`Error calling ${provider}:`, error);
        throw error;
    } finally {
        if (timer) clearTimeout(timer);
    }
}
