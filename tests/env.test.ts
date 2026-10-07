import { describe, expect, it } from "vitest";
import { parseBooleanEnv, parseTopicAllowlist } from "../src/utils/env.js";

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

describe("parseTopicAllowlist (#34)", () => {
    it.each([undefined, "", "   ", ",", " , ,"])("treats %j as no allowlist", (value) => {
        expect(parseTopicAllowlist(value)).toEqual([]);
    });

    it("splits on commas, trims entries and drops empty ones", () => {
        expect(parseTopicAllowlist(" alerts, builds ,,deploys ")).toEqual(["alerts", "builds", "deploys"]);
    });

    it("keeps the first occurrence of a duplicate", () => {
        expect(parseTopicAllowlist("alerts,builds,alerts")).toEqual(["alerts", "builds"]);
    });

    it("is case-sensitive, like ntfy topics", () => {
        expect(parseTopicAllowlist("Alerts,alerts")).toEqual(["Alerts", "alerts"]);
    });

    it.each(["alerts,bad topic", "alerts,dots.not.allowed", `alerts,${"a".repeat(129)}`])(
        "rejects an invalid entry in %j, naming the variable but not echoing the entry",
        (value) => {
            expect(() => parseTopicAllowlist(value)).toThrow(/^Invalid NTFY_TOPICS_ALLOWLIST: topic /);
            try {
                parseTopicAllowlist(value);
            } catch (error) {
                expect((error as Error).message).not.toContain(value.split(",")[1]);
            }
        }
    );
});
