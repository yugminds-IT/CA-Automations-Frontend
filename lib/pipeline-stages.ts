/** A stage with isActive omitted counts as on, so older responses still work. */
export function stageIsOn(stage: { isActive?: boolean }): boolean {
  return stage.isActive !== false;
}

/** Board columns: stages that are on, plus turned-off stages that still have leads in them. */
export function boardStages<T extends { id: number; isActive?: boolean }>(
  stages: T[],
  leads: ReadonlyArray<{ stageId: number }>,
): T[] {
  const used = new Set(leads.map((l) => l.stageId));
  return stages.filter((s) => stageIsOn(s) || used.has(s.id));
}

/** Dropdown choices: stages that are on, plus this lead's current stage when that one is off. */
export function stageOptions<T extends { id: number; isActive?: boolean }>(
  stages: T[],
  currentId?: number,
): T[] {
  return stages.filter((s) => stageIsOn(s) || s.id === currentId);
}
