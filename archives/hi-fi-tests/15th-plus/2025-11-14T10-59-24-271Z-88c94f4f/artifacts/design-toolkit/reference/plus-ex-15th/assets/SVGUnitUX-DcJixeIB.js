import{r as e,j as t}from"./vendor-react-BpTY7yiE.js";import{d as r}from"./vendor-styled-DIClZvTp.js";import{u as o,B as s}from"./index-BLHSmbu2.js";import{u as n,g as i,S as a}from"./vendor-gsap-Dy24hvDL.js";import"./vendor-three-vk0p53NZ.js";i.registerPlugin(a);const l=e.forwardRef(({isCoverCompleted:r},l)=>{const m=e.useRef(null),g=e.useRef(null),f=e.useRef(null),u=e.useRef(null),{isMobileOrTablet:p}=o(),v=e.useCallback(()=>{if(!g.current||!f.current)return;const e=()=>{const e=g.current.querySelectorAll("path"),t=f.current.querySelectorAll("path");return!![...e,...t].every(e=>e.getTotalLength()>0)&&(e.forEach((e,t)=>{const r=g.current.clientHeight/732,o=e.getTotalLength()*r;e.style.strokeDasharray=o,e.style.strokeDashoffset=o}),t.forEach((e,t)=>{const r=g.current.clientHeight/732,o=e.getTotalLength()*r;e.style.strokeDasharray=o,e.style.strokeDashoffset=o}),!0)};e()||setTimeout(e,100)},[p]);return e.useLayoutEffect(()=>{v()},[v]),n(()=>{setTimeout(()=>{var e,t;const r=p?document.querySelector("#smooth-wrapper")||document.body:void 0,o=(null==(e=g.current)?void 0:e.querySelectorAll("path"))||[],s=(null==(t=f.current)?void 0:t.querySelectorAll("path"))||[];[...o,...s].every(e=>e.getTotalLength()>0)||v();const n=()=>{const e=p?.75:.6;o.forEach(t=>{i.to(t,{strokeDashoffset:0,duration:e,ease:"power1.out"})}),i.delayedCall(e,()=>{o.forEach(e=>{e.style.strokeDashoffset=0,e.style.strokeDasharray=0})})},l=()=>{const e=p?.75:.6;s.forEach(t=>{i.to(t,{strokeDashoffset:0,duration:e,ease:"power1.out"})}),i.delayedCall(e,()=>{s.forEach(e=>{e.style.strokeDashoffset=0,e.style.strokeDasharray=0})})},d=i.matchMedia();d.add("(min-width: 1025px)",()=>{a.create({trigger:p?m.current:u.current,start:p?`top+=${.3*window.innerHeight} bottom`:"bottom bottom",end:"bottom top",...r&&{scroller:r},once:!0,immediateRender:!1,invalidateOnRefresh:!0,onEnter:()=>{n(),l()},onEnterBack:()=>{}})}),d.add("(max-width: 1024px)",()=>{a.create({trigger:g.current,start:"60% bottom",end:"bottom top",...r&&{scroller:r},once:!0,immediateRender:!1,invalidateOnRefresh:!0,onEnter:()=>{n()}}),a.create({trigger:f.current,start:"60% bottom",end:"bottom top",...r&&{scroller:r},once:!0,immediateRender:!1,invalidateOnRefresh:!0,onEnter:()=>{l()}})})},2e3)},{scope:m,dependencies:[p]}),t.jsxs(h,{ref:m,children:[t.jsx(d,{ref:g,className:"svg-u",children:t.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 594 732",width:"594",height:"732",children:t.jsx("path",{strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#000",fill:"none",d:"m566.81.4v387.83c0,160.9-107.2,292.17-294.5,292.17-130.13,0-221.6-63.36-265.31-156"})})}),t.jsxs(c,{ref:u,children:[t.jsx(s,{text:"We solve for clarity not just looks",theme:"white",enableScrollTrigger:!0}),t.jsx(s,{text:"turning insight into intent",fill:"true",theme:"white",enableScrollTrigger:!0})]}),t.jsx(d,{className:"svg-x",ref:f,children:t.jsxs("svg",{id:"Layer_1","data-name":"Layer 1",xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 594 732",children:[t.jsx("path",{id:"line-top",strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#000",d:"m6,6l581,581",fill:"none"}),t.jsx("path",{id:"line-bottom",strokeWidth:"15",vectorEffect:"non-scaling-stroke",stroke:"#000",d:"m6,726L588,144",fill:"none"})]})})]})});l.displayName="SvgUnitUX";const d=r.div`
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
  &.svg-u {
    margin-left: -15px;

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
`,c=r.div`
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

  margin: 20dvh 0 35dvh;
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
