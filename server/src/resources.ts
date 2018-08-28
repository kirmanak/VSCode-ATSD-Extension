import { readFileSync } from "fs";
import { join } from "path";
import { Setting } from "./setting";

export const settings: Setting[] = JSON.parse(readFileSync(join(__dirname, "dictionary.json"), "UTF-8")
    .trim()).settings
    .filter((setting: Setting): boolean => setting !== undefined && setting !== null)
    .map((setting: Setting) =>
        new Setting(setting.displayName, setting.type, setting.example, setting.defaultValue, setting.enum,
                    setting.multiLine, setting.maxValue, setting.minValue, setting.section, setting.script,
                    setting.description, setting.excludes),
    );

export const displayNames: string[] = settings.map((setting: Setting): string => setting.displayName);

export const requiredSectionSettingsMap: Map<string, Setting[][]> = new Map<string, Setting[][]>();
requiredSectionSettingsMap.set("series", [
    [
        settings.find((setting: Setting): boolean => setting.name === "entity"),
        settings.find((setting: Setting): boolean => setting.name === "value"),
        settings.find((setting: Setting): boolean => setting.name === "table"),
        settings.find((setting: Setting): boolean => setting.name === "attribute"),
        settings.find((setting: Setting): boolean => setting.name === "entities"),
    ],
    [
        settings.find((setting: Setting): boolean => setting.name === "metric"),
        settings.find((setting: Setting): boolean => setting.name === "value"),
        settings.find((setting: Setting): boolean => setting.name === "table"),
        settings.find((setting: Setting): boolean => setting.name === "attribute"),
    ],
]);
requiredSectionSettingsMap.set("widget", [[settings.find((setting: Setting): boolean => setting.name === "type")]]);
requiredSectionSettingsMap.set("dropdown", [[
    settings.find((setting: Setting): boolean => setting.name === "onchange"),
    settings.find((setting: Setting): boolean => setting.name === "changefield")],
]);

export const parentSections: Map<string, string[]> = new Map<string, string[]>();
parentSections.set("widget", ["group", "configuration"]);
parentSections.set("series", ["widget"]);

// Returns array of parent sections for the section
export const getParents: (section: string) => string[] = (section: string): string[] => {
    const parents: string[] = [];
    const found: string[] = parentSections.get(section);
    if (found) {
        found.forEach((father: string) => {
            parents.push(father);
            getParents(father)
                .forEach((grand: string) => parents.push(grand));
        });
    }

    return parents;
};

export const possibleSections: string[] = [
    "column", "configuration", "dropdown", "group", "keys", "link", "node", "option", "other", "placeholders",
    "properties", "property", "series", "tag", "tags", "threshold", "widget",
];
