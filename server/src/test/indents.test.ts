import Test from "./Test";

suite("Formatting indents tests", () => {
    const tests = [
        new Test("correct cfg section",
            "[configuration]\n" +
            "  width-units = 200\n" +
            "  height-units = 200\n",
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test("incorrect cfg section",
            "[configuration]\n" +
            "width-units = 200\n" +
            "  height-units = 200\n",
            [{
                newText: "  ", range: {
                    end: {character: 0, line: 1},
                    start: {character: 0, line: 1},
                },
            }],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test("correct nested wgt section",
            "[configuration]\n" +
            "  width-units = 200\n" +
            "  height-units = 200\n" +
            "  [widget]\n" +
            "    type = chart\n",
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test("incorrect nested wgt section",
            "[configuration]\n" +
            "  width-units = 200\n" +
            "  height-units = 200\n" +
            "  [widget]\n" +
            "  type = chart\n",
            [{
                newText: "    ", range: {
                    end: {character: 2, line: 4},
                    start: {character: 0, line: 4},
                },
            }],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test("correct nested series section",
            "[configuration]\n" +
            "  width-units = 200\n" +
            "  height-units = 200\n" +
            "  [widget]\n" +
            "    type = chart\n" +
            "    [series]\n" +
            "      entity = server\n",
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test("incorrect nested series section",
            "[configuration]\n" +
            "  width-units = 200\n" +
            "  height-units = 200\n" +
            "  [widget]\n" +
            "    type = chart\n" +
            "  [series]\n" +
            "      entity = server\n",
            [{
                newText: "    ", range: {
                    end: {character: 2, line: 5},
                    start: {character: 0, line: 5},
                },
            }],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test("Correct for loop",
            "[configuration]\n" +
            "  width-units = 200\n" +
            "  height-units = 200\n" +
            "  [widget]\n" +
            "    type = chart\n" +
            "    for server in servers\n" +
            "      [series]\n" +
            "        entity = @{server}\n" +
            "    endfor\n",
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test("Incorrect for loop",
            "[configuration]\n" +
            "  width-units = 200\n" +
            "  height-units = 200\n" +
            "  [widget]\n" +
            "    type = chart\n" +
            "    for server in servers\n" +
            "      [series]\n" +
            "      entity = @{server}\n" +
            "    endfor\n",
            [{
                newText: "        ", range: {
                    end: {character: "      ".length, line: 7},
                    start: {character: 0, line: 7},
                },
            }],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
    ];

    tests.forEach(Test.FORMAT_TEST);
});
