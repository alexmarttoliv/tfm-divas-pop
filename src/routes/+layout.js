// Sem prerender o adapter-static gera apenas um 404.html vazio (SPA puro): o
// <head> é montado por JavaScript no navegador. Rastreadores de link — WhatsApp,
// LinkedIn, Slack, X — não executam JavaScript, então não veriam título, descrição
// nem imagem de preview. Com prerender o HTML já sai pronto do build.
export const prerender = true;
