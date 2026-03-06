import type { TypeDeclNode, UnionDeclNode } from './frontend/ast.js';
import type { CompileEnv } from './semantics/env.js';

function resolveVisibleSymbol<T>(
  name: string,
  file: string,
  env: CompileEnv,
  localMap: ReadonlyMap<string, T> | undefined,
  visibleMap: ReadonlyMap<string, T> | undefined,
): T | undefined {
  if (!canAccessQualifiedName(name, file, env)) return undefined;
  const qualifier = moduleQualifierOf(name);
  return qualifier ? visibleMap?.get(name) : localMap?.get(name);
}

export function moduleQualifierOf(name: string): string | undefined {
  const dot = name.indexOf('.');
  if (dot <= 0) return undefined;
  return name.slice(0, dot);
}

export function canAccessQualifiedName(name: string, file: string, env: CompileEnv): boolean {
  const qualifier = moduleQualifierOf(name);
  if (!qualifier) return true;

  const currentModuleId = env.moduleIds?.get(file);
  if (currentModuleId === qualifier) return true;

  const imported = env.importedModuleIds?.get(file);
  if (!imported) return false;
  return imported.has(qualifier);
}

export function resolveVisibleConst(name: string, file: string, env: CompileEnv): number | undefined {
  return resolveVisibleSymbol(name, file, env, env.consts, env.visibleConsts);
}

export function resolveVisibleEnum(name: string, file: string, env: CompileEnv): number | undefined {
  // Preserve ordinary enum-member lookup (e.g. Mode.Value) before treating a
  // dotted name as a module-qualified export alias (e.g. dep.Mode.Value).
  const local = env.enums.get(name);
  if (local !== undefined) return local;
  return resolveVisibleSymbol(name, file, env, undefined, env.visibleEnums);
}

export function resolveVisibleType(
  name: string,
  file: string,
  env: CompileEnv,
): TypeDeclNode | UnionDeclNode | undefined {
  return resolveVisibleSymbol(name, file, env, env.types, env.visibleTypes);
}
