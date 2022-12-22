import { Cell } from '../cell';
import { CellSlice } from '../cellslice';
import { SlicedExecution } from '../log-slicer';
import { LocationSet } from '../slice';
import { TestCell } from './testcell';

describe('SlicedExecution', () => {
  function cell(
    executionEventId: string,
    text: string,
    executionCount?: number,
    id?: string
  ): Cell {
    if (executionCount === undefined) executionCount = 1;
    return new TestCell(text, executionCount, executionEventId, id);
  }

  function cellSlice(cell: Cell, slice: LocationSet): CellSlice {
    return new CellSlice(cell, slice);
  }

  function location(
    first_line: number,
    first_column: number,
    last_line: number,
    last_column: number
  ) {
    return {
      first_line: first_line,
      first_column: first_column,
      last_line: last_line,
      last_column: last_column,
    };
  }

  function slicedExecution(...cellSlices: CellSlice[]) {
    return new SlicedExecution(new Date(), cellSlices);
  }

  describe('merge', () => {
    it('unions slices with different cells', () => {
      let slice1 = slicedExecution(
        cellSlice(cell('1', 'a = 1', 1), new LocationSet(location(1, 0, 1, 5)))
      );
      let slice2 = slicedExecution(
        cellSlice(cell('2', 'b = 2', 2), new LocationSet(location(1, 0, 1, 5)))
      );
      let merged = slice1.merge(slice2);
      expect(merged.cellSlices[0].cell.executionEventId).toBe('1');
      expect(merged.cellSlices[1].cell.executionEventId).toBe('2');
    });

    it('will not include the same locations from the same cell twice', () => {
      let slice1 = slicedExecution(
        cellSlice(cell('1', 'a = 1'), new LocationSet(location(1, 0, 1, 5)))
      );
      let slice2 = slicedExecution(
        cellSlice(cell('1', 'a = 1'), new LocationSet(location(1, 0, 1, 5)))
      );
      let merged = slice1.merge(slice2);
      expect(merged.cellSlices).toHaveLength(1);
      expect(merged.cellSlices[0].slice.size).toBe(1);
    });

    it(
      'considers two cells sharing ID and execution count but differing in execution event ' +
        'ID to be different',
      () => {
        let slice1 = slicedExecution(
          cellSlice(
            cell('1', 'a = 1', 1, 'id1'),
            new LocationSet(location(1, 0, 1, 5))
          )
        );
        let slice2 = slicedExecution(
          cellSlice(
            cell('2', 'a = 1', 1, 'id1'),
            new LocationSet(location(1, 0, 1, 5))
          )
        );
        let merged = slice1.merge(slice2);
        expect(merged.cellSlices.length).toBe(2);
      }
    );

    it('will include complementary ranges from two slices of the same cell', () => {
      let slice1 = slicedExecution(
        cellSlice(cell('1', 'a = 1'), new LocationSet(location(1, 0, 1, 5)))
      );
      let slice2 = slicedExecution(
        cellSlice(cell('1', 'a = 1'), new LocationSet(location(1, 0, 1, 4)))
      );
      let merged = slice1.merge(slice2);
      expect(merged.cellSlices).toHaveLength(1);
      expect(merged.cellSlices[0].slice.size).toBe(2);
      expect(merged.cellSlices[0].slice.items).toContainEqual(
        location(1, 0, 1, 5)
      );
      expect(merged.cellSlices[0].slice.items).toContainEqual(
        location(1, 0, 1, 4)
      );
    });

    it('reorders the cells in execution order', () => {
      let slice1 = slicedExecution(
        cellSlice(cell('2', 'a = 1', 2), new LocationSet(location(1, 0, 1, 5)))
      );
      let slice2 = slicedExecution(
        cellSlice(cell('1', 'a = 1', 1), new LocationSet(location(1, 0, 1, 4)))
      );
      let merged = slice1.merge(slice2);
      expect(merged.cellSlices[0].cell.executionCount).toBe(1);
      expect(merged.cellSlices[1].cell.executionCount).toBe(2);
    });

    it('can do an n-way merge with a bunch of cells', () => {
      let slice1 = slicedExecution(
        cellSlice(cell('1', 'a = 1'), new LocationSet(location(1, 0, 1, 5))),
        cellSlice(cell('2', 'b = 1'), new LocationSet(location(1, 0, 1, 5)))
      );
      let slice2 = slicedExecution(
        cellSlice(cell('3', 'c = 1'), new LocationSet(location(1, 0, 1, 5))),
        cellSlice(cell('4', 'd = 1'), new LocationSet(location(1, 0, 1, 5)))
      );
      let slice3 = slicedExecution(
        cellSlice(cell('5', 'e = 1'), new LocationSet(location(1, 0, 1, 5))),
        cellSlice(cell('6', 'f = 1'), new LocationSet(location(1, 0, 1, 5)))
      );
      let merged = slice1.merge(slice2, slice3);
      expect(merged.cellSlices).toHaveLength(6);
    });
  });
});
