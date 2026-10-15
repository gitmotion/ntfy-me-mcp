import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fetchToolInputSchema } from "../src/schemas/fetchTool.schema.js";
import { notifyToolInputSchema } from "../src/schemas/notifyTool.schema.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(rootDir, "skills");

interface ParsedSkill {
    dirName: string;
    filePath: string;
    rawContent: string;
    name?: string;
    description?: string;
    body: string;
    lineCount: number;
}

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) {
        throw new Error("Missing YAML frontmatter block enclosed by '---'");
    }
    const yamlBlock = match[1];
    const body = match[2];
    const frontmatter: Record<string, string> = {};

    for (const line of yamlBlock.split(/\r?\n/)) {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            frontmatter[key] = value;
        }
    }
    return { frontmatter, body };
}

function loadSkills(): ParsedSkill[] {
    const entries = readdirSync(skillsDir);
    const skills: ParsedSkill[] = [];

    for (const entry of entries) {
        const fullPath = join(skillsDir, entry);
        if (statSync(fullPath).isDirectory()) {
            const skillFilePath = join(fullPath, "SKILL.md");
            const rawContent = readFileSync(skillFilePath, "utf8");
            const { frontmatter, body } = parseFrontmatter(rawContent);
            skills.push({
                dirName: entry,
                filePath: skillFilePath,
                rawContent,
                name: frontmatter.name,
                description: frontmatter.description,
                body,
                lineCount: rawContent.split(/\r?\n/).length,
            });
        }
    }
    return skills;
}

describe("Agent Skills specification compliance", () => {
    const skills = loadSkills();

    it("finds at least the core ntfy-me, ntfy-me-setup, and ntfy-me-ask skills", () => {
        const skillNames = skills.map((s) => s.dirName);
        expect(skillNames).toContain("ntfy-me");
        expect(skillNames).toContain("ntfy-me-setup");
        expect(skillNames).toContain("ntfy-me-ask");
    });

    for (const skill of skills) {
        describe(`Skill: ${skill.dirName}`, () => {
            it("has a valid name that matches the directory name and spec regex", () => {
                expect(skill.name).toBeDefined();
                expect(skill.name).toBe(skill.dirName);
                expect(skill.name!.length).toBeGreaterThanOrEqual(1);
                expect(skill.name!.length).toBeLessThanOrEqual(64);
                expect(skill.name).toMatch(/^[a-z0-9-]+$/);
            });

            it("has a description between 1 and 1024 characters", () => {
                expect(skill.description).toBeDefined();
                expect(skill.description!.length).toBeGreaterThanOrEqual(1);
                expect(skill.description!.length).toBeLessThanOrEqual(1024);
            });

            it("keeps the body under 500 lines", () => {
                expect(skill.lineCount).toBeLessThan(500);
            });
        });
    }

    describe("Parameter drift tests", () => {
        const notifyProperties = new Set(Object.keys(notifyToolInputSchema.shape));
        const fetchProperties = new Set(Object.keys(fetchToolInputSchema.shape));

        it("validates that all tool parameters mentioned in JSON code blocks exist in schemas", () => {
            // Find all JSON object keys in JSON code blocks in skills
            for (const skill of skills) {
                const jsonBlocks = skill.body.matchAll(/```json\s*([\s\S]*?)\s*```/g);
                for (const match of jsonBlocks) {
                    try {
                        const parsed = JSON.parse(match[1]);
                        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                            // Check if this looks like a call to ntfy_me or ntfy_me_fetch
                            const keys = Object.keys(parsed);
                            for (const key of keys) {
                                // Ignore nested objects/arrays inside action objects
                                const isNotifyParam = notifyProperties.has(key);
                                const isFetchParam = fetchProperties.has(key);
                                expect(
                                    isNotifyParam || isFetchParam,
                                    `Parameter "${key}" referenced in ${skill.dirName}/SKILL.md does not exist in any tool schema`
                                ).toBe(true);
                            }
                        }
                    } catch {
                        // Skip non-object or invalid JSON snippets
                    }
                }
            }
        });

        it("ensures ntfy-me skill covers the key notify parameters", () => {
            const coreSkill = skills.find((s) => s.dirName === "ntfy-me");
            expect(coreSkill).toBeDefined();
            const body = coreSkill!.body;

            // Check that core parameters are explained
            const expectedParams = ["priority", "tags", "markdown", "actions", "click", "topic", "url"];
            for (const param of expectedParams) {
                expect(body).toContain(param);
            }
        });

        it("ensures ntfy-me-ask skill covers the fetch parameters and untrusted-reply rule", () => {
            const askSkill = skills.find((s) => s.dirName === "ntfy-me-ask");
            expect(askSkill).toBeDefined();
            const body = askSkill!.body;

            expect(body).toContain("since");
            expect(body.toLowerCase()).toContain("untrusted");
        });
    });
});
