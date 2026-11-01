export const title = 'Stream Machine demo: recipe preview';
export const state = v => ({disconnected:'Demo account disconnected', ready:'Demo account selected', preview:'Mock preview shown', unavailable:'Recipe unavailable'})[v.phase];
export const step = (a) => ({Connect:'select demo account', Preview:'preview available recipe', Unavailable:'choose unavailable recipe', Return:'return to workspace', Reset:'reset demo'}[a] ?? a);
