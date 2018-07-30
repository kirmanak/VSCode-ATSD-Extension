import { DiagnosticSeverity } from "vscode-languageserver/lib/main";
import Util from "../Util";
import Test from "./Test";

const firstVar = "serv";
const secondVar = "server";
const thirdVar = "srv";

suite("Undefined variable in for loop", () => {
    const tests = [
        new Test("One correct loop",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${firstVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor",
            [],
        ),
        new Test("One correct loop with comment",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${firstVar} /* this is a comment */ in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor",
            [],
        ),
        new Test("Two correct  loops",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${firstVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor\n" +
            `for ${firstVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor",
            [],
        ),
        new Test("One incorrect loop",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: `       entity = @{`.length + firstVar.length, line: 4 },
                        start: { character: `       entity = @{`.length, line: 4 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage(firstVar, secondVar),
            )],
        ),
        new Test("Two incorrect loops",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor\n" +
            `for ${firstVar} in servers\n` +
            `   [series]\n` +
            "       metric = placeholder\n" +
            `       entity = @{${secondVar}}\n` +
            "endfor",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: `       entity = @{`.length + firstVar.length, line: 4 },
                        start: { character: `       entity = @{`.length, line: 4 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage(firstVar, secondVar),
            ), Util.createDiagnostic(
                {
                    range: {
                        end: { character: `       entity = @{`.length + secondVar.length, line: 9 },
                        start: { character: `       entity = @{`.length, line: 9 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage(secondVar, "servers"),
            )],
        ),
        new Test("One incorrect loop, one correct loop",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor\n" +
            `for ${firstVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar}}\n` +
            "endfor",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: `       entity = @{`.length + firstVar.length, line: 4 },
                        start: { character: `       entity = @{`.length, line: 4 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage(firstVar, secondVar),
            )],
        ),
        new Test("One correct nested loop",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${secondVar}}\n` +
            `   for ${firstVar} in servers\n` +
            "       [series]\n" +
            "           metric = placeholder\n" +
            `           entity = @{${secondVar}}\n` +
            "       [series]\n" +
            "           metric = placeholder\n" +
            `           entity = @{${firstVar}}\n` +
            "   endfor\n" +
            "endfor",
            [],
        ),
        new Test("One incorrect nested loop",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${secondVar}}\n` +
            `   for ${firstVar} in servers\n` +
            "       [series]\n" +
            "           metric = placeholder\n" +
            `           entity = @{${thirdVar}}\n` +
            "       [series]\n" +
            "           metric = placeholder\n" +
            `           entity = @{${firstVar}}\n` +
            "   endfor\n" +
            "endfor",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: `           entity = @{`.length + thirdVar.length, line: 8 },
                        start: { character: `           entity = @{`.length, line: 8 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage(thirdVar, firstVar),
            )],
        ),
        new Test("Arithmetic expression with correct var",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${firstVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${firstVar} + ${firstVar}}\n` +
            "endfor",
            [],
        ),
        new Test("Arithmetic expression with incorrect var",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${firstVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${secondVar} + ${firstVar}}\n` +
            "endfor",
            [Util.createDiagnostic(
                {
                    range: {
                        end: { character: `       entity = @{`.length + secondVar.length, line: 4 },
                        start: { character: `       entity = @{`.length, line: 4 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage(secondVar, "servers"),
            )],
        ),
        new Test("Function + correct var",
            "list servers = 's1v1', 's1v2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{keepAfterLast(${secondVar}, '1')}\n` +
            "endfor",
            [],
        ),
        new Test("Property of a correct var",
            "var servers = [ { name: 'srv1' }, { name: 'srv2' } ]\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{${secondVar}.name}\n` +
            "endfor",
            [],
        ),
        new Test("String",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{keepAfterLast(${secondVar}, 'v')}\n` +
            "endfor",
            [],
        ),
        new Test("Several statements, second incorrect",
            "list servers = 'srv1', 'srv2'\n" +
            `for ${secondVar} in servers\n` +
            "   [series]\n" +
            "       metric = placeholder\n" +
            `       entity = @{keepAfterLast(${secondVar}, 'v')}, @{${firstVar}}\n` +
            "endfor",
            [Util.createDiagnostic(
                {
                    range: {
                        end: {
                            character: `       entity = @{keepAfterLast(${secondVar}, 'v')}, @{`.length
                                + firstVar.length,
                            line: 4,
                        },
                        start: { character: `       entity = @{keepAfterLast(${secondVar}, 'v')}, @{`.length, line: 4 },
                    }, uri: Test.URI,
                },
                DiagnosticSeverity.Error, Util.errorMessage(firstVar, secondVar),
            )],
        ),
    ];

    tests.forEach(Test.VALIDATION_TEST);

});
