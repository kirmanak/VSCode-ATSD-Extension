import { Test } from "./test";

suite("Formatting indents tests", () => {
    const tests: Test[] = [
        new Test(
            "correct cfg section",
            `[configuration]
  width-units = 200
  height-units = 200`,
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test(
            "incorrect cfg section",
            `[configuration]
width-units = 200
  height-units = 200`,
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
        new Test(
            "correct nested wgt section",
            `[configuration]
  width-units = 200
  height-units = 200
  [widget]
    type = chart`,
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test(
            "incorrect nested wgt section",
            `[configuration]
  width-units = 200
  height-units = 200
  [widget]
  type = chart`,
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
        new Test(
            "correct nested series section",
            `[configuration]
  width-units = 200
  height-units = 200
  [widget]
    type = chart
    [series]
      entity = server`,
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test(
            "incorrect nested series section",
            `[configuration]
  width-units = 200
  height-units = 200
  [widget]
    type = chart
  [series]
      entity = server`,
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
        new Test(
            "Correct for loop",
            `[configuration]
  width-units = 200
  height-units = 200
  [widget]
    type = chart
    for server in servers
    [series]
      entity = @{server}
    endfor`,
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test(
            "Incorrect for loop",
            `[configuration]
  width-units = 200
  height-units = 200
  [widget]
    type = chart
    for server in servers
      [series]
      entity = @{server}
    endfor`,
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
        new Test(
            "Incorrect nested if in for",
            `list servers = vps,
  vds
endlist
for item in servers
[series]
  entity = @{item}
  if @{item} = vps
    metric = cpu_busy
    elseif @{item} = vds
    metric = cpu_user
    else
    metric = cpu_system
    endif
endfor`,
            [
                {
                    newText: "  ", range: {
                        end: { character: "    ".length, line: 8 },
                        start: { character: 0, line: 8 },
                    },
                },
                {
                    newText: "  ", range: {
                        end: { character: "    ".length, line: 10 },
                        start: { character: 0, line: 10 },
                    },
                },
                {
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
        new Test(
            "Incorrect formatting in the first for, correct in second",
            `[widget]
  type = chart
  metric = cpu_busy

  list servers = nurswgvml006,
    nurswgvml007
  endlist

  for server in servers
[series]
    entity = @{server}

[series]
    entity = @{server}
  endfor

  for server in servers
  [series]
    entity = @{server}
    if server == 'nurswgvml007'
      color = red
    elseif server == 'nurswgvml006'
      color = yellow
    endif
  endfor`,
            [
                {
                    newText: "  ", range: {
                        end: { character: 0, line: 9 },
                        start: { character: 0, line: 9 },
                    },
                },
                {
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
        new Test(
            "A couple of correct groups",
            `[group]
  [widget]
    type = chart
    [series]
      entity = vps
      metric = cpu_busy
  [widget]
    type = chart
    [series]
      entity = vds
      metric = cpu_busy
[group]
  [widget]
    type = chart
    [series]
      entity = vps
      metric = cpu_busy
  [widget]
    type = chart
    [series]
      entity = vds
      metric = cpu_busy`,
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
        new Test(
            "Correct for after var declaration",
            `[widget]
  type = chart

  var servers = [ 'vps', 'vds' ]

  for item in servers
  [series]
    entity = @{item}
    metric = cpu_busy
  endfor`,
            [],
            {
                options: { insertSpaces: true, tabSize: 2 },
                textDocument: { uri: Test.URI },
            },
        ),
    ];

    tests.forEach((test: Test) => { test.formatTest(); });
});
