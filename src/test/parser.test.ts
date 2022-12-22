import * as py from '../python-parser';
import { parse, walk } from '../python-parser';

describe('python parser', () => {
  // The next two tests were because the lexer was confused about how to handle dots. It
  // couldn't read a dot followed by digits as a floating point number.
  it('can parse floats that have no digits before the dot', () => {
    parse('a = .2\n');
  });

  it('can also parse calls on objects', () => {
    parse('obj.prop\n');
  });

  it('can parse comments', () => {
    const tree = parse('#\n');
    expect(tree.code).toBeInstanceOf(Array);
    expect(tree.code.length).toBe(0);
  });

  it('can parse scientific notation', () => {
    parse('1e5\n');
  });

  it('can parse imaginary numbers', () => {
    parse('x = 12j\n');
  });

  it('can parse lambdas with keyword', () => {
    parse('f = (lambda document, **variety: document)\n');
  });

  it('parses a dictionary with a `comp_for`', () => {
    let mod = parse('{k: v for (k, v) in d.items()}\n');
    expect(mod).toBeDefined();
    let node = mod.code[0] as py.DictExpr;
    expect(node.entries.length).toBe(1);
    expect(node.comp_for).toBeDefined();
  });

  it('can parse line continuations', () => {
    parse(['a = b\\', '.func(1, 2)\\', '.func(3, 4)', ''].join('\n'));
  });

  it('produces the full location of a line for a call statement', () => {
    let node = parse(['obj.func()', ''].join('\n')).code[0];
    expect(node.location).toEqual({
      first_line: 1,
      first_column: 0,
      last_line: 1,
      last_column: 10,
    });
  });

  it('does not crash on correct code after parsing bad code', () => {
    expect(() => parse('print(1\n')).toThrow();
    expect(() => parse('a + 1\nb = a\n')).not.toThrow();
  });

  it('handles docstrings', () => {
    let node = parse(
      [
        'def foo():',
        '    """',
        '    this function',
        '    does nothing',
        '    """',
        '    pass\n',
      ].join('\n')
    );
    expect(node).toBeDefined();
    expect(node.code).toHaveLength(1);
    expect(node.code[0].type).toBe('def');
    const def = node.code[0] as py.Def;
    expect(def.code).toHaveLength(2);
    expect(def.code[0].type).toBe('literal');
    expect(def.code[1].type).toBe('pass');
    const docstring = def.code[0] as py.Literal;
    expect(docstring).toBeDefined();
    expect(docstring.type).toBe('literal');
  });

  describe('python 3.5 features', () => {
    it('can parse async def/await', () => {
      const mod = parse(['async def test():', '    await other()'].join('\n'));
      expect(mod.code[0].type).toBe('def');
      walk(mod);
    });

    it('can parse async for', () => {
      const mod = parse(['async for t in test():', '    other()'].join('\n'));
      expect(mod.code[0].type).toBe('for');
      walk(mod);
    });

    it('can parse async with', () => {
      const mod = parse(['async with test() as t:', '    other()'].join('\n'));
      expect(mod.code[0].type).toBe('with');
      walk(mod);
    });

    it('can parse matrix multiplication', () => {
      const mod = parse('a @ b');
      expect(mod.code[0].type).toBe('binop');
      walk(mod);
    });

    it('can parse in place matrix multiplication', () => {
      const mod = parse('a @= b');
      expect(mod.code[0].type).toBe('assign');
      walk(mod);
    });

    it.each([
      ['print(*[1], *[2], 3)', 'call'],
      ["dict(**{'x': 1}, y=2, **{'z': 3})", 'call'],
      ['*range(4), 4', 'tuple'],
      ['[*range(4), 4]', 'list'],
      ['{*range(4), 4}', 'set'],
      ["{'x': 1, **{'y': 2}}", 'dict'],
      ["{**{'y': 2}, 'x': 1}", 'dict'],
    ])('can parse unpacking generalizations', (code, type) => {
      const mod = parse(code);
      expect(mod.code[0].type).toBe(type);
      walk(mod);
    });
  });

  describe('Python 3.6 features', () => {
    it.each(['10_000_000.0', '0xCAFE_F00D', '0b_0011_1111_0100_1110'])(
      'can parse underscores in numeric literals',
      code => {
        const mod = parse(code);
        expect(mod.code[0].type).toBe('literal');
        walk(mod);
      }
    );
  });
});

describe('ast walker', () => {
  it("doesn't crash on try-execpt blocks", () => {
    let tree = parse(
      ['try:', '    pass', 'except:', '    pass', ''].join('\n')
    );
    walk(tree);
  });

  it("doesn't crash on with-statements", () => {
    let tree = parse(
      ['with sns.axes_style("white"):', '    pass', ''].join('\n')
    );
    walk(tree);
  });
});
