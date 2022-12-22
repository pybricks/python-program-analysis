import { Cell } from '../cell';
import { ProgramBuilder } from '../program-builder';
import { TestCell } from './testcell';

describe('program builder', () => {
  function createCell(
    executionEventId: string,
    text: string,
    executionCount?: number
  ): Cell {
    return new TestCell(text, executionCount, executionEventId);
  }

  let programBuilder: ProgramBuilder;
  beforeEach(() => {
    programBuilder = new ProgramBuilder();
  });

  it('appends cell contents in order', () => {
    programBuilder.add(
      createCell('id1', 'print(1)'),
      createCell('id2', 'print(2)')
    );
    let code = programBuilder.buildTo('id2').text;
    expect(code).toBe(['print(1)', 'print(2)', ''].join('\n'));
  });

  it('builds a map from lines to cells', () => {
    let cell1 = createCell('id1', 'print(1)');
    let cell2 = createCell('id2', 'print(2)');
    programBuilder.add(cell1, cell2);
    let lineToCellMap = programBuilder.buildTo('id2').lineToCellMap;
    expect(lineToCellMap[1]).toEqual(cell1);
    expect(lineToCellMap[2]).toEqual(cell2);
  });

  it('builds a map from cells to lines', () => {
    let cell1 = createCell('id1', 'print(1)');
    let cell2 = createCell('id2', 'print(2)');
    programBuilder.add(cell1, cell2);
    let cellToLineMap = programBuilder.buildTo('id2').cellToLineMap;
    expect(cellToLineMap['id1'].items).toEqual([1]);
    expect(cellToLineMap['id2'].items).toEqual([2]);
  });

  it('stops after the specified cell', () => {
    programBuilder.add(
      createCell('id1', 'print(1)'),
      createCell('id2', 'print(2)')
    );
    let code = programBuilder.buildTo('id1').text;
    expect(code).toBe('print(1)\n');
  });

  /* We might want the program builder to include code that was executed before a runtime
   * error, though this will probably require us to rewrite the code. */
  it('skips cells with errors', () => {
    let badCell = createCell('idE', 'print(2)');
    badCell.hasError = true;
    programBuilder.add(
      createCell('id1', 'print(1)'),
      badCell,
      createCell('id3', 'print(3)')
    );
    let code = programBuilder.buildTo('id3').text;
    expect(code).toBe(['print(1)', 'print(3)', ''].join('\n'));
  });

  it('includes cells that end with errors', () => {
    let badCell = createCell('idE', 'print(bad_name)');
    badCell.hasError = true;
    programBuilder.add(
      createCell('id1', 'print(1)'),
      createCell('id2', 'print(2)'),
      badCell
    );
    let code = programBuilder.buildTo('idE').text;
    expect(code).toBe(
      ['print(1)', 'print(2)', 'print(bad_name)', ''].join('\n')
    );
  });

  /* Sometimes, a cell might not throw an error, but our parser might choke. This shouldn't
   * crash the entire program---just skip it if it can't parse. */
  it('skips cells that fail to parse', () => {
    let badCell = createCell('idE', 'causes_syntax_error(');

    // Hide console output from parse errors.
    let oldConsoleLog = console.log;
    console.log = () => {};

    programBuilder.add(
      createCell('id1', 'print(1)'),
      badCell,
      createCell('id3', 'print(3)')
    );

    // Restore console output.
    console.log = oldConsoleLog;

    let code = programBuilder.buildTo('id3').text;
    expect(code).toBe(['print(1)', 'print(3)', ''].join('\n'));
  });

  it("doesn't skip cells with array slices", () => {
    programBuilder.add(
      createCell('id1', 'array[0:1]'),
      createCell('id2', 'print(x)')
    );
    let code = programBuilder.buildTo('id2').text;
    expect(code).toBe('array[0:1]\nprint(x)\n');
  });

  it('skips cells that were executed in prior kernels', () => {
    programBuilder.add(
      createCell('id1', 'print(1)', 1),
      createCell('id2', 'print(2)', 1),
      createCell('id3', 'print(3)', 2),
      createCell('id3', 'print(4)', 1)
    );
    let code = programBuilder.buildTo('id3').text;
    expect(code).toBe(['print(4)', ''].join('\n'));
  });

  it('constructs a tree for the program', () => {
    programBuilder.add(
      createCell('id1', 'print(1)'),
      createCell('id2', 'print(2)')
    );
    let tree = programBuilder.buildTo('id2').tree;
    expect(tree.code).toHaveLength(2);
  });

  it('adjusts the node locations', () => {
    programBuilder.add(
      createCell('id1', 'print(1)'),
      createCell('id2', 'print(2)')
    );
    let tree = programBuilder.buildTo('id2').tree;
    expect(tree.code[0].location.first_line).toBe(1);
    expect(tree.code[1].location.first_line).toBe(2);
  });

  it('annotates tree nodes with cell ID info', () => {
    programBuilder.add(createCell('id1', 'print(1)'));
    let tree = programBuilder.buildTo('id1').tree;
    expect(tree.code[0].location.path).toBe('id1');
  });
});
