import{r as e,j as i}from"./vendor-react-BpTY7yiE.js";import{d as t}from"./vendor-styled-DIClZvTp.js";import{a as s,B as a,t as n}from"./index-BLHSmbu2.js";import{u as l}from"./useCountingAnimation-CklN8GsU.js";import"./vendor-gsap-Dy24hvDL.js";import"./vendor-three-vk0p53NZ.js";const r=t.div`
  width: 100vw;
  padding: 30dvh var(--gap104) 30dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap140);
  @media (max-width: 1024px) {
    position: relative;
    padding: var(--gap64) var(--gap8) 20dvh;
    gap: 0;
    z-index: 2;
  }
`,d=t.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  ${n.Header_Large}
  color: var(--text-color-white);
  z-index: 2;
  overflow: hidden;
`,c=t.div``,o=t.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  text-align: center;
  z-index: 3;
  padding-top: var(--gap400);
  @media (max-width: 1024px) {
    padding-top: var(--gap180);
    padding-bottom: 0;
  }
`,m=t.div`
  position: relative;
  @media (max-width: 1024px) {
    margin-bottom: var(--gap32);
  }
`;t.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 53%;
  aspect-ratio: 4 / 1;
  background-color: #f4f4f4;
  transform: translate(70%, -70%);
  z-index: 3;
`;const x=t.div`
  ${n.Hero_Count}
  color: var(--text-color-white);
  padding: 0 16px;
  display: flex;
  align-items: flex-start;
  opacity: 0;

  @media (max-width: 1024px) {
    padding: 0 8px;
  }
`,p=t.div`
  position: relative;
  display: inline-block;
  font-variation-settings: 'wght' 100;
  font-numeric: tabular-nums;
  min-width: 1ch;
  padding-right: 0.3rem;
  overflow: hidden;
  white-space: nowrap;

  &.tens-digit {
    text-align: right;
  }

  @media (max-width: 1024px) {
    min-width: 0.8ch;
  }
`;t.span``;const h=t.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;t.span`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;const f=({symbolRef:t,symbolContainerRef:n})=>{e.useRef();const{elementRef:f,tensDigitRef:j,onesDigitRef:g}=l(56,.7,!0,"1"),{containerRef:v}=s({enableDeviceFiltering:!0,needsRefresh:!0,id:"need-refresh-0"}),{containerRef:u}=s({enableDeviceFiltering:!0});return i.jsxs(r,{children:[i.jsx(m,{children:i.jsx(x,{ref:f,"data-start":!0,children:i.jsxs(h,{children:[i.jsx(p,{ref:j,className:"tens-digit"}),i.jsx(p,{ref:g})]})})}),i.jsx(a,{text:"projects",direction:"center",enableScrollTrigger:!0}),i.jsxs(o,{style:{},children:[i.jsxs("div",{ref:v,style:{display:"flex",flexDirection:"column",marginTop:"var(--gap24)"},"data-end":!0,className:"is-pc test-title-2",children:[i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"In the past five years,"})}),i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"we’ve led 56 projects across 20"})}),i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"industries from "})}),i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"fashion and finance to entertainment."})})]}),i.jsxs("div",{ref:u,style:{display:"flex",flexDirection:"column",marginTop:"var(--gap24)"},className:"is-mobile",children:[i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"In the past "})}),i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"five years,"})}),i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"we’ve led 56"})}),i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"projects across 20"})}),i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"industries"})}),i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"from fashion and"})}),i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"finance to"})}),i.jsx(d,{className:"main-title",children:i.jsx(c,{className:"sub-title",children:"entertainment."})})]})]})]})};export{f as default};
