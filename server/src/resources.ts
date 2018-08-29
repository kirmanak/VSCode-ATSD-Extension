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

export const calendarKeywords: string[] = [
    "current_day", "current_hour", "current_minute", "current_month", "current_quarter", "current_week", "current_year",
    "first_day", "first_vacation_day", "first_working_day", "friday", "last_vacation_day", "last_working_day", "monday",
    "next_day", "next_hour", "next_minute", "next_month", "next_quarter", "next_vacation_day", "next_week",
    "next_working_day", "next_year", "now", "previous_day", "previous_hour", "previous_minute", "previous_month",
    "previous_quarter", "previous_vacation_day", "previous_week", "previous_working_day", "previous_year", "saturday",
    "sunday", "thursday", "tuesday", "wednesday",
];

const intervalUnits: string[] = ["millisecond", "second", "minute", "hour", "day", "week", "month", "quarter", "year"];
const booleanKeywords: string[] = ["false", "no", "null", "none", "0", "off", "true", "yes", "on", "1"];
export const intervalRegExp: RegExp = new RegExp(
    `^(?:(?:[-+]?(?:(?:\\d+|(?:\\d+)?\\.\\d+)|@\\{.+\\})[ \\t]*(?:${intervalUnits.join("|")}))|all)$`,
);
export const booleanRegExp: RegExp = new RegExp(
    `^(?:${booleanKeywords.join("|")})$`,
);
export const numberRegExp: RegExp = /^(?:\-|\+)?(?:\.\d+|\d+(?:\.\d+)?)$/;
export const integerRegExp: RegExp = /^[-+]?\d+$/;
export const calendarRegExp: RegExp = new RegExp(
    `^(?:${calendarKeywords.join("|")})` +
    `(?:[ \\t]*[-+][ \\t]*(?:\\d+|(?:\\d+)?\\.\\d+)[ \\t]*\\*[ \\t]*(?:${intervalUnits.join("|")}))?$`,
);
export const localDateRegExp: RegExp = new RegExp(
    // 2018-12-31
    "^(?:19[7-9]|[2-9]\\d\\d)\\d(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12][0-9]|3[01])" +
    // 01:13:46.123, 11:26:52
    "(?: (?:[01]\\d|2[0-4]):(?:[0-5][0-9])(?::(?:[0-5][0-9]))?(?:\\.\\d{1,9})?)?)?)?$",

);
export const zonedDateRegExp: RegExp = new RegExp(
    // 2018-12-31
    "^(?:19[7-9]|[2-9]\\d\\d)\\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])" +
    // T12:34:46.123, T23:56:18
    "[tT](?:[01]\\d|2[0-4]):(?:[0-5][0-9]):(?:[0-5][0-9])(?:\\.\\d{1,9})?" +
    // Z, +0400, -05:00
    "(?:[zZ]|[+-](?:[01]\\d|2[0-4]):?(?:[0-5][0-9]))$",
);

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
