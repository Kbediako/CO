import{r as e,j as t}from"./vendor-react-BpTY7yiE.js";import{d as r}from"./vendor-styled-DIClZvTp.js";import{u as o,B as s}from"./index-BLHSmbu2.js";import{u as a,g as n,S as i}from"./vendor-gsap-Dy24hvDL.js";import"./vendor-three-vk0p53NZ.js";n.registerPlugin(i);const l=e.forwardRef(({isCoverCompleted:r},l)=>{const f=e.useRef(null),g=e.useRef(null),m=e.useRef(null),p=e.useRef(null),{isMobileOrTablet:u}=o(),x=e.useCallback(()=>{if(!g.current||!m.current)return;const e=()=>{const e=g.current.querySelectorAll("path"),t=m.current.querySelectorAll("path");return!![...e,...t].every(e=>e.getTotalLength()>0)&&(e.forEach((e,t)=>{const r=g.current.clientHeight/732,o=e.getTotalLength()*r;e.style.strokeDasharray=o,e.style.strokeDashoffset=o}),t.forEach((e,t)=>{const r=g.current.clientHeight/732,o=e.getTotalLength()*r;e.style.strokeDasharray=o,e.style.strokeDashoffset=o}),!0)};e()||setTimeout(e,100)},[u]);return e.useLayoutEffect(()=>{x()},[x]),a(()=>{setTimeout(()=>{var e,t;const r=u?document.querySelector("#smooth-wrapper")||document.body:void 0,o=(null==(e=g.current)?void 0:e.querySelectorAll("path"))||[],s=(null==(t=m.current)?void 0:t.querySelectorAll("path"))||[];[...o,...s].every(e=>e.getTotalLength()>0)||x();const a=()=>{const e=u?.75:.6;o.forEach(t=>{n.to(t,{strokeDashoffset:0,duration:e,ease:"power1.out"})}),n.delayedCall(e,()=>{o.forEach(e=>{e.style.strokeDashoffset=0,e.style.strokeDasharray=0})})},l=()=>{const e=u?.75:.6;s.forEach(t=>{n.to(t,{strokeDashoffset:0,duration:e,ease:"power1.out"})}),n.delayedCall(e,()=>{s.forEach(e=>{e.style.strokeDashoffset=0,e.style.strokeDasharray=0})})},c=n.matchMedia();c.add("(min-width: 1025px)",()=>{i.create({trigger:u?f.current:p.current,start:u?`top+=${.3*window.innerHeight} bottom`:"bottom bottom",end:"bottom top",...r&&{scroller:r},once:!0,immediateRender:!1,invalidateOnRefresh:!0,onEnter:()=>{a(),l()}})}),c.add("(max-width: 1024px)",()=>{i.create({trigger:g.current,start:"60% bottom",end:"bottom top",...r&&{scroller:r},once:!0,immediateRender:!1,invalidateOnRefresh:!0,onEnter:()=>{a()}}),i.create({trigger:m.current,start:"60% bottom",end:"bottom top",...r&&{scroller:r},once:!0,immediateRender:!1,invalidateOnRefresh:!0,onEnter:()=>{l()}})})},2e3)},{scope:f,dependencies:[u]}),t.jsxs(h,{ref:f,children:[t.jsx(c,{className:"svg-share",ref:g,children:t.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 594 732",children:[t.jsx("path",{strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#fff",fill:"none",d:"m503,366H0"}),t.jsx("path",{strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#fff",fill:"none",d:"m198.97,90.1c0,35.4-28.72,64.1-64.15,64.1s-64.15-28.7-64.15-64.1S99.38,26,134.82,26s64.15,28.7,64.15,64.1Z"}),t.jsx("path",{strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#fff",fill:"none",d:"m198.97,641.9c0,35.4-28.72,64.1-64.15,64.1s-64.15-28.7-64.15-64.1,28.72-64.1,64.15-64.1,64.15,28.7,64.15,64.1Z"})]})}),t.jsxs(d,{ref:p,children:[t.jsx(s,{text:"We grow stronger and faster",theme:"black",enableScrollTrigger:!0}),t.jsx(s,{text:"when we share together",fill:"true",enableScrollTrigger:!0})]}),t.jsx(c,{className:"svg-x",ref:m,children:t.jsxs("svg",{id:"Layer_1","data-name":"Layer 1",xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 594 732",children:[t.jsx("path",{id:"line-top",strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#fff",d:"m6,6l581,581",fill:"none"}),t.jsx("path",{id:"line-bottom",strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#fff",d:"m6,726L588,144",fill:"none"})]})})]})});l.displayName="SvgUnit";const c=r.div`
  position: relative;
  width: 31vw;
  height: 38vw;
  &.svg-share {
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
  svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
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
  margin: var(--gap200) 0 0 !important;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 100px;
  @media (max-width: 1024px) {
    flex-direction: column;
    gap: var(--gap80);
    margin: 30dvh 0 0;
  }
`;export{l as default};
