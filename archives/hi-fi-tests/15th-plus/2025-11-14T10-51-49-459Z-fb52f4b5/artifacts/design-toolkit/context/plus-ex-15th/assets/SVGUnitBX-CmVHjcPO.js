import{r as e,j as t}from"./vendor-react-BpTY7yiE.js";import{d as r}from"./vendor-styled-DIClZvTp.js";import{u as o,B as s}from"./index-BLHSmbu2.js";import{u as n,g as i,S as a}from"./vendor-gsap-Dy24hvDL.js";import"./vendor-three-vk0p53NZ.js";i.registerPlugin(a);const l=e.forwardRef(({isCoverCompleted:r},l)=>{const f=e.useRef(null),m=e.useRef(null),g=e.useRef(null),p=e.useRef(null),{isMobileOrTablet:u}=o(),v=e.useCallback(()=>{if(!m.current||!g.current)return;const e=()=>{const e=m.current.querySelectorAll("path"),t=g.current.querySelectorAll("path");return!![...e,...t].every(e=>e.getTotalLength()>0)&&(e.forEach((e,t)=>{const r=m.current.clientHeight/732,o=e.getTotalLength()*r;e.style.strokeDasharray=o,e.style.strokeDashoffset=o}),t.forEach((e,t)=>{const r=m.current.clientHeight/732,o=e.getTotalLength()*r;e.style.strokeDasharray=o,e.style.strokeDashoffset=o}),!0)};e()||setTimeout(e,100)},[u]);return e.useLayoutEffect(()=>{v()},[v]),n(()=>{setTimeout(()=>{var e,t;const r=(null==(e=m.current)?void 0:e.querySelectorAll("path"))||[],o=(null==(t=g.current)?void 0:t.querySelectorAll("path"))||[];[...r,...o].every(e=>e.getTotalLength()>0)||v();const s=u?document.querySelector("#smooth-wrapper")||document.body:void 0,n=()=>{const e=u?.75:.6;r.forEach(t=>{i.to(t,{strokeDashoffset:0,duration:e,ease:"power1.out"})}),i.delayedCall(e,()=>{r.forEach(e=>{e.style.strokeDashoffset=0,e.style.strokeDasharray=0})})},l=()=>{const e=u?.75:.6;o.forEach(t=>{i.to(t,{strokeDashoffset:0,duration:e,ease:"power1.out"})}),i.delayedCall(e,()=>{o.forEach(e=>{e.style.strokeDashoffset=0,e.style.strokeDasharray=0})})},c=i.matchMedia();c.add("(min-width: 1025px)",()=>{a.create({trigger:u?f.current:p.current,start:u?`top+=${.3*window.innerHeight} bottom`:"bottom bottom",end:"bottom top",...s&&{scroller:s},once:!0,immediateRender:!1,invalidateOnRefresh:!0,onEnter:()=>{n(),l()},onEnterBack:()=>{}})}),c.add("(max-width: 1024px)",()=>{a.create({trigger:m.current,start:"60% bottom",end:"bottom top",...s&&{scroller:s},immediateRender:!1,invalidateOnRefresh:!0,once:!0,onEnter:()=>{n()}}),a.create({trigger:g.current,start:"60% bottom",end:"bottom top",...s&&{scroller:s},immediateRender:!1,invalidateOnRefresh:!0,once:!0,onEnter:()=>{l()}})})},2e3)},{scope:f,dependencies:[u]}),t.jsxs(h,{ref:f,children:[t.jsx(c,{ref:m,className:"svg-b",children:t.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 594 732",width:"594",height:"732",children:[t.jsx("path",{strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#fff",fill:"none",d:"m0,363.5h375.41c89.09,0,151.59,81.79,151.59,171.19,0,58.01-22.88,104.61-61.97,137.9-38.14,32.34-93.43,50.41-157.31,50.41H0"}),t.jsx("path",{strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#fff",fill:"none",d:"m0,43h291.51c59.11,0,110.59,13.31,147.78,40.9,36.23,28.53,58.16,71.33,58.16,130.29,0,72.28-45.45,149.31-122.04,149.31H0"})]})}),t.jsxs(d,{ref:p,children:[t.jsx(s,{text:"We don't believe in forcing experience",theme:"black",enableScrollTrigger:!0}),t.jsx(s,{text:"JUST reveal it",fill:"true",enableScrollTrigger:!0})]}),t.jsx(c,{className:"svg-x",ref:g,children:t.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 594 732",width:"594",height:"732",children:[t.jsx("path",{id:"line-top",strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#fff",d:"m6,6l581,581",fill:"none"}),t.jsx("path",{id:"line-bottom",strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#fff",d:"m6,726L588,144",fill:"none"})]})})]})});l.displayName="SvgUnitBX";const c=r.div`
  position: relative;
  width: 31vw;
  height: 38vw;
  svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  &.svg-b {
    @media (max-width: 1024px) {
      margin-right: auto;
    }
  }
  &.svg-x {
    margin-right: -15px;

    @media (max-width: 1024px) {
      margin-left: auto;
    }
  }
  @media (max-width: 1024px) {
    width: 73vw;
    height: 100vw;
    svg path {
      stroke-width: 7px;
    }
  }
`,d=r.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  @media (max-width: 1024px) {
    gap: 12px;
  }
`,h=r.div`
  position: relative;
  width: 100%;
  height: 100%;
  margin-bottom: 35dvh;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 100px;
  margin-bottom: 35dvh;
  @media (max-width: 1024px) {
    flex-direction: column;
    gap: var(--gap80);
    margin: 30dvh 0 0;
  }
`;export{l as default};
