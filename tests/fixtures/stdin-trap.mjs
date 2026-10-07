// Preloaded into the spawned server (`node --import`) by tests/stdout.test.ts.
// Writes STDIN_TOUCHED:<method> to stderr whenever anything starts reading
// stdin, so a test can prove a startup path never reads it. Covers stream
// readers of process.stdin (on/once/resume/read/pipe, which readline,
// async iteration and `prompts` all go through) and direct fd-0 reads via fs.
// Not covered: fs/promises.
import fs, { writeSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";

// Synchronous, so markers survive an immediate process.exit().
const report = (method) => writeSync(2, `STDIN_TOUCHED:${method}\n`);

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
                    report(method);
                    return original.apply(this, args);
                };
            }
        }
        return stdin;
    },
});

const isStdin = (target) => target === 0 || target === "/dev/stdin";

for (const method of ["read", "readSync", "readFile", "readFileSync"]) {
    const original = fs[method];
    fs[method] = function (target, ...args) {
        if (isStdin(target)) report(`fs.${method}`);
        return original.call(this, target, ...args);
    };
}

const originalCreateReadStream = fs.createReadStream;
fs.createReadStream = function (path, options) {
    if (isStdin(path) || options?.fd === 0) report("fs.createReadStream");
    return originalCreateReadStream.call(this, path, options);
};

// Make `import { readSync } from "node:fs"` see the wrappers too.
syncBuiltinESMExports();

writeSync(2, "STDIN_TRAP_LOADED\n");
