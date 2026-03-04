import type { TypeDeclNode, UnionDeclNode } from './frontend/ast.js';
import type { CompileEnv } from './semantics/env.js';

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
  if (!imported) return true;
  return imported.has(qualifier);
}

export function resolveVisibleConst(name: string, file: string, env: CompileEnv): number | undefined {
  if (!canAccessQualifiedName(name, file, env)) return undefined;
  const qualifier = moduleQualifierOf(name);
  return qualifier ? env.visibleConsts?.get(name) : env.consts.get(name);
}

export function resolveVisibleEnum(name: string, file: string, env: CompileEnv): number | undefined {
  if (!canAccessQualifiedName(name, file, env)) return undefined;
  const qualifier = moduleQualifierOf(name);
  return qualifier ? env.visibleEnums?.get(name) : env.enums.get(name);
}

export function resolveVisibleType(
  name: string,
  file: string,
  env: CompileEnv,
): TypeDeclNode | UnionDeclNode | undefined {
  if (!canAccessQualifiedName(name, file, env)) return undefined;
  const qualifier = moduleQualifierOf(name);
  return qualifier ? env.visibleTypes?.get(name) : env.types.get(name);
}
