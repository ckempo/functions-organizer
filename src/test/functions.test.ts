import { expect } from 'chai';
import * as vscode from 'vscode';

import FunctionMove from '../functionMove';
import TestGenerator from './automated';
import { ACTION, closeDocument, getOutputContent, readJSON, setupDocument, TestMap } from './testUtils';

const testsMap: { tests: TestMap[] } = readJSON("tests.map.json");
const GENERATED_AMOUNT = 10;

async function performAction(fm: FunctionMove, action: ACTION, sel: vscode.Selection): Promise<boolean | null> {
    let returnValue;
    switch (action) {
        case ACTION.UP:
            returnValue = await fm.moveUp(sel);
            break;
        case ACTION.DOWN:
            returnValue = await fm.moveDown(sel);
            break;
        default:
            returnValue = null;
    }
    return returnValue;
}

async function executeTest(test: TestMap) {
    const editor = await setupDocument(test);
    const fm = new FunctionMove(editor);
    let returnValue: boolean | null = await performAction(fm, test.action, editor.selection);
    if (returnValue != test.returnValue) {
        process.exit(-1);
    }
    expect(returnValue).to.not.be.equal(null, `Error in tests\' map file - invalid action`);
    expect(returnValue).to.be.equal(test.returnValue, `returned value`);

    if (returnValue) {
        const content = await getOutputContent(test);
        expect(editor.document.getText()).to.equal(content, "content of file");
    }

    const after = test.afterRange;
    expect(editor.selection).to.deep.equal(
        new vscode.Selection(
            new vscode.Position(after.start.line, after.start.character),
            new vscode.Position(after.end.line, after.end.character)),
        "selection in file",
    )
    await closeDocument();
}

suite("Generated Tests", async () => {
    const tg = new TestGenerator(
        (len) => Math.floor(Math.random() * len),
        {
            maxStatement: 4,
            maxFunctions: 5,
            maxWhitespace: 3,
            maxNameLength: 10,
        },
    );

    for (let i = 0; i < GENERATED_AMOUNT; i++) {
        const gen = tg.generate();
        await test(gen.name, () => executeTest(gen));
    }
})

suite("Written Tests", async () => {
    for (let i = 0; i < testsMap.tests.length; i++) {
        await test(`Case ${i} (${testsMap.tests[i].name})`, () => executeTest(testsMap.tests[i]));
    }
});
