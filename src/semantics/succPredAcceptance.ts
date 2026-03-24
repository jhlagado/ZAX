import type { Diagnostic } from '../diagnostics/types.js';
import type { ProgramNode } from '../frontend/ast.js';
import type { CompileEnv } from './env.js';
import { diagAt } from './storageView.js';
import { runInstructionAcceptance } from './instructionAcceptance.js';
import type { InstructionValidator } from './instructionAcceptance.js';

const succPredValidator: InstructionValidator = {
  validateInstruction(item, _storage, helpers, diagnostics) {
    if ((item.head !== 'succ' && item.head !== 'pred') || item.operands.length !== 1) return;
    const operand = item.operands[0];
    if (operand?.kind !== 'Ea' || operand.explicitAddressOf) return;

    const typeExpr = helpers.resolveEaTypeExpr(operand.expr);
    const scalar = helpers.resolveScalarTypeForLd(operand.expr);
    if (!scalar) {
      const detail = typeExpr ? helpers.typeDisplay(typeExpr) : 'unknown';
      diagAt(diagnostics, item.span, `"${item.head}" requires scalar storage; got ${detail}.`);
      return;
    }
    if (scalar !== 'byte' && scalar !== 'word') {
      diagAt(diagnostics, item.span, `"${item.head}" only supports byte and word scalar paths in this slice.`);
    }
  },

  validateOpInstruction(item, _op, diagnostics) {
    if (
      (item.head === 'succ' || item.head === 'pred') &&
      item.operands.length === 1 &&
      item.operands[0]?.kind === 'Ea'
    ) {
      diagAt(
        diagnostics,
        item.span,
        `"${item.head}" typed-path forms are not supported inside ops in this slice.`,
      );
    }
  },
};

export function validateSuccPredAcceptance(
  program: ProgramNode,
  env: CompileEnv,
  diagnostics: Diagnostic[],
): void {
  runInstructionAcceptance(program, env, diagnostics, succPredValidator);
}
