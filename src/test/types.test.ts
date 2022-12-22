import { ControlFlowGraph } from "../control-flow";
import { Def, parse } from "../python-parser";

describe("TypeTesting", () => {
  it("tests types in code", () => {
    let ast = parse(["def foo(n):", "    bar: str = 'foobar'"].join("\n"));

    // console.log(ast);

    // expect(ast.code).toHaveLength(1);
    // expect(ast.code[0].type).toBe("def");
    // const cfg = new ControlFlowGraph(ast.code[0] as Def);
    // expect(cfg.blocks).toBeDefined();
    // expect(cfg.blocks).toHaveLength(6);
  });
});
