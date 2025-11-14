import{r as e,j as i}from"./vendor-react-BpTY7yiE.js";import{g as t,S as s,u as a}from"./vendor-gsap-Dy24hvDL.js";import{d as n}from"./vendor-styled-DIClZvTp.js";import{a as l,B as r,t as d}from"./index-BLHSmbu2.js";import{u as c}from"./useCountingAnimation-CklN8GsU.js";import"./vendor-three-vk0p53NZ.js";t.registerPlugin(s,a);const o=n.div`
  width: 100vw;
  padding: 40dvh 32px 60dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 10dvh;
  @media (max-width: 1024px) {
    padding: var(--gap80) 0 var(--gap400);
    gap: var(--gap32);
  }
`,m=n.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  ${d.Header_Large}
  color: var(--text-color-black);
  z-index: 2;
  overflow: hidden;
  @media (max-width: 1024px) {
    justify-content: flex-start;
  }
`,x=n.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;

  text-align: center;
  z-index: 3;
  @media screen and (max-width: 1024px) {
    padding-top: var(--gap180) !important;
  }
`,p=n.div`
  position: relative;
`;n.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 53%;
  aspect-ratio: 4 / 3;
  background-color: #f4f4f4;
  transform: translate(70%, -70%);
  z-index: 3;
`,n.div`
  position: relative;
`,n.div`
  position: relative;
  display: inline-block;
`,n.div`
  position: relative;
  ${d.Hero_Count}
  padding: 0 16px;
  z-index: 0;
`;const f=n.div`
  ${d.Hero_Count}
  color: var(--text-color-black);
  padding: 0 16px;
  display: flex;
  align-items: flex-start;
  opacity: 0;

  @media (max-width: 1024px) {
    padding: 0 8px;
  }
`,h=n.div`
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
`;n.span`
  opacity: 1;
`;const g=n.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;n.span`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;const j=n.div``,v=({symbolRef:t,symbolContainerRef:s})=>{e.useRef();const{containerRef:a}=l({enableDeviceFiltering:!0}),{containerRef:n}=l({enableDeviceFiltering:!0}),{containerRef:d}=l({enableDeviceFiltering:!0}),{elementRef:v,tensDigitRef:u,onesDigitRef:y}=c(97,.7,!0,"0");return i.jsxs(o,{children:[i.jsx(p,{children:i.jsx(f,{ref:v,"data-start":!0,children:i.jsxs(g,{children:[i.jsx(h,{ref:u,className:"tens-digit"}),i.jsx(h,{ref:y})]})})}),i.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:"100%"},children:[i.jsx(r,{text:"awards",theme:"light",direction:"center",enableScrollTrigger:!0}),i.jsxs(x,{style:{paddingTop:"var(--gap400)",paddingBottom:"var(--gap300)",paddingLeft:"var(--grid-gap)",paddingRight:"var(--grid-gap)"},children:[i.jsxs("div",{ref:a,className:"is-pc",style:{display:"flex",flexDirection:"column",marginTop:"var(--gap24)"},children:[i.jsx(m,{className:"main-title",children:i.jsx(j,{className:"sub-title",children:"We named Korea’s leading brand studio,"})}),i.jsx(m,{className:"main-title",children:i.jsx(j,{className:"sub-title",children:"with 97 awards across disciplines for ideas"})}),i.jsx(m,{className:"main-title",children:i.jsx(j,{className:"sub-title",children:"that moved brands forward."})})]}),i.jsxs("div",{style:{display:"flex",flexDirection:"column",marginTop:"var(--gap24)",justifyContent:"flex-start",alignItems:"flex-start",width:"100%",padding:"0 "},className:"is-mobile",children:[i.jsxs("div",{ref:d,style:{display:"flex",flexDirection:"column",justifyContent:"flex-start",alignItems:"flex-start",width:"100%"},children:[i.jsx(m,{className:"main-title",children:i.jsx(j,{className:"sub-title",children:"We named Korea’s"})}),i.jsx(m,{className:"main-title",children:i.jsx(j,{className:"sub-title",children:"leading brand"})}),i.jsx(m,{className:"main-title",children:i.jsx(j,{className:"sub-title",children:"studio,"})})]}),i.jsx("div",{style:{height:"var(--gap24)"}}),i.jsxs("div",{style:{display:"flex",flexDirection:"column",justifyContent:"flex-start",alignItems:"flex-start",width:"100%"},ref:n,children:[i.jsx(m,{className:"main-title",children:i.jsx(j,{className:"sub-title",children:"with 97 awards "})}),i.jsx(m,{className:"main-title",children:i.jsx(j,{className:"sub-title",children:"across disciplines "})}),i.jsx(m,{className:"main-title",children:i.jsx(j,{className:"sub-title",children:"for ideas that"})}),i.jsx(m,{className:"main-title",children:i.jsx(j,{className:"sub-title",children:"moved brands "})}),i.jsx(m,{className:"main-title",children:i.jsx(j,{className:"sub-title",children:"forward."})})]})]}),i.jsx("div",{"data-end":!0,style:{height:3}})]})]})]})};export{v as default};
