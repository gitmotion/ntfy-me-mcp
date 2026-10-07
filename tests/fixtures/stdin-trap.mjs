// Preloaded into the spawned server (`node --import`) by tests/stdout.test.ts.
// Writes STDIN_TOUCHED:<method> to stderr whenever anything starts using
// process.stdin, so a test can prove a startup path never reads it.
import { writeSync } from "node:fs";

const descriptor = Object.getOwnPropertyDescriptor(process, "stdin");
let trapped;

Object.defineProperty(process, "stdin", {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
        const stdin = descriptor.get.call(process);
        if (stdin !== trapped) {
            trapped = stdin;
            for (const method of ["on", "once", "addListener", "prependListener", "resume", "read", "pipe"]) {
                const original = stdin[method];
                stdin[method] = function (...args) {
                    // Synchronous, so the marker survives an immediate process.exit().
                    writeSync(2, `STDIN_TOUCHED:${method}\n`);
                    return original.apply(this, args);
                };
            }
        }
        return stdin;
    },
});
