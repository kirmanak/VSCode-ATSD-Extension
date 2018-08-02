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
                    end: { character: 0, line: 1 },
                    start: { character: 0, line: 1 },
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
                    end: { character: 2, line: 4 },
                    start: { character: 0, line: 4 },
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
                    end: { character: 2, line: 5 },
                    start: { character: 0, line: 5 },
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
            "    [series]\n" +
            "      entity = @{server}\n" +
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
                newText: "    ", range: {
                    end: { character: "      ".length, line: 6 },
                    start: { character: 0, line: 6 },
                },
            }],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test("Incorrect nested if in for",
            "list servers = vps,\n" +
            "  vds\n" +
            "endlist\n" +
            "for item in servers\n" +
            "[series]\n" +
            "  entity = ${item}\n" +
            "  if ${item} = vps\n" +
            "    metric = cpu_busy\n" +
            "    elseif ${item} = vds\n" +
            "    metric = cpu_user\n" +
            "    else\n" +
            "    metric = cpu_system\n" +
            "    endif\n" +
            "endfor\n",
            [{
                newText: "  ", range: {
                    end: { character: "    ".length, line: 8 },
                    start: { character: 0, line: 8 },
                },
            }, {
                newText: "  ", range: {
                    end: { character: "    ".length, line: 10 },
                    start: { character: 0, line: 10 },
                },
            }, {
                newText: "  ", range: {
                    end: { character: "    ".length, line: 12 },
                    start: { character: 0, line: 12 },
                },
            }],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test("Incorrect formatting in the first for, correct in second",
            "[widget]\n" +
            "  type = chart\n" +
            "  metric = cpu_busy\n" +
            "\n" +
            "  list servers = nurswgvml006, \n" +
            "    nurswgvml007\n" +
            "  endlist\n" +
            "\n" +
            "  for server in servers\n" +
            "[series]\n" +
            "    entity = @{server}\n" +
            "\n" +
            "[series]\n" +
            "    entity = @{server}\n" +
            "  endfor\n" +
            "\n" +
            "  for server in servers\n" +
            "  [series]\n" +
            "    entity = @{server}\n" +
            "    if server == 'nurswgvml007'\n" +
            "      color = red\n" +
            "    elseif server == 'nurswgvml006'\n" +
            "      color = yellow\n" +
            "    endif\n" +
            "  endfor\n",
            [{
                newText: "  ", range: {
                    end: { character: 0, line: 9 },
                    start: { character: 0, line: 9 },
                },
            }, {
                newText: "  ", range: {
                    end: { character: 0, line: 12 },
                    start: { character: 0, line: 12 },
                },
            }],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test("A couple of correct groups",
            "[group]\n" +
            "  [widget]\n" +
            "    type = chart\n" +
            "    [series]\n" +
            "      entity = vps\n" +
            "      metric = cpu_busy\n" +
            "  [widget]\n" +
            "    type = chart\n" +
            "    [series]\n" +
            "      entity = vds\n" +
            "      metric = cpu_busy\n" +
            "[group]\n" +
            "  [widget]\n" +
            "    type = chart\n" +
            "    [series]\n" +
            "      entity = vps\n" +
            "      metric = cpu_busy\n" +
            "  [widget]\n" +
            "    type = chart\n" +
            "    [series]\n" +
            "      entity = vds\n" +
            "      metric = cpu_busy\n",
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test("Correct for after var declaration",
            "[widget]\n" +
            "  type = chart\n" +
            "\n" +
            "  var servers = [ 'vps', 'vds' ]\n" +
            "\n" +
            "  for item in servers\n" +
            "  [series]\n" +
            "    entity = @{item}\n" +
            "    metric = cpu_busy\n" +
            "  endfor\n",
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
    ];

    tests.forEach(Test.FORMAT_TEST);
});
