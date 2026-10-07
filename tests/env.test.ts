import { describe, expect, it } from "vitest";
import { parseBooleanEnv } from "../src/utils/env.js";

describe("parseBooleanEnv", () => {
    it.each(["true", "TRUE", " True ", "1", "yes", "YES"])("treats %j as true", (value) => {
        expect(parseBooleanEnv(value)).toBe(true);
    });

    it.each([undefined, "", "  ", "false", "0", "no", "off", "enabled", "${input:x}"])(
        "treats %j as false",
        (value) => {
            expect(parseBooleanEnv(value)).toBe(false);
        }
    );
});
