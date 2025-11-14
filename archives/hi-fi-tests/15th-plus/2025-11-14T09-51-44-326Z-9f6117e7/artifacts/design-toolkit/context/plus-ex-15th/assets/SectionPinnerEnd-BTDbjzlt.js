import{r as e,j as i}from"./vendor-react-BpTY7yiE.js";import{d as t}from"./vendor-styled-DIClZvTp.js";import{a as n,B as a,t as s}from"./index-BLHSmbu2.js";import"./vendor-gsap-Dy24hvDL.js";import"./vendor-three-vk0p53NZ.js";const l=()=>{const t=e.useRef(),{containerRef:s}=n({enableDeviceFiltering:!0}),{containerRef:l}=n({enableDeviceFiltering:!0});return i.jsx(r,{ref:t,className:"intro-container",children:i.jsxs(o,{className:"title-start",children:[i.jsxs("div",{style:{display:"flex",flexDirection:"column"},ref:s,className:"is-pc",children:[i.jsx(d,{children:i.jsx(c,{className:"sub-title",children:"Experience isn’t added to"})}),i.jsx(d,{children:i.jsx(c,{className:"sub-title",children:"a brand. Brand is built with"})}),i.jsx(d,{children:i.jsx(c,{className:"sub-title",children:"discipline and curiosity."})})]}),i.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",justifyContent:"center"},ref:l,className:"is-mobile",children:[i.jsx(d,{children:i.jsx(c,{className:"sub-title",children:"Experience isn’t"})}),i.jsx(d,{children:i.jsx(c,{className:"sub-title",children:"added to a brand, is"})}),i.jsx(d,{children:i.jsx(c,{className:"sub-title",children:"built with discipline "})}),i.jsx(d,{children:i.jsx(c,{className:"sub-title",children:"and curiosity. "})})]}),i.jsx("div",{"data-end":!0,children:i.jsx(a,{text:"BRAND EXPERIENCE",theme:"black",enableScrollTrigger:!0,size:"large"})})]})})},r=t.div`
  position: relative;
  width: 100vw;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  padding: 50dvh calc(var(--grid-gap) * 2) 60dvh 0;
  width: var(--grid-6);
  margin-left: auto;

  @media (min-width: 1025px) {
    min-width: max-content;
  }

  @media (max-width: 1024px) {
    padding: 28vw 8px 27vw;
    width: 100%;
    align-items: center;
    * {
      text-align: center;
    }
  }
  &::before {
    // position: absolute;
    // content: '';
    // top: 0;
    // left: 0;
    // width: 100%;
    // height: 30%;
    // background: linear-gradient(360deg, black, transparent);
    // z-index: 9999;
    // transform: translateY(50%);
    // z-index: -1;
  }
`,d=t.div`
  position: relative;
  display: flex;
  flex-direction: column;
  ${s.Header_Large}
  color: var(--text-color-white);
  z-index: 2;
  text-align: left;
  overflow: hidden;
  width: 100%;
  @media (max-width: 1024px) {
    text-align: center;
  }
`,c=t.div``,o=t.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  text-align: left;
  gap: var(--gap64);
  z-index: 3;

  @media (max-width: 1024px) {
    gap: var(--gap24);
    justify-content: center;
    align-items: center;
  }
`;t.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  padding-bottom: 100%;
  background-color: #f4f4f4;
  transform: translate(-50%, -50%);
`;export{l as default};
