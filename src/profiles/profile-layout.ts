/**
 * Seções do perfil que o dono pode ordenar e ocultar.
 * Para criar uma seção nova, acrescente o id aqui e no front (profile-api.ts):
 * perfis já salvos recebem a seção nova no fim, visível.
 */
export const PROFILE_SECTIONS = ['clans', 'stats'] as const;
export type ProfileSectionId = (typeof PROFILE_SECTIONS)[number];
export type ProfileSection = { id: ProfileSectionId; visible: boolean };

/**
 * Deixa o layout sempre completo: ids desconhecidos ou repetidos saem,
 * seções que faltam entram no fim, visíveis. null = ordem padrão.
 */
export function normalizeLayout(
  layout: readonly { id: string; visible: boolean }[] | null | undefined,
): ProfileSection[] {
  const seen = new Set<string>();
  const result: ProfileSection[] = [];
  for (const item of layout ?? []) {
    if (!PROFILE_SECTIONS.includes(item.id as ProfileSectionId)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push({
      id: item.id as ProfileSectionId,
      visible: item.visible !== false,
    });
  }
  for (const id of PROFILE_SECTIONS) {
    if (!seen.has(id)) result.push({ id, visible: true });
  }
  return result;
}
