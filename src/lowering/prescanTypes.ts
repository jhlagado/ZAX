import type { EaExprNode, OpDeclNode, TypeExprNode, VarDeclNode } from '../frontend/ast.js';
import type { Callable } from './loweringTypes.js';

export interface PrescanResult {
  readonly localCallablesByFile: ReadonlyMap<string, ReadonlyMap<string, Callable>>;
  readonly visibleCallables: ReadonlyMap<string, Callable>;
  readonly localOpsByFile: ReadonlyMap<string, ReadonlyMap<string, OpDeclNode[]>>;
  readonly visibleOpsByName: ReadonlyMap<string, OpDeclNode[]>;
  readonly declaredOpNames: ReadonlySet<string>;
  readonly declaredBinNames: ReadonlySet<string>;
  readonly storageTypes: ReadonlyMap<string, TypeExprNode>;
  readonly moduleAliasTargets: ReadonlyMap<string, EaExprNode>;
  readonly moduleAliasDecls: ReadonlyMap<string, VarDeclNode>;
  readonly rawAddressSymbols: ReadonlySet<string>;
}
