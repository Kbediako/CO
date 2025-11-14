import{r as e,j as i}from"./vendor-react-BpTY7yiE.js";import{g as t,S as s,u as l}from"./vendor-gsap-Dy24hvDL.js";import{d as a}from"./vendor-styled-DIClZvTp.js";import{a as n,B as r,t as d}from"./index-BLHSmbu2.js";import"./vendor-three-vk0p53NZ.js";t.registerPlugin(s,l);const c=a.div`
  width: 100vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 45dvh 6vw;
  @media (max-width: 1024px) {
    padding: 21vw 16px 58vw;
  }
`,o=a.div`
  position: relative;
  display: flex;
  flex-direction: column;
  ${d.Header_Large}
  color: var(--text-color-black);
  z-index: 2;
  text-align: center;
  overflow: hidden;
  width: 100%;
`,m=a.div``,x=a.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: 24px;
  text-align: center;
  z-index: 3;
  @media (max-width: 1024px) {
    gap: 0;
  }
`;a.div`
  position: relative;
  width: 100%;
  background-color: #f4f4f4;
`;const h=()=>{e.useRef(),e.useRef();const{containerRef:t}=n({enableDeviceFiltering:!0,start:"20% bottom"}),{containerRef:s}=n({enableDeviceFiltering:!0});return i.jsx(c,{children:i.jsxs(x,{children:[i.jsxs("div",{style:{display:"flex",flexDirection:"column"},ref:t,className:"is-pc",children:[i.jsx(o,{className:"main-title",children:i.jsx(m,{className:"sub-title",children:"Adapt with better tools, sharper"})}),i.jsx(o,{className:"main-title",children:i.jsx(m,{className:"sub-title",children:"thinking, and stronger intent."})})]}),i.jsxs("div",{style:{display:"flex",flexDirection:"column"},ref:s,className:"is-mobile",children:[i.jsx(o,{className:"main-title",children:i.jsx(m,{className:"sub-title",children:"Adapt with better "})}),i.jsx(o,{className:"main-title",children:i.jsx(m,{className:"sub-title",children:"tools, sharper"})})," ",i.jsx(o,{className:"main-title",children:i.jsx(m,{className:"sub-title",children:"thinking, and"})}),i.jsx(o,{className:"main-title",children:i.jsx(m,{className:"sub-title",children:"stronger intent."})})]}),i.jsx("div",{"data-end":!0,style:{marginTop:"var(--gap24)"},children:i.jsx(r,{text:"user EXPERIENCE",theme:"white",enableScrollTrigger:!0,size:"large"})})]})})};export{h as default};
