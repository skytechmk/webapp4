import{r as c}from"./vendor-Bw8Oeg0g.js";const i=({onShareReceive:e})=>(c.useEffect(()=>{const t=new URLSearchParams(window.location.search),n=t.get("title"),o=t.get("text"),r=t.get("url");if(n||o||r){const a=[n,o,r].filter(Boolean).join(`
`);if(a){e(a);const s=window.location.pathname;window.history.replaceState({},"",s)}}},[e]),null);export{i as ShareTargetHandler};
