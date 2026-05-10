import { Buffer } from "buffer";

// Polyfill Buffer for Solana wallet adapters
if (typeof window !== "undefined") {
  if (!window.Buffer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Buffer = Buffer;
  }
}
