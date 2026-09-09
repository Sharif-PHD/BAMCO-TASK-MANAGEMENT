/* Lightweight yellow chat stickers. User-managed workflow stickers live in Supabase. */
(()=>{'use strict';
const face=(mouth,eyes='<circle cx="38" cy="42" r="4"/><circle cx="62" cy="42" r="4"/>',extra='')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="43" fill="#FFD54A" stroke="#E3A600" stroke-width="3"/><g fill="#40351f" stroke="#40351f" stroke-linecap="round" stroke-linejoin="round">${eyes}${mouth}${extra}</g></svg>`;
const svg={
 smile:face('<path d="M31 58q19 23 38 0" fill="none" stroke-width="5"/>'),
 laugh:face('<path d="M27 57q23 32 46 0z" fill="#fff" stroke-width="4"/>','<path d="M31 39q7-8 14 0M55 39q7-8 14 0" fill="none" stroke-width="4"/>'),
 love:face('<path d="M28 62q22 20 44 0" fill="none" stroke-width="5"/>','<path d="M27 38c0-10 14-10 14 0 0-10 14-10 14 0-1 10-14 17-14 17S28 48 27 38M59 38c0-10 14-10 14 0 0-10 14-10 14 0-1 10-14 17-14 17S60 48 59 38" fill="#e84c5b" stroke="none"/>'),
 wow:face('<ellipse cx="50" cy="66" rx="10" ry="14" fill="#40351f" stroke="none"/>','<circle cx="36" cy="41" r="6"/><circle cx="64" cy="41" r="6"/>'),
 sad:face('<path d="M32 72q18-20 36 0" fill="none" stroke-width="5"/>','<circle cx="38" cy="43" r="4"/><circle cx="62" cy="43" r="4"/>','<path d="M70 52q8 10 0 17q-8-7 0-17" fill="#5aa7e8" stroke="none"/>'),
 wink:face('<path d="M31 61q19 21 38 0" fill="none" stroke-width="5"/>','<path d="M31 42h13" fill="none" stroke-width="4"/><circle cx="63" cy="42" r="4"/>')
};
window.BAMCO_DESKTOP_ASSETS=Object.fromEntries(Object.entries(svg).map(([k,v])=>['yellow_'+k,'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(v)]));
})();
