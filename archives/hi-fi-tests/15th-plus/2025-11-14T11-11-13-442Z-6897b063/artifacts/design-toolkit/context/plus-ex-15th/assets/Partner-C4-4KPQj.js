import{r,j as a}from"./vendor-react-BpTY7yiE.js";import{u as e,g as t,S as s}from"./vendor-gsap-Dy24hvDL.js";import{d as i}from"./vendor-styled-DIClZvTp.js";t.registerPlugin(s,e);const o=({symbolRef:t,symbolContainerRef:s})=>{const i=r.useRef();return r.useRef(),e(()=>{},{scope:i}),a.jsx(p,{children:Array.from({length:16},(r,e)=>a.jsx(n,{children:a.jsx("img",{src:`/assets/partner/partner-${e+1}.png`,alt:`partner ${e+1}`})},e))})},p=i.div`
  width: 100%;
  padding: var(--gap24) 32px var(--gap300);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--gap16);
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    padding: var(--gap24) 0 var(--gap120);
  }
`,n=i.div`
  position: relative;
  width: 100%;
  aspect-ratio: 452 / 300;
  background-color: var(--text-color-white);
  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;export{o as default};
