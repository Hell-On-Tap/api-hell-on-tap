/** Permissões que um cargo pode ter. O dono do clã sempre tem todas. */
export const CLAN_PERMISSIONS = [
  'invite', // convidar jogadores e cancelar convites
  'approve', // aprovar ou recusar pedidos de entrada
  'kick', // expulsar membros de cargos abaixo do seu
  'manage_roles', // criar/editar/ordenar/apagar cargos e trocar o cargo de membros abaixo do seu
  'edit_clan', // nome, tag, descrição, logo, banner e forma de entrada
] as const;

export type ClanPermission = (typeof CLAN_PERMISSIONS)[number];

/** Como novos jogadores entram: só convite, pedido aprovado pelo clã ou direto. */
export const JOIN_POLICIES = ['invite', 'request', 'open'] as const;
export type JoinPolicy = (typeof JOIN_POLICIES)[number];
