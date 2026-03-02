import type {
  ExternFuncNode,
  FuncDeclNode,
} from '../frontend/ast.js';
import type { EmittedSourceSegment } from '../formats/types.js';

export type SectionKind = 'code' | 'data' | 'var';

export type PendingSymbol = {
  kind: 'label' | 'data' | 'var';
  name: string;
  section: SectionKind;
  offset: number;
  file?: string;
  line?: number;
  scope?: 'global' | 'local';
  size?: number;
};

export type SourceSegmentTag = Omit<EmittedSourceSegment, 'start' | 'end'>;

export type Callable =
  | { kind: 'func'; node: FuncDeclNode }
  | { kind: 'extern'; node: ExternFuncNode; targetLower: string };
