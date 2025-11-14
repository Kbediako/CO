const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ScrollContent-DPvp7E5w.js","assets/vendor-react-BpTY7yiE.js","assets/vendor-gsap-Dy24hvDL.js","assets/ContentScrollSection-JBEtU-hd.js","assets/vendor-styled-DIClZvTp.js","assets/vendor-three-vk0p53NZ.js","assets/BxOpener-C-1sEdiN.js","assets/BxManifesto-LC2kjhSz.js","assets/Background-BMTZx5LC.js","assets/BxScrollContent-Cyz0W071.js","assets/BxScrollContent2-BrIo-hDc.js","assets/ContentScrollSectionScroll-D8uQUkPN.js","assets/SectionPinnerEnd-BTDbjzlt.js","assets/UxOpener-CMLFjK6j.js","assets/UxManifesto-BMj5hNwc.js","assets/UxScrollContent-DAjyFlD_.js","assets/SectionFullEnd-uWt72Dv5.js","assets/ShareOpener-2BsMz8Fp.js","assets/ShareItem-DdEf1AoB.js","assets/ProjectManifesto-DjRbsrzh.js","assets/useCountingAnimation-CklN8GsU.js","assets/ShareScrollContent-BmiuQWTd.js","assets/ShareScrollContent2-Cc7smnU8.js","assets/ShareMenifesto-CqkENsVC.js","assets/Award-Pud2aKJh.js","assets/Footer-BEzq9NAu.js","assets/ProjectList-D1nTCRRx.js","assets/ProjectOpener-dzpilpOv.js","assets/AwardProjectManager-XR6mxsZn.js","assets/AwardOpener-DAq4ChoI.js","assets/KolonManifesto-lRT0mHvs.js","assets/EqlManifesto-CBVrsGlC.js","assets/GenAi-Bdq3FVuM.js","assets/ShareXManifesto-C1rTp8En.js","assets/AwardManifesto-z-w8AuYg.js","assets/ShareXPin-VxgyxJc_.js","assets/Logo-Cya_9J8z.js","assets/AwardClosure-kmzRfC4I.js","assets/Partner-C4-4KPQj.js","assets/Dorco-DCClOQBl.js","assets/HFashion-CIpxBtGM.js","assets/UxScrollContent2-CAiEhot6.js","assets/SVGUnit-DkqjgZZC.js","assets/SVGUnitBX-CmVHjcPO.js","assets/SVGUnitUX-DcJixeIB.js"])))=>i.map(i=>d[i]);
import{r as e,j as t,u as i,a as n,R as r,c as o}from"./vendor-react-BpTY7yiE.js";import{u as s,S as a,g as l,a as c,b as d}from"./vendor-gsap-Dy24hvDL.js";import{l as u,d as h}from"./vendor-styled-DIClZvTp.js";import{W as p,S as m,F as f,O as g,G as x,A as b,P as w,V as v,a as y,B as _,M as j,D as k,b as E,C}from"./vendor-three-vk0p53NZ.js";!function(){const e=document.createElement("link").relList;if(!(e&&e.supports&&e.supports("modulepreload"))){for(const e of document.querySelectorAll('link[rel="modulepreload"]'))t(e);new MutationObserver(e=>{for(const i of e)if("childList"===i.type)for(const e of i.addedNodes)"LINK"===e.tagName&&"modulepreload"===e.rel&&t(e)}).observe(document,{childList:!0,subtree:!0})}function t(e){if(e.ep)return;e.ep=!0;const t=function(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),"use-credentials"===e.crossOrigin?t.credentials="include":"anonymous"===e.crossOrigin?t.credentials="omit":t.credentials="same-origin",t}(e);fetch(e.href,t)}}();const R={},S=function(e,t,i){let n=Promise.resolve();if(t&&t.length>0){document.getElementsByTagName("link");const e=document.querySelector("meta[property=csp-nonce]"),i=(null==e?void 0:e.nonce)||(null==e?void 0:e.getAttribute("nonce"));n=Promise.allSettled(t.map(e=>{if((e=function(e){return"/"+e}(e))in R)return;R[e]=!0;const t=e.endsWith(".css"),n=t?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${e}"]${n}`))return;const r=document.createElement("link");return r.rel=t?"stylesheet":"modulepreload",t||(r.as="script"),r.crossOrigin="",r.href=e,i&&r.setAttribute("nonce",i),document.head.appendChild(r),t?new Promise((t,i)=>{r.addEventListener("load",t),r.addEventListener("error",()=>i(new Error(`Unable to preload CSS for ${e}`)))}):void 0}))}function r(e){const t=new Event("vite:preloadError",{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return n.then(t=>{for(const e of t||[])"rejected"===e.status&&r(e.reason);return e().catch(r)})};let O=class{constructor(){}static randomInt(e,t){return Math.floor(Math.random()*(t-e+1))+e}static toRadian(e){return e*Math.PI/180}static toDegree(e){return 180*e/Math.PI}static decimalPoint(e,t){return Number(e.toFixed(t))}};const T=(t={})=>{const{debug:i=!1,symbolRef:n=null}=t,r=e.useRef("dark");e.useRef(0);const o=e.useRef([]),l=e.useRef(null),c=e.useRef(null),d={"cover-hero":["cover","hero"],"dark-1":["heroVideo","intro","introManifesto","introClosure"],"light-1":["historyOpener","historyManifesto","image","scrollContent"],"dark-2":["bxOpener","bxManifesto","bxScrollContent","imageDorco","bxScrollContent2","newIntroManifesto","sectionPinnerEnd","newAward"],"light-2":["uxOpener","newAward","imageKolon","uxScrollContent2","imageMusinsa","uxScrollContent","newIntroManifesto2","sectionFullEnd","kolon"],"dark-3":["shareOpener","shareItem","shareMenifesto","shareScrollContent","newAward","shareXManifesto","imageGenAi","shareScrollContent2","newIntroManifesto3","shareSectionFull","logo","imageOsulloc","projectOpener","ProjectManifesto","projectList"],"light-3":["newAward","awardOpener","awardManifesto","awardProjectList","awardClosure","partner"],"dark-4":["newAward","footer"]},u=(e,t=!1)=>{if(n.current&&n.current.group1.material&&n.current.group1.material.color){const t="large"==document.body.dataset.size?.3:.6;"dark"===e?"none"!==document.body.dataset.size?n.current.modeBlack(t,"large"):(n.current.modeBlack(t,!0),n.current.resetMode("dark",t)):"none"!==document.body.dataset.size?n.current.modeWhite(t):(n.current.modeWhite(t,!0),n.current.resetMode("light",t))}};((t,i=150,n={})=>{const{enableOrientationChange:r=!0,immediate:o=!1}=n,s=e.useRef(null),a=e.useRef(t);e.useEffect(()=>{a.current=t},[t]);const l=e.useCallback(()=>{s.current&&clearTimeout(s.current),o&&a.current&&a.current(),s.current=setTimeout(()=>{a.current&&a.current()},i)},[i,o]);e.useEffect(()=>(window.addEventListener("resize",l),r&&window.addEventListener("orientationchange",l),()=>{window.removeEventListener("resize",l),r&&window.removeEventListener("orientationchange",l),s.current&&clearTimeout(s.current)}),[l,r]),e.useCallback(()=>{l()},[l])})(()=>{var e,t;if(!document.body.classList.contains("is-complete"))return;const i=(()=>{const e=window.scrollY||window.pageYOffset,t=document.querySelectorAll(".bg-dark");let i=!1;return t.forEach(t=>{const n=t.getBoundingClientRect(),r=n.top+e,o=n.bottom+e;e>=r-.15*window.innerHeight&&e<=o-.15*window.innerHeight&&(i=!0)}),i?"dark":"light"})();if(i!==r.current&&(r.current=i,document.body.dataset.theme=i),null==(e=a.getById("parallax-trigger"))||e.refresh(),(null==n?void 0:n.current)&&(null==(t=n.current.group1)?void 0:t.material)){const e=.1;"dark"===i?n.current.modeBlack(e,document.body.dataset.size):n.current.modeWhite(e,document.body.dataset.size)}setTimeout(()=>{a.getAll().forEach(e=>{const t=e.vars.id;(t&&t.startsWith("bg-tracker-")||t&&(t.includes("small-")||t.includes("large-")||t.includes("project-sections")))&&e.refresh()}),"large"==document.body.dataset.size?1==n.current.group1.material.visible&&n.current.hideObject(n.current.group1):"small"==document.body.dataset.size&&1==n.current.group2.material.visible&&n.current.hideObject(n.current.group2)},50)},300,{enableOrientationChange:!0,immediate:!1});const h=e=>{c.current&&clearTimeout(c.current),c.current=setTimeout(()=>{r.current!==e&&(document.body.dataset.theme=e,r.current=e,u(e)),c.current=null},50)},p=e=>{const t=d[e];t&&t.forEach(e=>{var t,i;null==(t=a.getById(`${e}-animation`))||t.refresh(),null==(i=a.getById(`${e}-image`))||i.refresh()})},m=()=>{var e;a.getAll().forEach(e=>{e.vars.id&&e.vars.id.startsWith("bg-tracker-")&&e.refresh()});const t=(null==(e=document.querySelector("[data-section]"))?void 0:e.getAttribute("data-section"))||"cover";let i=null;for(const[n,r]of Object.entries(d))if(r.includes(t)){i=n;break}i&&p(i)};return s(()=>(o.current.forEach(e=>{e&&e.kill&&e.kill()}),o.current=[],setTimeout(()=>{const e=document.querySelectorAll(".bg-dark"),t=document.querySelectorAll(".bg-light");a.create({trigger:'[data-section="sectionPinnerEnd"] .title-start',start:"top-=20% top",endTrigger:'[data-section="uxOpener"]',end:"bottom bottom",onEnter:()=>{u("light"),h("light")},onEnterBack:()=>{u("light"),h("light")},onToggle:e=>{e.isActive}}),a.create({trigger:'[data-section="kolon"]',start:"top top",end:"bottom bottom",onEnter:()=>{u("light"),h("light")},onEnterBack:()=>{u("light"),h("light")}}),e.forEach((e,t)=>{if(e&&e.offsetHeight>0){let i;2==t&&window.innerWidth<1025?document.querySelector(".light-last")&&(i=a.create({trigger:e,start:"top 85%",endTrigger:'[data-section="awardOpener"]',end:()=>"top 49%",refreshPriority:10,immediateRender:!0,invalidateOnRefresh:!0,fastScrollEnd:!0,id:`bg-tracker-dark-${t}`,onEnterBack:()=>{h("dark")},onToggle:e=>{if(e.isActive){h("dark"),["dark-1","dark-2","dark-3"].forEach(e=>{p(e)})}}})):i=1==t&&window.innerWidth<1025?a.create({trigger:e,start:"top 50%",end:"bottom 85%",refreshPriority:10,immediateRender:!0,invalidateOnRefresh:!0,fastScrollEnd:!0,id:`bg-tracker-dark-${t}`,onEnterBack:()=>{h("dark")},onToggle:e=>{if(e.isActive){h("dark"),["dark-1","dark-2","dark-3"].forEach(e=>{p(e)})}},onLeaveBack:()=>{h("light")}}):a.create({trigger:e,start:"top 85%",end:"bottom 85%",refreshPriority:10,immediateRender:!0,invalidateOnRefresh:!0,fastScrollEnd:!0,id:`bg-tracker-dark-${t}`,onEnterBack:()=>{h("dark")},onToggle:e=>{if(e.isActive){h("dark"),["dark-1","dark-2","dark-3"].forEach(e=>{p(e)})}}}),o.current.push(i)}}),window.innerWidth<1025&&a.create({trigger:'[data-section="uxOpener"]',start:"top 50%",end:"bottom 85%",refreshPriority:10,immediateRender:!0,invalidateOnRefresh:!0,fastScrollEnd:!0,onEnterBack:()=>{h("light")},onToggle:e=>{if(e.isActive){h("light"),["light-1","light-2"].forEach(e=>{p(e)})}},onLeaveBack:()=>{h("dark")}}),t.forEach((e,t)=>{if(e&&e.offsetHeight>0){let i;i=2==t&&window.innerWidth<1025?a.create({trigger:'[data-section="awardOpener"]',start:()=>"top 50%",endTrigger:e,end:"bottom 85%",refreshPriority:10,immediateRender:!0,invalidateOnRefresh:!0,fastScrollEnd:!0,id:`bg-tracker-light-${t}`,onEnterBack:()=>{h("light")},onToggle:e=>{if(e.isActive){h("light"),["light-1","light-2"].forEach(e=>{p(e)})}}}):0==t&&window.innerWidth<1025?a.create({trigger:e,start:"top 50%",end:"bottom 85%",refreshPriority:10,immediateRender:!0,invalidateOnRefresh:!0,fastScrollEnd:!0,id:`bg-tracker-light-${t}`,onEnterBack:()=>{h("light")},onToggle:e=>{if(e.isActive){h("light"),["light-1","light-2"].forEach(e=>{p(e)})}},onLeaveBack:()=>{h("dark")}}):a.create({trigger:e,start:"top 85%",end:"bottom 85%",refreshPriority:10,immediateRender:!0,invalidateOnRefresh:!0,fastScrollEnd:!0,id:`bg-tracker-light-${t}`,onEnterBack:()=>{h("light")},onToggle:e=>{if(e.isActive){h("light"),["light-1","light-2"].forEach(e=>{p(e)})}}}),o.current.push(i)}}),o.current.length>0?a.refresh():setTimeout(()=>{},200)},150),window.refreshDataSectionTriggers=m,()=>{o.current.forEach(e=>{e&&e.kill&&e.kill()}),o.current=[],l.current&&(clearTimeout(l.current),l.current=null),c.current&&(clearTimeout(c.current),c.current=null),window.refreshDataSectionTriggers===m&&delete window.refreshDataSectionTriggers}),[]),{currentTheme:r.current,refreshDataSectionTriggers:m}},A=()=>{const e="ontouchstart"in window,t=navigator.maxTouchPoints>0,i=navigator.msMaxTouchPoints>0,n=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;return e||t||i||n},L=()=>{const e=navigator.userAgent||navigator.vendor||window.opera,t=/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(e.toLowerCase()),i=window.innerWidth<=840,n=A()&&i;return t||n},N=()=>{const e=navigator.userAgent||navigator.vendor||window.opera,t=/ipad|android(?!.*mobile)|tablet/i.test(e.toLowerCase()),i=A()&&window.innerWidth>840&&window.innerWidth<=1024;return t||i},z=()=>L()?"mobile":N()?"tablet":"desktop",P=()=>{const e=navigator.userAgent;return{isChrome:/chrome|chromium|crios/i.test(e)&&!/edg/i.test(e),isFirefox:/firefox|fxios/i.test(e),isSafari:/safari/i.test(e)&&!/chrome|chromium|crios/i.test(e),isEdge:/edg/i.test(e),isIE:/msie|trident/i.test(e),isOpera:/opera|opr\//i.test(e),userAgent:e}},I=()=>{const e=navigator.userAgent;return{isWindows:/windows nt/i.test(e),isMacOS:/mac os x/i.test(e),isLinux:/linux/i.test(e)&&!/android/i.test(e),isAndroid:/android/i.test(e),isiOS:/iphone|ipad|ipod/i.test(e)}},B=()=>{const e=window.innerWidth;return e<480?"xs":e<840?"sm":e<1024?"md":e<1440?"lg":"xl"},M=()=>({isTouchDevice:A(),isMobileDevice:L(),isTabletDevice:N(),isDesktopDevice:!L()&&!N(),deviceType:z(),screenSize:B(),browser:P(),os:I(),viewport:{width:window.innerWidth,height:window.innerHeight}}),D=(t={})=>{const{enableResize:i=!0,debounceTime:n=150,enableBodyClass:r=!0}=t,[o,s]=e.useState(()=>M());let a=o.deviceType,l=o.isTouchDevice;const c=e.useCallback(()=>{const e=M();if(s(e),r&&"undefined"!=typeof document){const t=document.body;t.classList.remove("device-mobile","device-tablet","device-desktop"),t.classList.remove("touch-device","no-touch-device"),t.classList.remove("browser-chrome","browser-firefox","browser-safari","browser-edge"),t.classList.remove("os-windows","os-macos","os-linux","os-android","os-ios"),t.classList.add(`device-${e.deviceType}`),"tablet"===e.deviceType&&t.classList.add("device-mobile"),t.classList.add(e.isTouchDevice?"touch-device":"no-touch-device");const i=e.browser;i.isChrome&&t.classList.add("browser-chrome"),i.isFirefox&&t.classList.add("browser-firefox"),i.isSafari&&t.classList.add("browser-safari"),i.isEdge&&t.classList.add("browser-edge");const n=e.os;n.isWindows&&t.classList.add("os-windows"),n.isMacOS&&t.classList.add("os-macos"),n.isLinux&&t.classList.add("os-linux"),n.isAndroid&&t.classList.add("os-android"),n.isiOS&&t.classList.add("os-ios")}},[r]);e.useEffect(()=>{if(!i)return;let e;const t=()=>{clearTimeout(e),e=setTimeout(()=>{c(),r()},n)},r=()=>{const{deviceType:e,isTouchDevice:t}=M();(e!==a||t!==l)&&location.reload(),a=e,l=t};c(),window.addEventListener("resize",t),window.addEventListener("orientationchange",t);const o=window.matchMedia("(pointer: coarse)");return o.addEventListener("change",()=>{c(),r()}),()=>{window.removeEventListener("resize",t),window.removeEventListener("orientationchange",t),o.removeEventListener("change",()=>{c(),r()}),clearTimeout(e)}},[i,n,c]);const{isTouchDevice:d,isMobileDevice:u,isTabletDevice:h,isDesktopDevice:p,deviceType:m,screenSize:f,browser:g,os:x,viewport:b}=o;return{deviceInfo:o,isTouch:d,isMobile:u,isTablet:h,isDesktop:p,deviceType:m,screenSize:f,browser:g,os:x,viewport:b,refresh:c,isMobileOrTablet:u||h,isSmallScreen:"xs"===f||"sm"===f,isMediumScreen:"md"===f,isLargeScreen:"lg"===f||"xl"===f,isChrome:g.isChrome,isFirefox:g.isFirefox,isSafari:g.isSafari,isEdge:g.isEdge,isWindows:x.isWindows,isMacOS:x.isMacOS,isLinux:x.isLinux,isAndroid:x.isAndroid,isiOS:x.isiOS}};function H({children:i,wrapperClass:n,className:r,start:o="top top",end:s=0,target:a,id:c="sticky",enabled:d=!0,pinType:u="fixed",scroller:h}){const p=e.useRef(),m=e.useRef(),f=e.useRef(),{isMobileOrTablet:g}=D();return e.useEffect(()=>{if(!d||!p.current||!m.current)return;if(g)return;l.set(m.current,{clearProps:"all"}),m.current.querySelector(".sticky-image-container")&&l.set(m.current.querySelector(".sticky-image-container"),{scale:1.1}),l.delayedCall(.1,()=>{l.set(m.current,{clearProps:"all"})});const e=new class{constructor(e,t){this.image=e,this.index=t,this.init()}init(){l.set(this.image,{scale:1.1,transformOrigin:"50% -50%",force3D:!0,z:0,backfaceVisibility:"hidden"})}update(){const e=document.querySelector(".pin-spacer-imageOsulloc-scrub").getBoundingClientRect().top,t=window.innerHeight-e,i=this.easeMap(t,0,2.3*window.innerHeight,1.1,.85,"power1.inOut");l.set(this.image,{scale:i})}easeMap(e,t,i,n,r,o="power2.inOut"){const s=l.utils.normalize(t,i);return l.utils.interpolate(n,r)(l.parseEase(o)(l.utils.clamp(0,1,s(e))))}}(m.current.querySelector(".sticky-image-container"),0),t=l.timeline({scrollTrigger:{trigger:m.current.querySelector(".sticky-image-container"),start:`top-=${1.5*window.innerHeight}px bottom`,end:`bottom+=${2*window.innerHeight}px bottom`,invalidateOnRefresh:!0,immediateRender:!1,...h&&{scroller:h},onUpdate:t=>e.update()}});let i;return i=l.timeline({scrollTrigger:{id:c,pinType:g?"fixed":u,pinSpacing:!1,pinSpacer:p.current,trigger:m.current,scrub:!0,pinReparent:!0,pin:!0,anticipatePin:1,start:o,...h&&{scroller:h},onEnter:e=>{},end:()=>{if(!f.current||!m.current)return`+=${parseFloat(s)}`;const e=f.current.getBoundingClientRect(),t=m.current.getBoundingClientRect();return`+=${e.bottom-t.bottom+parseFloat(s)}`},invalidateOnRefresh:!0,toggleClass:{targets:m.current,className:"sticky-active"}}}),()=>{i&&i.kill(),t&&t.kill()}},[c,o,d,s,u,h]),e.useEffect(()=>{var e,t;if(a){const t=document.querySelector(a);f.current=t||((null==(e=p.current)?void 0:e.parentNode)||null)}else f.current=(null==(t=p.current)?void 0:t.parentNode)||null},[a]),t.jsxs("div",{ref:e=>{p.current=e},className:n,children:[t.jsx("div",{ref:e=>{m.current=e},className:r,children:i}),t.jsx("div",{className:"pin-spacer-imageOsulloc-scrub",style:{position:"absolute",top:0,left:0,width:"100%",height:"200%"}})]})}const F={English_etc_loading:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(4.2rem, 4vw, 8.2rem);
    font-style: normal;
    font-weight: 700;
    line-height: 90%;
    letter-spacing: -0.03em;
  `,Hero_Intro:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(8rem, 16vw, 30rem);
    padding-right: 0.03em;
    font-style: normal;
    font-weight: 700;
    line-height: 80%;
    letter-spacing: -0.03em;
  `,Hero_Count:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(40rem, 20.8vw, 40rem);
    font-style: normal;
    font-weight: 700;
    line-height: 80%;
    letter-spacing: -0.03em;
    @media (max-width: 1024px) {
      font-size: 53vw;
    }
  `,Hero:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(20rem, 16vw, 31rem);
    font-style: normal;
    font-weight: 700;
    line-height: 80%;
    letter-spacing: -0.03em;
    @media (max-width: 1024px) {
      font-size: 53vw;
    }
  `,Header_Huge:u`
    font-family: 'neue-haas-grotesk-text';
    font-size: clamp(6rem, 7.3vw, 14rem);
    font-style: normal;
    font-weight: 500;
    line-height: 90%;
    letter-spacing: -0.03em;
    text-transform: uppercase;
  `,Header_Large:u`
    font-family: 'neue-haas-grotesk-text';
    font-size: clamp(3rem, 2.6vw, 5rem);
    font-style: normal;
    font-weight: 500;
    line-height: 100%;
    text-transform: uppercase;
  `,Header_Medium:u`
    font-family: 'neue-haas-grotesk-text';
    font-size: clamp(2.8rem, 1.6vw, 3.2rem);
    font-style: normal;
    font-weight: 500;
    line-height: 120%;
    text-transform: uppercase;
  `,Header_Small:u`
    font-family: 'neue-haas-grotesk-text';
    font-size: clamp(1rem, 1.2vw, 2.4rem);
    font-style: normal;
    font-weight: 500;
    line-height: 110%;
  `,Body_Huge:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(2.8rem, 4.4vw, 8.6rem);
    font-style: normal;
    font-weight: 450;
    line-height: 110%;
  `,Body_Large:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(1.9rem, 2.5vw, 4.8rem);
    font-style: normal;
    font-weight: 450;
    line-height: 110%;
  `,Body_Medium:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(1.6rem, 1.6vw, 3.2rem);
    font-style: normal;
    font-weight: 450;
    line-height: 120%;
  `,Body_Small:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(1.6rem, 1.2vw, 2.4rem);
    font-style: normal;
    font-weight: 400;
    line-height: 120%;
  `,Caption_Medium:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(1.4rem, 1.4vw, 2rem);
    font-style: normal;
    font-weight: 400;
    line-height: 120%;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `,Caption_Medium_Bold:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(1.4rem, 1.4vw, 2rem);
    font-style: normal;
    font-weight: 500;
    line-height: 120%;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `,Caption_Small:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(1rem, 1.7vw, 1.8rem);
    font-style: normal;
    font-weight: 550;
    line-height: 100%;
    text-transform: uppercase;
    letter-spacing: 1px;
  `,Caption_Large:u`
    font-family: 'neue-haas-grotesk-display', sans-serif;
    font-size: clamp(1.4rem, 1.2vw, 2.4rem);
    font-style: normal;
    font-weight: 450;
    line-height: 120%;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `};l.registerPlugin(a,c);const V=()=>{const[t,i]=e.useState(!1),n=e.useRef(null),r=e.useRef(null),o=e.useRef(null),{isDesktop:s}=D(),c=()=>{const e=window.ScrollSmoother;s?(e.paused(!1),n.current&&(document.removeEventListener("wheel",n.current),n.current=null),o.current&&(document.removeEventListener("touchmove",o.current),o.current=null),r.current&&(document.removeEventListener("keydown",r.current),r.current=null),document.body.classList.remove("scroll-lock"),document.body.style.overflow="",document.documentElement.style.overflow="",i(!1),setTimeout(()=>{window.ScrollSmoother},100)):document.body.classList.remove("is-lock")},d=(e,t={})=>{const{smooth:i=!0,duration:n=1e3,offset:r=0,onComplete:o=null}=t;let s=0;if("number"==typeof e)s=e+r;else if("string"==typeof e){const t=document.querySelector(e);if(!t)return;s=t.offsetTop+r}else e&&void 0!==e.offsetTop&&(s=e.offsetTop+r);const a=window.ScrollSmoother;if(a)a.scrollTo(s,i,n/1e3),o&&setTimeout(o,n);else if(window.scrollTo({top:s,behavior:i?"smooth":"auto"}),o){const e=i?Math.min(n,1e3):0;setTimeout(o,e)}},u=(e,t={})=>{const{smooth:i=!1,duration:n=1e3,offset:r=0,onComplete:o=null}=t;if(!e)return;const s=a.isTouch;if(s)try{const t=e.getBoundingClientRect(),s=window.pageYOffset||document.documentElement.scrollTop,a=t.top+s+r;if(window.scrollTo({top:a,behavior:i?"smooth":"auto"}),o){const e=i?Math.min(n,800):0;setTimeout(o,e)}return}catch(h){}const c=window.ScrollSmoother;if(c&&!s)try{const t=c.paused();return t&&c.paused(!1),i?c.scrollTo(e,!0,n/1e3):c.scrollTo(e,!1,"auto"),void setTimeout(()=>{t&&c.paused(!0),o&&o()},n)}catch(h){}if(!s)try{return void l.to(window,{duration:i?n/1e3:0,scrollTo:{y:e,offsetY:r,autoKill:!1},ease:i?"power2.inOut":"none",onComplete:o})}catch(h){}const u=e.offsetTop+r;d(u,{smooth:i,duration:n,onComplete:o})};return e.useEffect(()=>()=>{t.current&&c()},[]),{lockScroll:()=>{if(t)return;const e=window.ScrollSmoother;s?(e.paused(!0),n.current=e=>!!e.target.closest("[data-debug-navigation]")||(e.preventDefault(),e.stopPropagation(),!1),r.current=e=>{"ArrowDown"!==e.key&&"ArrowUp"!==e.key&&"PageDown"!==e.key&&"PageUp"!==e.key&&" "!==e.key||e.preventDefault()},o.current=e=>!!e.target.closest("[data-debug-navigation]")||(e.preventDefault(),e.stopPropagation(),!1),document.addEventListener("wheel",n.current,{passive:!1}),document.addEventListener("touchmove",o.current,{passive:!1}),document.addEventListener("keydown",r.current),i(!0)):document.body.classList.add("is-lock")},unlockScroll:c,scrollTo:d,resetScroll:(e=0)=>{0===e&&(window.history.scrollRestoration="manual",history.scrollRestoration&&(history.scrollRestoration="manual"),a.clearScrollMemory("manual"),a.clearScrollMemory(),window.onbeforeunload=function(){window.scrollTo(0,0)},a.clearScrollMemory()),d(e,{smooth:!0})},scrollToElement:u,scrollToSection:(e,t={})=>{const i=document.querySelector(`[data-section="${e}"]`);if(!i)return;["sectionPinner","sectionPinnerEnd","scrollContent","sectionContentWithSymbol","sectionFull","sectionFullEnd","shareSectionFull"].includes(e)?setTimeout(()=>{u(i,t)},50):u(i,t)},isLocked:t.current}},U=e.forwardRef(({symbolRef:i,symbolContainerRef:n,onOutroComplete:r,onIntroComplete:o},s)=>{const c=e.useRef(),d=e.useRef(null),u=e.useRef(null),h=e.useRef(!1),p=e.useRef(!1),m=e.useRef(!1),f=e.useRef(!1),g=e.useRef(null),x=e.useRef(null);V();const b=window.innerWidth<1025,[w,v]=e.useState(0),[y,_]=e.useState(0),j=()=>{var e;if(c.current||p.current)return;if(!(null==(e=null==i?void 0:i.current)?void 0:e.group1))return;const t=document.querySelector('[data-section="cover"]');n.current&&l.set(n.current,{zIndex:10});const o=()=>{(null==i?void 0:i.current)&&(i.current.updatePartScale({group:i.current.group1,duration:0,length:3,thick:3}),document.body.dataset.effectFog="true",i.current.resetFog(0),l.killTweensOf(i.current.group1.position,"x,y,z"),l.killTweensOf(i.current.group1.rotation,"x,y,z"),i.current.camera&&l.killTweensOf(i.current.camera,"zoom"),i.current.group1.rotation.set(O.toRadian(-90),O.toRadian(-180),0),i.current.group2.visible=!0,window.innerWidth>1024?i.current.group2.position.set(-27,-10,-150):i.current.group2.position.set(-10,-10,-150),window.innerWidth<1025?i.current.updatePartScale({group:i.current.group2,duration:0,length:80,thick:5,kill:!0}):i.current.updatePartScale({group:i.current.group2,duration:0,length:150,thick:6.5,kill:!0}),i.current.group1.position.set(0,0,0),i.current.camera&&(i.current.camera.zoom=.3,i.current.camera.updateProjectionMatrix()),i.current.modeBlack(0,null),i.current.group1.info.arv.x=O.toRadian(.08),i.current.group1.info.arv.y=O.toRadian(.08),i.current.group1.info.arv.z=O.toRadian(.02),i.current.group2.info.arv.x=O.toRadian(.05),i.current.group2.info.arv.y=O.toRadian(.05),i.current.group2.info.arv.z=O.toRadian(.02)),l.set(n.current,{zIndex:-1,opacity:0})};c.current=l.context(()=>{const e=.17*window.innerHeight,n=.15*window.innerWidth;if(u.current&&(l.set(u.current.querySelectorAll(".main-titles"),{opacity:0}),l.set(u.current.querySelectorAll(".mo-main-titles"),{opacity:0,y:t=>0===t?e:-1*e}),l.set(u.current.querySelectorAll(".title-inner"),{marginLeft:e=>0===e?n:-1*n})),b){const e=l.timeline({onStart:()=>{R("1 모바일 인트로 시작 ")},onComplete:()=>{p.current=!0,r&&(document.body.classList.add("is-complete"),o(),l.set(t,{display:"none"}),r())}});d.current=e,e.addLabel("start"),e.set({},{onComplete:()=>{R("LB : mobile start")}}),e.addLabel("rotation_1"),e.set({},{onComplete:()=>{R("LB : mobile rotation_1")}});const n=`rotation_1+=${.1}`;e.to(i.current.group1.rotation,{duration:1.4,z:O.toRadian(0),ease:"expo.inOut",onStart:()=>{l.killTweensOf(i.current.scene.fog,"near,far"),l.to(i.current.scene.fog,{duration:1.4,ease:"expo.inOut",near:100,far:140,onComplete:()=>{l.set(i.current.scene.fog,{near:100,far:140})}}),i.current.updatePartScale({group:i.current.group1,duration:1.4,length:6.2,thick:.9,ease:"expo.inOut"})}},n),e.addLabel("rotation_2"),e.set({},{onComplete:()=>{R("LB : mobile rotation_2")}});const s=`rotation_2+=${0}`;e.to(i.current.group1.rotation,{duration:1.25,z:O.toRadian(225),ease:"expo.inOut"},s),e.addLabel("rotation_3"),e.set({},{onComplete:()=>{R("LB : mobile rotation_3")}}),e.addLabel("scale_up"),e.set({},{onComplete:()=>{R("LB : mobile scale_up")}});const a=`scale_up+=${0}`;e.to(i.current.group1.rotation,{duration:1.8,x:O.toRadian(45),y:O.toRadian(45),z:O.toRadian(-90),ease:"expo.inOut",onStart:()=>{i.current.updatePartScale({group:i.current.group1,duration:2,length:8.2,thick:.75,ease:"expo.inOut"})}},a),e.addLabel("text_intro"),e.set({},{onComplete:()=>{R("LB : mobile text_intro")}});const c=`scale_up+=${.83}`;e.to(".mo-main-titles",{opacity:1,duration:.5,ease:"expo.inOut"},c),e.add(()=>{l.to(".mo-main-titles",{y:0,duration:1.7,ease:"expo.out"})},`${c}-=0.1`),e.addLabel("scale_up");const u="text_intro-=0.3";e.to({},{duration:.1,onStart:()=>{l.to(i.current.group1.rotation,{duration:2.2,y:O.toRadian(-180),x:O.toRadian(-90),z:O.toRadian(90),ease:"expo.inOut"})}},u),e.to({},{duration:1.9,onStart:()=>{i.current.updatePartScale({group:i.current.group1,duration:2.5,length:15,thick:1.6,ease:"expo.inOut"}),i.current.camera&&l.to(i.current.camera,{zoom:13,duration:1.8,ease:"expo.inOut",delay:.5,onUpdate:()=>{i.current.camera&&i.current.camera.updateProjectionMatrix()}})},onComplete:()=>{}},u)}else{const e=l.timeline({onStart:()=>{R("1 인트로 시작 ")},onComplete:()=>{p.current=!0,r&&(document.body.classList.add("is-complete"),o(),l.set(t,{display:"none"}),r())}});d.current=e,e.addLabel("start"),e.set({},{onComplete:()=>{R("LB : start")}}),e.addLabel("rotation_1"),e.set({},{onComplete:()=>{R("LB : rotation_1")}});const n=`rotation_1+=${0}`;e.to(i.current.group1.rotation,{duration:1.4,z:O.toRadian(0),ease:"expo.inOut",onStart:()=>{l.killTweensOf(i.current.scene.fog,"near,far"),l.to(i.current.scene.fog,{duration:1.4,ease:"expo.inOut",near:100,far:140}),i.current.updatePartScale({group:i.current.group1,duration:1.4,length:6.2,thick:.9,ease:"expo.inOut"})}},n),e.addLabel("rotation_2"),e.set({},{onComplete:()=>{R("LB : rotation_2")}});const s=`rotation_2+=${0}`;e.to(i.current.group1.rotation,{duration:1.25,z:O.toRadian(225),ease:"expo.inOut"},s),e.addLabel("rotation_3"),e.set({},{onComplete:()=>{R("LB : rotation_3")}}),e.addLabel("scale_up"),e.set({},{onComplete:()=>{R("LB : scale_up")}});const a=`scale_up+=${0}`;e.to(i.current.group1.rotation,{duration:2,x:O.toRadian(45),y:O.toRadian(45),z:O.toRadian(-90),ease:"expo.inOut",onStart:()=>{i.current.updatePartScale({group:i.current.group1,duration:2,length:8.2,thick:.75,ease:"expo.inOut"})}},a),e.addLabel("text_intro"),e.set({},{onComplete:()=>{R("LB : text_intro")}});const c=`scale_up+=${.89}`;e.to(".main-titles",{opacity:1,duration:1,ease:"expo.out",delay:.17,onStart:()=>{}},c);const u=.055*window.innerWidth;e.add(()=>{l.to(".title-inner",{marginLeft:e=>0===e?u:-1*u,duration:3,ease:"expo.out"})},`${c}-=0.1`),e.addLabel("scale_up");const h="text_intro-=0.3";e.to({},{duration:.1,onStart:()=>{l.to(i.current.group1.rotation,{duration:2.2,y:O.toRadian(-180),x:O.toRadian(-90),z:O.toRadian(90),ease:"expo.inOut"})}},h),e.to({},{duration:1.9,onStart:()=>{i.current.updatePartScale({group:i.current.group1,duration:2.5,length:15,thick:1.6,ease:"expo.inOut"}),l.to(i.current.camera,{zoom:13,duration:1.8,ease:"expo.inOut",delay:.5,onUpdate:()=>{i.current.camera&&i.current.camera.updateProjectionMatrix()}})},onComplete:()=>{}},h)}},t)},k=e.useCallback(()=>{var e,t,n;h.current||p.current||(h.current=!0,(null==(e=null==i?void 0:i.current)?void 0:e.group1)&&(null==(n=null==(t=null==i?void 0:i.current)?void 0:t.group1)?void 0:n.info)?j():setTimeout(()=>{var e,t,n;(null==(e=null==i?void 0:i.current)?void 0:e.group1)&&(null==(n=null==(t=null==i?void 0:i.current)?void 0:t.group1)?void 0:n.info)&&j()},50))},[]),[E,C]=e.useState(""),R=e=>{const t=`[Cover] ${e}<br />${(new Date).getTime()}`;C(t);const i=document.querySelector("#debug");i&&(i.innerHTML+=`<br />${t}`)};return e.useEffect(()=>(l.registerPlugin(a),h.current=!1,p.current=!1,m.current=!1,f.current=!1,()=>{c.current&&c.current.revert()}),[]),e.useImperativeHandle(s,()=>({executeIntroAnimation:()=>{h.current||p.current||!(null==i?void 0:i.current)||k()},executeOutroAnimation:()=>{p.current&&!m.current&&!m.current&&f.current},skipIntroAnimation:()=>{d.current&&!p.current&&(p.current||(p.current=!0,R("인트로 스킵 완료"),r&&(document.querySelector('[data-section="cover"]'),r())))}}),[]),t.jsxs(X,{ref:u,children:[t.jsxs("div",{className:"is-pc",ref:g,children:[t.jsx(G,{className:"main-titles",children:t.jsx(Y,{className:"title-inner",style:{transformOrigin:"-100% 50% !important"},children:t.jsx("span",{className:"title-inner-text",children:"BEYOND DESIGN"})})}),t.jsx(G,{className:"main-titles",children:t.jsx(Y,{className:"title-inner",style:{transformOrigin:"0% 50% !important"},children:t.jsx("span",{className:"title-inner-text",children:"INTO EXPERIENCE"})})})]}),t.jsxs($,{className:"is-mobile",ref:x,children:[t.jsxs(W,{className:"mo-main-titles",children:[t.jsx(q,{className:"mo-title-inner",style:{width:"calc(100% + 1px)"},children:t.jsx("span",{className:"mo-title-inner-text",style:{paddingRight:10},children:"BEYOND"})}),t.jsx(q,{className:"mo-title-inner",style:{width:"calc(100% + 1px)"},children:t.jsx("span",{className:"mo-title-inner-text",style:{paddingRight:10},children:"DESIGN"})})]}),t.jsxs(W,{className:"mo-main-titles",children:[t.jsx(q,{className:"mo-title-inner",children:t.jsx("span",{className:"mo-title-inner-text",children:"INTO"})}),t.jsx(q,{className:"mo-title-inner",children:t.jsx("span",{className:"mo-title-inner-text",children:"EXPERI"})}),t.jsx(q,{className:"mo-title-inner",children:t.jsx("span",{className:"mo-title-inner-text",children:"ENCE"})})]})]})]})}),$=h.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 4vw 8vw;
  box-sizing: border-box;
  @media (max-width: 1024px) {
    padding: 4vw 0;
  }
`,W=h.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  opacity: 0;

  @media (max-width: 1024px) {
    display: block;
    padding: 0 4px;
  }
`,q=h.div`
  position: relative;
  display: flex;
  ${F.English_etc_loading};
  font-size: clamp(3.2rem, 3.125vw, 6rem);
  flex-direction: column;
  font-size: 23vw;
  letter-spacing: -0.03em;
  line-height: 1.2;
  overflow: hidden;
  width: 100%;
  text-align: center;
  line-height: 80%;
  padding: 0 4px;
  .title-inner-text {
    display: block;
    width: 100%;
    text-align: center;
    opacity: 0;
  }
`,X=h.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  z-index: 1000;
  pointer-events: none;
  background-color: #fff;
`,G=h.div`
  ${F.English_etc_loading}
  color: var(--text-color-black);
  opacity: 0;
  white-space: nowrap;
  z-index: 2;
  width: 50vw;
  box-sizing: border-box;
  will-change: transform;
  &:nth-of-type(1) {
    padding-right: 15vw;
    text-align: right;
  }
  &:nth-of-type(2) {
    padding-left: 15vw;
  }
`,Y=h.div`
  ${F.English_etc_loading}
  font-size: 4.2vw;
  width: 100%;
  will-change: transform;

  @media (max-width: 1024px) {
    font-size: 23vw;
    padding-left: 4px;
    padding-right: 4px;
  }
`;l.registerPlugin(a,s);const K=h.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: max-content;
  padding: 4px 14px;
  height: 27px;
  border-radius: 20px;
  overflow: hidden;
  opacity: 0;
  will-change: opacity, transform;
  backface-visibility: hidden;
  transform: translateZ(0);
  &.animate {
    opacity: 1;
    transition: opacity 0.4s var(--expoOut);
  }
  &.--small {
    padding: 3px 10px;
    height: 23px;
  }
  &.--large {
    padding: 4px 16px;
  }
  @media (max-width: 1024px) {
    padding: 2px 10px;
    height: 20px;
    &.--small {
      padding: 4px 8px;
      height: 20px;
    }
    &.--large {
      padding: 4px 8px;
      height: 20px;
      width: auto;
    }
  }
`,Z=h.div`
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  top: 0;
  left: 0;
  width: 100%;
  min-width: max-content;
  height: 100%;
  text-align: center;
  ${F.Caption_Medium};
  line-height: 110%;
  color: ${e=>"black"===e.theme?"var(--text-color-white)":"var(--text-color-black)"};
  filter: ${e=>"true"===e.$fill?"invert(1)":"none"};
  z-index: 2;
  transform: translateY(105%);
  will-change: transform;
  backface-visibility: hidden;

  .--small & {
    ${F.Caption_Small};
  }
  .--large & {
    ${F.Caption_Large};
  }
  font-weight: 500 !important;

  .animate & {
    transform: translateY(0%);
    transition: transform 0.6s var(--expoOut) 0.3s;
  }
`,J=h.div`
  position: relative;
  ${F.Caption_Medium};
  line-height: 110%;
  line-height: 90%;
  z-index: 2;
  opacity: 0;
  white-space: nowrap;
  .--small & {
    ${F.Caption_Small};
    line-height: 110%;
  }
  .--large & {
    ${F.Caption_Large};
    line-height: 110%;
  }
  font-weight: 500 !important;
`,Q=h.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 27px;
  height: 100%;
  margin: auto;
  background-color: ${e=>"black"===e.theme?"var(--text-color-white)":"var(--text-color-black)"};
  border-radius: 20px;
  z-index: 1;
  will-change: auto;
  transform: translate3d(0, 0, 0);
  .--small & {
    border-radius: 18px;
    width: 34px;
  }
  .--large & {
    border-radius: 22px;
    width: 45px;
  }
  will-change: auto;
  .animate & {
    width: 100%;
    transition:
      width 0.8s var(--expoOut),
      opacity 0.3s var(--expoOut);
  }
`,ee=h.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 27px;
  height: 100%;
  margin: auto;
  border-radius: 14px;
  will-change: auto;
  transform: translate3d(0, 0, 0);
  border: ${e=>"black"===e.theme?"1px solid var(--text-color-white)":"1px solid var(--text-color-black)"};
  backface-visibility: hidden;
  z-index: 3;
  will-change: auto;
  .--small & {
    border-radius: 18px;
    width: 34px;
  }
  .--large & {
    border-radius: 22px;
    width: 45px;
  }
  @media (max-width: 1024px) {
    border-width: 1px;
  }
  .animate & {
    width: 100%;
    transition: width 0.8s var(--expoOut);
  }
`,te=e.forwardRef(({text:i,theme:n="black",direction:r="center",enableScrollTrigger:o=!1,fill:s=!1,size:a="",sectionName:c="",className:d="",onClick:u,isCompleted:h=!1,gtmid:p=""},m)=>{const f=e.useRef(),g=e.useRef(!1),x=e.useRef(),b=e.useRef(),w=e.useRef(),v=e.useRef(),y=()=>{g.current||(g.current=!0,v.current=l.context(()=>{f.current.dataset.bind||(l.timeline({}),f.current.dataset.bind=!0,f.current.classList.add("animate"),x.current.classList.contains("--fill")||l.delayedCall(.25,()=>{x.current.style.opacity="0"}))},f))};e.useEffect(()=>{var e;if(!o||!f.current)return;const t=z(),i="mobile"===t?document.querySelector("#smooth-wrapper")||null:(null==(e=window.ScrollSmoother)?void 0:e.wrapper())||document.querySelector("#smooth-wrapper")||null,n=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting&&y()})},{root:i,rootMargin:"0px 0px 0px 0px",threshold:0});return n.observe(f.current),()=>{n.disconnect()}},[o]),e.useImperativeHandle(m,()=>({executeIntroAnimation:y,setCompleted:()=>{f.current&&(f.current.style.opacity="1"),w.current&&(w.current.style.width="100%"),x.current&&(x.current.style.width="100%",s||(x.current.style.opacity="0")),b.current&&(b.current.style.transform="translateY(0%) translateX(0%)",b.current.style.opacity="1")},get element(){return f.current}})),e.useEffect(()=>()=>{v.current&&(v.current.revert(),v.current=null)},[]);const _=f;return t.jsxs(K,{id:p,ref:_,theme:n,direction:r,className:`${"small"===a?"--small":""} ${"large"===a?"--large":""} ${d||""}`,onClick:u,style:{cursor:u?"pointer":"default",opacity:h?1:void 0},children:[t.jsx(ee,{ref:w,theme:n,style:{width:h?"100%":void 0}}),t.jsx(Q,{ref:x,theme:n,className:"true"===s?"--fill":"",style:{width:h?"100%":void 0,opacity:h&&!s?0:void 0}}),t.jsx(Z,{ref:b,theme:n,$fill:s,style:{transform:h?"translateY(0%) translateX(0%)":void 0},children:i}),t.jsx(J,{children:i})]})});te.displayName="Badge";const ie={v:"5.0.1",fr:100,ip:0,op:802,w:200,h:200,ddd:0,assets:[],layers:[{ind:7,nm:"Layer 7",ks:{p:{a:0,k:[244,56]},a:{a:0,k:[182.094,44.899,0]},s:{a:0,k:[18.828,18.828,100]},r:{a:0,k:0},o:{a:0,k:100}},ao:0,ip:0,op:802,st:0,bm:0,sr:1,ty:4,shapes:[]},{ind:6,nm:"Layer 6",ks:{p:{a:0,k:[176,66]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]},r:{a:0,k:0},o:{a:0,k:100}},ao:0,ip:0,op:802,st:0,bm:0,sr:1,ty:4,shapes:[]},{ind:5,nm:"Layer 5",ks:{p:{a:0,k:[100,100]},a:{a:0,k:[76,76,0]},s:{a:0,k:[100,100,100]},r:{a:0,k:0},o:{a:0,k:100}},ao:0,ip:0,op:802,st:0,bm:0,sr:1,ty:4,shapes:[{ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:{i:[[0,0],[41.974,0],[0,41.974],[-41.974,0],[0,-41.974]],o:[[0,41.974],[-41.974,0],[0,-41.974],[41.974,0],[0,0]],v:[[76,0],[0,76],[-76,0],[0,-76],[76,0]],c:!0},hd:!1}},{ty:"st",c:{a:0,k:[1,1,1,1]},o:{a:0,k:100},w:{a:0,k:15},lc:1,lj:1,ml:4,d:[{n:"d",nm:"dash",v:{a:0,k:380}},{n:"g",nm:"gap",v:{a:0,k:480}},{n:"o",nm:"offset",v:{a:0,k:380}}]},{ty:"tr",p:{a:0,k:[76,76]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:-90},o:{a:0,k:100},sk:{a:0,k:0},sa:{a:0,k:0}}],nm:"Object",hd:!1}]},{ind:4,nm:"Layer 4",ks:{p:{a:0,k:[100,100]},a:{a:0,k:[76,76,0]},s:{a:0,k:[100,100,100]},r:{a:1,k:[{t:601,s:[0],i:{x:[.833],y:[.833]},o:{x:[.167],y:[.167]},e:[360]},{t:801,s:[360]}]},o:{a:0,k:100}},ao:0,ip:0,op:802,st:0,bm:0,sr:1,ty:4,shapes:[{ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:{i:[[0,0],[41.974,0],[0,41.974],[-41.974,0],[0,-41.974]],o:[[0,41.974],[-41.974,0],[0,-41.974],[41.974,0],[0,0]],v:[[76,0],[0,76],[-76,0],[0,-76],[76,0]],c:!0},hd:!1}},{ty:"st",c:{a:0,k:[1,1,1,1]},o:{a:0,k:100},w:{a:0,k:15},lc:1,lj:1,ml:4,d:[{n:"d",nm:"dash",v:{a:0,k:380}},{n:"g",nm:"gap",v:{a:0,k:480}},{n:"o",nm:"offset",v:{a:1,k:[{t:601,s:[380],i:{x:[.582],y:[.992]},o:{x:[.42],y:[0]},e:[-477.96]},{t:801,s:[-477.96]}]}}]},{ty:"tr",p:{a:0,k:[76,76]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:-90},o:{a:0,k:100},sk:{a:0,k:0},sa:{a:0,k:0}}],nm:"Object",hd:!1}]},{ind:3,nm:"Layer 3",ks:{p:{a:0,k:[100,100]},a:{a:0,k:[76,76,0]},s:{a:0,k:[100,100,100]},r:{a:1,k:[{t:401,s:[0],i:{x:[.833],y:[.833]},o:{x:[.167],y:[.167]},e:[360]},{t:601,s:[360]}]},o:{a:0,k:100}},ao:0,ip:0,op:802,st:0,bm:0,sr:1,ty:4,shapes:[{ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:{i:[[0,0],[41.974,0],[0,41.974],[-41.974,0],[0,-41.974]],o:[[0,41.974],[-41.974,0],[0,-41.974],[41.974,0],[0,0]],v:[[76,0],[0,76],[-76,0],[0,-76],[76,0]],c:!0},hd:!1}},{ty:"st",c:{a:0,k:[1,1,1,1]},o:{a:0,k:100},w:{a:0,k:15},lc:1,lj:1,ml:4,d:[{n:"d",nm:"dash",v:{a:0,k:380}},{n:"g",nm:"gap",v:{a:0,k:480}},{n:"o",nm:"offset",v:{a:1,k:[{t:401,s:[380],i:{x:[.582],y:[.992]},o:{x:[.42],y:[0]},e:[-477.96]},{t:601,s:[-477.96]}]}}]},{ty:"tr",p:{a:0,k:[76,76]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:-90},o:{a:0,k:100},sk:{a:0,k:0},sa:{a:0,k:0}}],nm:"Object",hd:!1}]},{ind:2,nm:"Layer 2",ks:{p:{a:0,k:[100,100]},a:{a:0,k:[76,76,0]},s:{a:0,k:[100,100,100]},r:{a:1,k:[{t:200,s:[0],i:{x:[.833],y:[.833]},o:{x:[.167],y:[.167]},e:[360]},{t:400,s:[360]}]},o:{a:0,k:100}},ao:0,ip:0,op:802,st:0,bm:0,sr:1,ty:4,shapes:[{ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:{i:[[0,0],[41.974,0],[0,41.974],[-41.974,0],[0,-41.974]],o:[[0,41.974],[-41.974,0],[0,-41.974],[41.974,0],[0,0]],v:[[76,0],[0,76],[-76,0],[0,-76],[76,0]],c:!0},hd:!1}},{ty:"st",c:{a:0,k:[1,1,1,1]},o:{a:0,k:100},w:{a:0,k:15},lc:1,lj:1,ml:4,d:[{n:"d",nm:"dash",v:{a:0,k:380}},{n:"g",nm:"gap",v:{a:0,k:480}},{n:"o",nm:"offset",v:{a:1,k:[{t:200,s:[380],i:{x:[.582],y:[.992]},o:{x:[.42],y:[0]},e:[-477.96]},{t:400,s:[-477.96]}]}}]},{ty:"tr",p:{a:0,k:[76,76]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:-90},o:{a:0,k:100},sk:{a:0,k:0},sa:{a:0,k:0}}],nm:"Object",hd:!1}]},{ind:1,nm:"Layer 1",ks:{p:{a:0,k:[100,100]},a:{a:0,k:[76,76,0]},s:{a:0,k:[100,100,100]},r:{a:1,k:[{t:0,s:[0],i:{x:[.833],y:[.833]},o:{x:[.167],y:[.167]},e:[360]},{t:200,s:[360]}]},o:{a:0,k:100}},ao:0,ip:0,op:802,st:0,bm:0,sr:1,ty:4,shapes:[{ty:"gr",it:[{ty:"sh",d:1,ks:{a:0,k:{i:[[0,0],[41.974,0],[0,41.974],[-41.974,0],[0,-41.974]],o:[[0,41.974],[-41.974,0],[0,-41.974],[41.974,0],[0,0]],v:[[76,0],[0,76],[-76,0],[0,-76],[76,0]],c:!0},hd:!1}},{ty:"st",c:{a:0,k:[1,1,1,1]},o:{a:0,k:100},w:{a:0,k:15},lc:1,lj:1,ml:4,d:[{n:"d",nm:"dash",v:{a:0,k:380}},{n:"g",nm:"gap",v:{a:0,k:480}},{n:"o",nm:"offset",v:{a:1,k:[{t:0,s:[380],i:{x:[.582],y:[.992]},o:{x:[.42],y:[0]},e:[-477.96]},{t:200,s:[-477.96]}]}}]},{ty:"tr",p:{a:0,k:[76,76]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:-90},o:{a:0,k:100},sk:{a:0,k:0},sa:{a:0,k:0}}],nm:"Object",hd:!1}]}],markers:[]};l.registerPlugin(a);const ne=h.div`
  position: relative;
  width: 100%;
  height: max-content;
  display: flex;
  flex-direction: column;
  min-height: max-content;
  overflow: hidden;
  @media (max-width: 1024px) {
    height: 100%;
  }
`,re=h.div`
  display: flex;
  flex-direction: column;

  align-items: center;
  width: 100%;
`,oe=h.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`,se=h.div`
  position: relative;
  ${F.Hero_Intro}
  color: var(--text-color-white);
  white-space: nowrap;
  z-index: 2;

  font-optical-sizing: none;
  font-variation-settings: 'wght' 700;
  -webkit-text-stroke: 0.01px transparent;
  &.left {
    padding: 0 10px 0 0;
  }
  &.right {
    padding: 0 0 0 10px;
  }
  opacity: 0;
  will-change: auto;
  backface-visibility: visible;
  transform-style: flat;
  overflow: visible;
  &.animate {
    transform: translateX(0) !important;
    opacity: 1;
    transition:
      transform 2s var(--expoOut),
      opacity 0.9s var(--expoOut) 0.03s;

    @media screen and (max-width: 1024px) {
      transition:
        transform 1.4s var(--power4Out),
        opacity 1.6s var(--power4Out);
    }
  }
  &[data-load='true'] {
    will-change: unset;
  }
`,ae=h.div`
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  width: 50px;
  bottom: 0;
  height: 25%;
  z-index: 1;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  svg {
    object-fit: contain;
  }
  .icon-arrow {
    transform: translateY(-250%);
    opacity: 0;
  }
  @media (max-width: 1024px) {
    top: auto;
    bottom: 0px;
    height: 50px;
  }
`,le=h.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  margin: auto;
  width: 50px;
  height: 50px;
  @media (max-width: 1024px) {
    width: 28px;
    height: 28px;
  }
`,ce=h.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: translate(0px, -10%);
  will-change: auto;

  opacity: 0;
  > div {
    width: 100%;
    height: 100%;
  }
  @media (max-width: 1024px) {
    width: 150%;
    height: 150%;
    bottom: 0;
    right: 0;
    margin: auto;
    transform: translate(0px, 0%);
  }
`;h.div`
  opacity: 0;
  will-change: auto;
  // transform: translateX(20%);
  will-change: auto;
  // backface-visibility: hidden;
  // &[data-index='0'] {
  //   transform: translateX(160px);
  //   @media (max-width: 1024px) {
  //     transform: translateX(80px);
  //   }
  // }
  // &[data-index='1'] {
  //   transform: translateX(-160px);
  //   @media (max-width: 1024px) {
  //     transform: translateX(-80px);
  //   }
  // }
`,h.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 52px;
`;const de=h.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  flex: 1;
`,ue=e.forwardRef(({symbolRef:n,symbolContainerRef:r,unlockScroll:o,onIntroComplete:a},c)=>{const d=e.useRef(),u=e.useRef(!1),h=e.useRef(!1),p=e.useRef(!1),m=e.useRef(!1),f=e.useRef(null),g=e.useRef(),x=e.useRef(),b=e.useRef(),w=e.useRef(),v=e.useRef(),y=e.useRef(),_=e.useRef(),j=e.useRef(),k=e.useRef(),E=e.useRef(),{contextSafe:C}=s({scope:g}),R=e.useRef(null),S={animationData:ie,loop:10,autoplay:!0},{View:O}=i(S,R),T=C(()=>{if(u.current||h.current)return;u.current=!0;const e=g.current;d.current=l.context(()=>{const e=window.innerWidth>1024,t=e?x.current:b.current,i=l.utils.toArray(".main-title",t),n=e?[y.current,w.current]:[v.current],s=e?_.current:j.current,c=i.filter(e=>"0"===e.dataset.index),d=i.filter(e=>"1"===e.dataset.index);c.forEach((e,t)=>{e.style.transform=window.innerWidth>1024?`translateX(${.1*window.innerWidth}px)`:`translateX(${.17*window.innerWidth}px)`}),d.forEach((e,t)=>{e.style.transform=window.innerWidth>1024?`translateX(${-.1*window.innerWidth}px)`:`translateX(${-.15*window.innerWidth}px)`});document.body.dataset.theme="dark";c.forEach((e,t)=>{setTimeout(()=>{e.classList.add("animate")},170*t)}),setTimeout(()=>{d.forEach((e,i)=>{setTimeout(()=>{e.classList.add("animate"),l.delayedCall(1.2,()=>{e.dataset.load=!0}),i==d.length-1&&(n&&l.delayedCall(.2,()=>{n.forEach((e,i)=>{l.delayedCall(.2*i,()=>{if(e.executeIntroAnimation(),i==n.length-1){const e=E.current,i=k.current;l.delayedCall(.2,()=>{l.to(e,{opacity:1,duration:.6,ease:"expo.inOut"}),l.delayedCall(2.2,()=>{l.to(e,{opacity:0,duration:.6,ease:"expo.inOut",onComplete:()=>{var e;null==(e=R.current)||e.destroy(),h.current=!0,document.querySelector('[data-section="hero"]').style.zIndex=1,document.querySelector('[data-section="hero"]').dataset.load=!0,l.set(r.current,{opacity:1}),l.delayedCall(2,()=>{(()=>{const e=t==x.current?b.current:x.current,i=l.utils.toArray(".main-title",e),n=e==x.current?_.current:j.current,r=e==x.current?[w.current,y.current]:[v.current];i.forEach((e,t)=>{e.classList.add("animate")}),r&&r.forEach((e,t)=>{l.delayedCall(.1*t,()=>{e.setCompleted()})}),n.style.opacity=1,n.style.visibility="visible"})()}),a&&a()}}),l.delayedCall(.6,()=>{l.to(i,{opacity:1,duration:.4,ease:"expo.inOut"}),l.to(i,{y:0,duration:1.3,ease:"expo.out",onStart:()=>{l.delayedCall(.05,()=>{o()})}})})})})}})})}),s&&l.to(s,{autoAlpha:1,duration:.9,ease:"expo.out",delay:.3,onComplete:()=>{}}))},170*i)})},360)},e)});return e.useEffect(()=>(u.current=!1,h.current=!1,p.current=!1,m.current=!1,()=>{d.current&&d.current.revert(),f.current&&(f.current.kill(),f.current=null)}),[]),e.useEffect(()=>()=>{f.current&&(f.current.kill(),f.current=null)},[n]),e.useImperativeHandle(c,()=>({executeIntroAnimation:()=>{h.current||u.current||T()},executeOutroAnimation:()=>{h.current&&!p.current&&!p.current&&m.current}}),[]),t.jsxs(ne,{ref:g,children:[t.jsxs(re,{className:"is-pc",ref:x,children:[t.jsx(oe,{style:{justifyContent:"flex-start"},children:t.jsx(se,{className:"main-title","data-index":"0",style:{paddingRight:"3rem"},children:"BEYOND"})}),t.jsxs(oe,{children:[t.jsx(se,{className:"main-title","data-index":"0",children:"DESIGN"}),t.jsxs("div",{style:{display:"flex",flexDirection:"row",alignItems:"center",gap:"var(--gap24)",marginRight:"var(--grid-1)"},children:[t.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",minWidth:"143px"},children:t.jsx(te,{ref:w,text:"2020—2025",direction:"left",enableScrollTrigger:!1})}),t.jsx("div",{style:{width:"70px",height:"44px",opacity:0,visibility:"hidden"},ref:_,children:t.jsxs("svg",{width:"70",height:"44",viewBox:"0 0 70 44",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("path",{d:"M21.9997 36V8M8 21.9997L36 21.9997",stroke:"white",strokeWidth:"2"}),t.jsx("path",{d:"M38 34L61.9995 10M38.0005 10L62 34",stroke:"white",strokeWidth:"2"})]})})]})]}),t.jsxs(oe,{style:{justifyContent:"space-between",gap:"0",paddingLeft:"var(--grid-1)"},children:[t.jsx("div",{children:t.jsx(te,{text:"Last five years of plus x",theme:"black",enableScrollTrigger:!1,ref:y})}),t.jsx(se,{className:"main-title","data-index":"1",children:"INTO"})]}),t.jsx(oe,{style:{justifyContent:"flex-end"},children:t.jsx(se,{className:"main-title","data-index":"1",children:"EXPERIENCE"})})]}),t.jsxs(de,{className:"is-mobile",ref:b,style:{},children:[t.jsx("div",{style:{width:"70px",height:"44px",opacity:0,visibility:"hidden"},ref:j,children:t.jsxs("svg",{width:"70",height:"44",viewBox:"0 0 70 44",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("path",{d:"M21.9997 36V8M8 21.9997L36 21.9997",stroke:"white",strokeWidth:"2"}),t.jsx("path",{d:"M38 34L61.9995 10M38.0005 10L62 34",stroke:"white",strokeWidth:"2"})]})})," ",t.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",minWidth:"143px",marginTop:"4vw"},children:t.jsx(te,{ref:v,text:"2020—2025",direction:"left",enableScrollTrigger:!1})}),t.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"var(--gap40)",width:"100%",flex:2,justifyContent:"center"},children:t.jsxs(re,{children:[t.jsx(oe,{style:{justifyContent:"flex-start",width:"calc(100% + 10px)"},children:t.jsx(se,{className:"main-title","data-index":"0",style:{paddingRight:10},children:"BEYOND"})}),t.jsx(oe,{style:{width:"calc(100% + 10px)"},children:t.jsx(se,{className:"main-title","data-index":"0",children:"DESIGN"})}),t.jsx(oe,{style:{justifyContent:"flex-end",gap:"33px"},children:t.jsx(se,{className:"main-title","data-index":"1",style:{willChange:"unset",marginLeft:"-0.03rem"},children:"INTO"})}),t.jsx(oe,{style:{justifyContent:"flex-end"},children:t.jsx(se,{className:"main-title","data-index":"1",children:"EXPERI"})}),t.jsx(oe,{style:{justifyContent:"flex-end"},children:t.jsx(se,{className:"main-title","data-index":"1",children:"ENCE"})})]})})]}),t.jsx(ae,{children:t.jsxs(le,{children:[t.jsx(he,{ref:k,className:" icon-arrow",children:t.jsx("svg",{width:"48",height:"48",viewBox:"0 0 48 48",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:t.jsx("path",{d:"M10.5 19.5L24 31.9615L37.5 19.5",stroke:"white",strokeWidth:"3"})})}),t.jsx(ce,{className:"loading-layer",ref:E,children:O})]})})]})}),he=h.div`
  margin-top: -3px;
`;h.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: max-content;
  min-width: 80px;
  border: 2px solid var(--text-color-white);
  padding: 10px 16px;
  max-height: 48px;
  border-radius: 24px;
`,h.div`
  ${F.Caption_Small};
  color: var(--text-color-white);
`,l.registerPlugin(a);const pe=()=>{const i=e.useRef();e.useRef();const[r,o]=e.useState(!1),[s,c]=e.useState(!1),[d,u]=e.useState(!1),h=e.useRef(null),p=e.useRef(null),m=e.useRef(null),f=e.useRef(null),g=e.useRef(null),x=e.useRef(null);e.useRef(null);const b=e.useRef(null),w=e.useId(),v=e.useRef(!1),{isMobileOrTablet:y}=D(),{lockScroll:_,unlockScroll:j}=V(),k=async()=>{o(!0),_(),v.current=h.current&&!h.current.paused,h.current&&h.current.pause(),setTimeout(()=>{if(g.current&&x.current){l.set(g.current,{opacity:0,visibility:"visible",pointerEvents:"auto",display:"block"}),l.set(x.current,{scale:.9,opacity:0,transformOrigin:"center center"});l.timeline().to(g.current,{opacity:1,duration:.7,ease:"expo.inOut"}).to(x.current,{scale:1,opacity:1,duration:.7,ease:"expo.out"},"-=0.1"),setTimeout(async()=>{if(f.current)try{const e=f.current;e.playsInline=!0,e.setAttribute("webkit-playsinline","true"),e.setAttribute("playsinline","true"),await e.play()}catch(e){}},300)}},10)},E=()=>{const e=f.current?f.current.currentTime:0;if(g.current&&x.current){l.timeline({onComplete:()=>{o(!1),l.set(g.current,{pointerEvents:"none"}),setTimeout(()=>{j(),h.current&&(h.current.playsInline=!0,h.current.setAttribute("webkit-playsinline","true"),h.current.setAttribute("playsinline","true"),h.current.currentTime=e,v.current&&setTimeout(()=>{h.current.play().catch(e=>{})},50))},y?100:0)}}).to(x.current,{scale:.95,opacity:0,duration:.6,ease:"expo.out"}).to(g.current,{opacity:0,duration:.6,ease:"power2.inOut"},0)}else o(!1),setTimeout(()=>{j(),h.current&&(h.current.playsInline=!0,h.current.setAttribute("webkit-playsinline","true"),h.current.setAttribute("playsinline","true"),h.current.currentTime=e,v.current&&setTimeout(()=>{h.current.play().catch(e=>{})},50))},y?100:0);f.current&&(f.current.pause(),f.current.currentTime=0)};return e.useEffect(()=>{const e=e=>{"Escape"===e.key&&r&&E()};return r&&document.addEventListener("keydown",e),()=>{document.removeEventListener("keydown",e)}},[r]),e.useEffect(()=>{if(!h.current)return;const e=h.current;e.muted=!0,e.defaultMuted=!0,e.playsInline=!0,e.controls=!1,e.loop=!1,e.setAttribute("webkit-playsinline","true"),e.setAttribute("playsinline","true"),e.setAttribute("loop","true");const t=()=>{u(!0)},n=()=>{u(!0)};return e.addEventListener("loadeddata",t),e.addEventListener("canplaythrough",n),i.current=l.context(()=>{const e=y?document.querySelector("#smooth-wrapper")||document.body:void 0;b.current=a.create({trigger:h.current,start:"top 110%",end:"110% top",id:"heroVideo-playback",invalidateOnRefresh:!0,immediateRender:!1,...e&&{scroller:e},onToggle:e=>{h.current&&(e.isActive&&h.current.paused?(h.current.play(),h.current.classList.add("is-playing")):e.isActive||h.current.paused||(h.current.pause(),h.current.classList.remove("is-playing")))}})},h),()=>{b.current&&b.current.kill(),i.current&&i.current.revert(),e.removeEventListener("loadeddata",t),e.removeEventListener("canplaythrough",n)}},[]),t.jsxs(t.Fragment,{children:[t.jsx(me,{ref:p,children:t.jsxs(fe,{children:[t.jsxs(xe,{id:"videoPlay1",ref:m,onClick:e=>{k()},children:[t.jsx("video",{ref:h,muted:!0,playsInline:!0,autoPlay:!0,controls:!1,loop:!1,children:t.jsx("source",{src:"https://player.vimeo.com/progressive_redirect/playback/1112004149/rendition/720p/file.mp4?loc=external&signature=60b1b146490e640b59a01b63558e4bce4a18f34692b2cb64609f09ee82a39543",type:"video/mp4"})}),!d&&t.jsx(ge,{className:"video-poster",src:"/video/video-poster.jpg"}),t.jsx(we,{className:"button-video",children:t.jsxs("svg",{width:"140",height:"140",viewBox:"0 0 140 140",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("mask",{id:`mask${w}`,style:{maskType:"alpha"},maskUnits:"userSpaceOnUse",x:"48",y:"48",width:"44",height:"44",children:t.jsx("rect",{x:"48",y:"48",width:"44",height:"44",fill:"#D9D9D9"})}),t.jsx("g",{mask:`url(#mask${w})`,children:t.jsx("path",{d:"M61.2261 84.6666V55.3333L84.2737 69.9999L61.2261 84.6666Z",fill:"white",className:"play-icon"})})]})})]}),t.jsx(be,{children:t.jsx(te,{text:"Watch full video",direction:"center",enableScrollTrigger:!0,gtmid:"videoPlay2",onClick:e=>{k()}})})]})}),r&&n.createPortal(t.jsx(ve,{ref:g,onClick:E,children:t.jsxs(ye,{ref:x,onClick:e=>e.stopPropagation(),children:[t.jsx(_e,{ref:f,muted:!1,controls:!0,preload:"metadata",playsInline:!0,children:t.jsx("source",{src:"https://player.vimeo.com/progressive_redirect/playback/1112004174/rendition/720p/file.mp4?loc=external&signature=f7f83e8ea9a0c49bf80a98e68204cd9ea535c1d15aec91be8d310150cabd7958",type:"video/mp4"})}),t.jsx(je,{onClick:E,title:"닫기 (ESC)",children:t.jsxs("svg",{width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",children:[t.jsx("path",{d:"M18 6L6 18",stroke:"white",strokeWidth:"2",strokeLinecap:"round"}),t.jsx("path",{d:"M6 6L18 18",stroke:"white",strokeWidth:"2",strokeLinecap:"round"})]})})]})}),document.body)]})},me=h.div`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap80) var(--gap32);
  box-sizing: border-box;
  @media (max-width: 1024px) {
    margin-bottom: var(--gap120);
    // background-color: var(--text-color-black);
  }
`,fe=h.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`,ge=h.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 98%;
  height: 98%;
  object-fit: contain;
  z-index: -1;
`,xe=h.div`
  position: relative;
  width: var(--grid-8);
  aspect-ratio: 16 / 9;
  overflow: hidden;
  transform-origin: center center;
  will-change: transform;
  cursor: pointer;
  pointer-events: auto;
  * {
    pointer-events: none;
  }
  @media (max-width: 1024px) {
    overflow: visible;
  }

  @media (hover: hover) {
    &:hover {
      .play-icon {
        fill: var(--text-color-black);
        transition: fill 0.5s var(--expoOut);
      }
      .button-video::before {
        background-color: var(--text-color-white);
        transition: background-color 0.5s var(--expoOut);
      }
    }
  }

  transform: scale(1);
  &::before {
    position: absolute;
    content: '';
    width: 100%;
    height: 50%;

    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, #000 100%);
    z-index: 2;
    pointer-events: none;
  }
  @media (max-width: 1024px) {
    &::after {
      position: absolute;
      content: '';
      width: 100%;
      height: 50%;
      top: -3px;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, #000 100%);
      z-index: 2;
      pointer-events: none;
    }
  }
  video {
    position: absolute;
    top: 0;
    left: 0;
    right: -1px;
    margin: auto;
    width: 100%;
    height: 100%;
    object-fit: contain;
    will-change: transform;

    opacity: 0;
    pointer-events: none;
    backface-visibility: hidden;
    border-top: 1px solid var(--text-color-black);
    border-bottom: 1px solid var(--text-color-black);
    &.is-playing {
      opacity: 1;
      transition: opacity 0.5s ease;
    }
  }
  @media (max-width: 1024px) {
    width: 100vw;
    height: 100dvh;
    aspect-ratio: unset;
    margin-top: -4px;
    overflow: hidden;
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;

      &::before {
        position: absolute;
        content: '';
        width: 100%;
        height: 3px;
        top: 0;
        left: 0;
        // background-color: var(--text-color-black);
        background-color: pink;
        z-index: 10;
        pointer-events: none;
      }
    }
    .video-poster {
      width: 100vw;
      height: 100vh;
      object-fit: cover;
    }
  }
`,be=h.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 32px 0 64px;

  @media (max-width: 1024px) {
    padding: 16px 0 0;
  }
`;h.div`
  cursor: pointer;
  transform-origin: center;
`;const we=h.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  width: clamp(8rem, 7.3vw, 14rem);
  height: clamp(8rem, 7.3vw, 14rem);
  margin: auto;
  z-index: 2;
  svg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  &::before {
    position: absolute;
    top: 0;
    left: 0;
    content: '';
    width: 100%;
    height: 100%;
    background-color: var(--text-color-black);
    opacity: 0.6;
    z-index: -1;
    pointer-events: none;
    border-radius: 50%;
  }
`,ve=h.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
  display: none;
`,ye=h.div`
  position: relative;
  width: 100vw;
  height: 100dvh;
  cursor: default;
`,_e=h.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
`,je=h.button`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: rgba(255, 255, 255, 0.6);
    transform: scale(1.1);
  }

  svg {
    width: 24px;
    height: 24px;
  }

  @media (max-width: 1024px) {
    top: 15px;
    right: 15px;
    width: 45px;
    height: 45px;
  }
`;h.div`
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  text-align: center;
  opacity: 0;
  animation: fadeIn 0.5s ease 1s forwards;

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }

  @media (max-width: 1024px) {
    bottom: 20px;
    font-size: 12px;
  }
`,l.registerPlugin(a);const ke=(t={})=>{const{targetSelector:i=".sub-title",staggerDelay:n=150,animateClass:r="animate",start:o="top bottom",end:s="bottom top",scrub:l=!1,debug:c=!1,once:d=!0,customCallback:u=null,onEnter:h=null,onLeave:p=null,onEnterBack:m=null,onLeaveBack:f=null,enableDeviceFiltering:g=!1,isCoverComplete:x=!0,needsRefresh:b=!1,id:w="test-title"}=t,v=e.useRef();e.useRef(),D(),e.useEffect(()=>{const e=v.current;if(!e||!x)return;if(g){const t=window.innerWidth,i=t>=1025,n=t<=1024;if(e.classList.contains("is-pc")||e.classList.contains("is-mobile")){if(!(i&&e.classList.contains("is-pc")||n&&e.classList.contains("is-mobile")))return}}e.classList.add("stagger-animation");const t=window.innerWidth<1025?80:140,n=new IntersectionObserver(o=>{o.forEach(o=>{o.isIntersecting?(u?u(e):e.querySelectorAll(i).forEach((e,i)=>{setTimeout(()=>{e.classList.add(r)},i*t)}),null==h||h(e),d&&n.disconnect()):null==p||p(e)})},{threshold:(window.innerWidth,.3),rootMargin:"0px 0px 0% 0px"});return n.observe(e),()=>{n.disconnect()}},[i,n,r,o,s,l,c,d,u,h,p,m,f,g,x]);return{containerRef:v,triggerAnimation:()=>{if(v.current)if(u)u(v.current);else{v.current.querySelectorAll(i).forEach((e,t)=>{setTimeout(()=>{e.classList.add(r)},t*n)})}},resetAnimation:()=>{if(!v.current)return;v.current.querySelectorAll(i).forEach(e=>{e.classList.remove(r)})},refresh:()=>{a.refresh()}}};l.registerPlugin(a,s);const Ee=h.div`
  width: 100vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40dvh 0 40dvh;

  @media screen and (max-width: 1024px) {
    padding: 0;
  }
`,Ce=h.div`
  position: relative;
  ${F.Header_Large}
  line-height: 1.2;
  color: var(--text-color-white);
  white-space: nowrap;
  z-index: 2;
  overflow: hidden;
  text-transform: uppercase;
`,Re=h.div``,Se=h.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: var(--grid-11);
  gap: var(--gap40);
  justify-content: flex-end;
  min-width: max-content;
  z-index: 3;
  padding: 0 calc(var(--grid-gap) * 2);
  margin-left: auto;
  @media screen and (max-width: 1024px) {
    padding: 0 var(--grid-gap);
    margin-left: unset;
    width: 100%;
  }
`,Oe=h.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;h.div`
  position: relative;
  width: var(--grid-7);
  height: var(--grid-3);
  background-color: #f4f4f4;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 트리거 포인트 안정성을 위한 설정 */
  transform: translateZ(0);
  will-change: transform;
`;const Te=e.forwardRef(({symbolRef:i,symbolContainerRef:n,isCoverCompleted:r},o)=>{const a=e.useRef([]),l=e.useRef({}),c=e.useRef(),d=e.useRef();e.useRef();const{containerRef:u}=ke({enableDeviceFiltering:!0}),{containerRef:h}=ke({enableDeviceFiltering:!0}),{containerRef:p}=ke({enableDeviceFiltering:!0});return s(()=>{const e=()=>{var t,n,o,s,u;window.ScrollSmoother&&(null==r?void 0:r.current)&&c.current&&d.current?(null==(t=i.current)?void 0:t.material)&&(null==(n=i.current)?void 0:n.group)&&(null==(o=i.current)?void 0:o.part_1)&&(null==(s=i.current)?void 0:s.part_2)&&(null==(u=i.current)?void 0:u.part_3)?(a.current.forEach(e=>{e&&e.kill&&e.kill()}),a.current=[],Object.values(l.current).forEach(e=>{e&&e.kill&&e.kill()}),l.current={},l.current={}):setTimeout(e,100):setTimeout(e,200)};let t=!1;const n=setInterval(()=>{(null==r?void 0:r.current)&&!t&&(e(),t=!0,clearInterval(n))},100);return()=>{clearInterval(n)}},{scope:c}),t.jsx(Ee,{ref:c,children:t.jsx("div",{"data-start":!0,style:{width:"100%"},children:t.jsxs(Se,{children:[t.jsxs(Oe,{ref:u,className:"is-pc",children:[t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"Plus X Creative® pioneered the integration"})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"of brand experience. We have been introducing"})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"a design solution, unifies fragmented brand"})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"elements across various touch-points."})})]}),t.jsxs(Oe,{className:"is-mobile",children:[t.jsxs("div",{ref:h,children:[t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"Plus X Creative®"})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"pioneered the"})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"integration of"})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"brand experience."})})]}),t.jsx("div",{style:{height:"var(--gap40)"}}),t.jsxs("div",{ref:p,children:[t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"We have been"})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"introducing"})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"a design solution,"})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"unifies fragmented "})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"brand elements "})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"across various "})}),t.jsx(Ce,{children:t.jsx(Re,{className:"sub-title",children:"touch-points."})})]})]}),t.jsx(te,{text:"from 2010",direction:"center",enableScrollTrigger:!0})]})})})});Te.displayName="Intro",l.registerPlugin(a);const Ae=({symbolRef:i,symbolContainerRef:n,isCoverCompleted:r})=>{const o=e.useRef(),s=e.useRef([]),{isMobileOrTablet:c}=D(),d=e.useRef(),u=e.useRef(),h=e.useRef(),p=e.useRef(),m=()=>{const e=l.utils.toArray(".main-title",o.current);if(e.length<=0)return;const t=.5*window.innerHeight,i=e.map(e=>{const i=e.getBoundingClientRect(),n=i.top+i.height/2;return Math.abs(n-t)}),n=Math.min(...i),r=i.indexOf(n);e.forEach((e,t)=>{let i="";const o=e.clientHeight;i=n<=o&&t===r?"now":t<r?"prev":"next",e.dataset.state=i})};return e.useEffect(()=>{if(!r)return;return(()=>{var e;if(!o.current||!d.current)return;if(!(null==(e=i.current)?void 0:e.group1))return;n.current&&l.set(n.current,{willChange:"transform"}),Object.values(s.current).forEach(e=>{e&&e.kill&&e.kill()}),s.current={},c&&(document.querySelector("#smooth-wrapper")||document.body);const t=l.utils.toArray(".main-title",o.current);t.forEach(e=>{e.style.setProperty("--x","0"),e.style.transform="translateX(var(--x))"});const r=l.utils.toArray(".main-title",o.current);let u;u=c?a.create({trigger:o.current,start:`top-=${.5*window.innerHeight}px bottom`,end:`bottom+=${.5*window.innerHeight}px top`,id:"infoManifesto-scroll",invalidateOnRefresh:!0,immediateRender:!1,onUpdate:e=>{m()},onLeave:()=>{r.forEach(e=>{e.dataset.state="next"})},onLeaveBack:()=>{r.forEach(e=>{e.dataset.state="prev"})}}):a.create({trigger:o.current,start:`top-=${.5*window.innerHeight}px bottom`,end:`bottom+=${.5*window.innerHeight}px top`,id:"infoManifesto-scroll",invalidateOnRefresh:!0,immediateRender:!1,onUpdate:e=>{m();const i=6*e.progress;t.forEach((e,t)=>{e.style.setProperty("--x",.1*window.innerWidth+160+160*Math.cos(O.toRadian(35*t)+i+O.toRadian(-180))+"px")})},onLeave:()=>{r.forEach(e=>{e.dataset.state="next"})},onLeaveBack:()=>{r.forEach(e=>{e.dataset.state="prev"})}}),s.current={scrollAnimTrigger:u},a.refresh()})(),()=>{n.current&&l.set(n.current,{willChange:"auto"}),Object.values(s.current).forEach(e=>{e&&e.kill&&e.kill()}),s.current={}}},[r]),t.jsxs(Le,{ref:o,children:[t.jsx(Ne,{className:"is-row-container",children:t.jsx(Pe,{className:"not-mb",children:t.jsx(ze,{className:"main-title",children:"PLUS"})})}),t.jsx(Ne,{className:"is-row-container",ref:d,children:t.jsxs(Pe,{children:[t.jsx(ze,{className:"main-title",children:"Experience"}),t.jsxs(Pe,{className:"mb-align-right",children:[t.jsx(ze,{className:"main-title","data-start":!0,children:"Curiosity"}),t.jsx(ze,{className:"main-title",children:"Inquisitive"})]})]})}),t.jsx(Ne,{className:"is-row-container",ref:u,children:t.jsxs(Pe,{style:{},children:[t.jsx(ze,{className:"main-title",children:"Empathetic"}),t.jsx(ze,{className:"main-title",children:"Creatively"}),t.jsx(ze,{className:"main-title",children:"Rational"})]})}),t.jsx(Ne,{className:"is-row-container",ref:h,children:t.jsxs(Pe,{className:"not-mb",children:[t.jsxs(ze,{className:"main-title",children:["Long-",t.jsx("br",{className:"is-mobile"}),"lasting"]}),t.jsx(ze,{className:"main-title",children:"Optimal"}),t.jsx(ze,{className:"main-title mb-align-right",children:"Articulate"})]})}),t.jsx(Ne,{className:"is-row-container ",style:{justifyContent:"space-between"},ref:p,children:t.jsxs(Pe,{className:"last-column mb-align-right",style:{},children:[t.jsxs(ze,{className:"main-title check-trigger",children:[t.jsx("span",{className:"is-pc",children:"Consistency"}),t.jsxs("span",{className:"is-mobile",children:["Consis-",t.jsx("br",{}),"tency"]})]}),t.jsx(ze,{className:"main-title",children:"Intuitive"})]})})]})},Le=h.div`
  width: 100vw;
  display: flex;
  flex-direction: column;

  justify-content: space-between;
  padding: 0;
  gap: var(--gap64);
  padding-bottom: var(--gap300);
  @media (max-width: 1366px) {
    gap: 0;
    padding-bottom: 0;
    // text-align: center;
    width: 100%;
  }
  .device-mobile & {
    padding: 0 var(--grid-gap);
  }
`,Ne=h.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  width: max-content;

  div:first-of-type {
    // width: var(--grid-5);
  }
  div:last-of-type {
    // width: var(--grid-7);
    @media (max-width: 1024px) {
    }
  }
  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    width: 100% !important;
    margin-right: 0 !important;
    // div:first-of-type {
    //   width: 100% !important;
    //   padding-left: 0 !important;
    // }
    // div:last-of-type {
    //   width: 100% !important;
    //   padding-left: 0 !important;
    // }
  }

  .device-mobile & {
    .mb-align-right {
      align-items: flex-end !important;
      margin-bottom: 0 !important;
    }
  }
`,ze=h.div`
  ${F.Header_Huge}
  color: var(--text-color-white);
  white-space: nowrap;
  z-index: 2;
  color: #4d4d4d;
  @media (min-width: 1025px) {
    &.is-first {
      color: #4d4d4d !important;
    }
  }
  &[data-state='now'] {
    color: #fff;
  }
  &[data-state='prev'] {
    color: #4d4d4d;
    transition: color 0.8s var(--expoOut);
  }
  &[data-state='next'] {
    color: #4d4d4d;
    transition: color 0.8s var(--expoOut);
  }
  @media (max-width: 1024px) {
    font-size: clamp(13vw, 6.5vw, 12.6rem);
  }
  .device-mobile & {
    &.mb-align-right {
      margin-left: auto !important;
    }
  }
  &.check-trigger {
    @media (max-width: 1024px) {
      align-items: flex-end;
      justify-content: flex-end;
      // text-align: right;
      span {
        // justify-content: flex-end;
      }
      + .main-title {
        order: -1;
        // justify-content: flex-end;
        // text-align: right;
      }
    }
  }
  @media (max-width: 1024px) {
    width: max-content;
  }
`,Pe=h.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  z-index: 3;

  &.last-column {
    @media (max-width: 1024px) {
      order: -2;
      // align-items: flex-end;
      margin-right: 0;
    }
  }
  .device-mobile & {
    &.not-mb {
      margin-bottom: 0;
    }
  }
  @media (max-width: 1024px) {
    width: 100% !important;
    margin-left: 0 !important;
    padding-left: 0 !important;
    margin-bottom: var(--gap40);

    // align-items: center;
    // &.not-mb {
    //   margin-bottom: 0;
    // }

    // :last-of-type&.mb-align-right {
    //   width: max-content !important;

    //   text-align: left;
    //   // margin-left: auto !important;
    //   margin-right: 0 !important;
    // }

    // &.is-mobile {
    //   width: var(--grid-2) !important;
    //   margin-left: auto !important;
    //   padding: 0 var(--grid-gap) 0 var(--grid-gap) !important;
    // }
  }
`;l.registerPlugin(a);const Ie=e.forwardRef(({symbolRef:i,symbolContainerRef:n,isCoverCompleted:r},o)=>{const l=e.useRef();e.useRef();const{containerRef:c}=ke({enableDeviceFiltering:!0}),{containerRef:d}=ke({enableDeviceFiltering:!0}),{containerRef:u}=ke({enableDeviceFiltering:!0}),{containerRef:h}=ke({enableDeviceFiltering:!0});return s(()=>{const e=()=>{r&&i.current&&l.current&&i.current.group||setTimeout(e,100)};let t=!1;const n=setInterval(()=>{r&&!t&&(e(),t=!0,clearInterval(n))},100);return()=>{clearInterval(n),a.getAll().forEach(e=>{e.vars.trigger===l.current&&e.kill()})}},{scope:l}),t.jsxs(Be,{ref:l,children:[t.jsxs(He,{ref:c,className:"title-start is-pc",children:[t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"We always focus on"})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"designing every"})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"MOMENT OF CONTACT,"})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"DIGITAL OR PHYSICAL."})})]}),t.jsxs(He,{ref:d,className:"title-start is-pc",children:[t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"as an opportunity to"})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"express the brand's"})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"essence in a way that"})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"felt natural and"})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"consistent."})})]}),t.jsxs(He,{ref:u,className:"title-start is-mobile",children:[t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"we always focus on"})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"designing every"})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"moment of digital"})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"or physical."})})]}),t.jsxs(He,{ref:h,className:"title-start is-mobile",children:[t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"as an opportunity"})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"to express the "})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"brand’s essence in "})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"a way that felt natural "})}),t.jsx(Me,{children:t.jsx(De,{className:"sub-title",children:"and consistent."})})]}),t.jsx(te,{text:"15 years of plus x creatve",direction:"center",enableScrollTrigger:!0}),t.jsx("div",{className:"trigger-point",style:{height:2}})]})});Ie.displayName="IntroClosure";const Be=h.div`
  width: 100vw;
  // height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  width: 47vw;
  margin-left: auto;
  gap: var(--gap40);
  padding: 0 var(--grid-gap) var(--gap300) 0;
  @media screen and (max-width: 1366px) {
    padding: 40vw var(--grid-gap) var(--gap120);
    width: 100%;
  }
`,Me=h.div`
  position: relative;
  ${F.Header_Large}
  color: var(--text-color-white);
  z-index: 2;
  text-align: left;
  overflow: hidden;

  max-width: 100vw;
  @media (max-width: 1024px) {
    width: 100%;
    padding: 0;
  }
`,De=h.div``,He=h.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;
  z-index: 3;
`;h.div`
  position: relative;
  width: var(--grid-4);
  aspect-ratio: 4/3;
  background-color: #f4f4f4;
`;l.registerPlugin(a);const Fe=e.forwardRef(({symbolRef:i,symbolContainerRef:n,rows:r,theme:o="light",sectionName:s,animationConfig:c={},style:d={},badgeFirst:u,badgeSecond:h},p)=>{const m=e.useRef(),f=e.useRef(),g=e.useRef();V();const{isMobileOrTablet:x}=D(),b="undefined"!=typeof window&&window.innerWidth>=1441,w=e.useRef(null),v=e.useRef(!1),y=e.useRef([]),_=e.useRef(),j=e.useRef(),k=e.useRef(!1),E=()=>{k.current||(k.current=!0,window.dataLayer=window.dataLayer||[],window.dataLayer.push({event:"Section View",section_type:s.split("Opener")[0]}))};return e.useEffect(()=>{if(!m.current||v.current)return;const e=x?document.querySelector("#smooth-wrapper")||document.body:void 0;clearTimeout(w.current),w.current=setTimeout(()=>{(()=>{const t=window.innerWidth>1024?f:g,i=Array.from(t.current.querySelectorAll(".left")).filter(e=>!e.classList.contains("not-anim")),n=Array.from(t.current.querySelectorAll(".right")).filter(e=>!e.classList.contains("not-anim")),r=Array.from(f.current.querySelectorAll(".left")).filter(e=>!e.classList.contains("not-anim")),o=Array.from(f.current.querySelectorAll(".right")).filter(e=>!e.classList.contains("not-anim")),c=Array.from(g.current.querySelectorAll(".left")).filter(e=>!e.classList.contains("not-anim")),d=Array.from(g.current.querySelectorAll(".right")).filter(e=>!e.classList.contains("not-anim"));let u;if(r.forEach((e,t)=>{let i=0==t?16.4:9.4;e.style.willChange="transform",e.style.transform=`translateX(${i}vw)`}),o.forEach((e,t)=>{let i=0==t?23.5:14;e.style.transform=`translateX(-${i}vw)`,e.style.willChange="transform"}),c[0].classList.add("is-first"),d[0].classList.add("is-first"),u&&u.kill(),i.filter(e=>"true"!==e.dataset.noScrub),n.filter(e=>"true"!==e.dataset.noScrub),x)u=a.create({trigger:window.innerWidth>1024?r[0]:c[0],start:`top+=${window.innerWidth>1024?r[0].clientHeight:c[0].clientHeight} bottom`,once:!0,id:`${s}-scrub-trigger`,...e&&{scroller:e},onEnter:()=>{E(),window.innerWidth>1024?(r.forEach((e,t)=>{e.classList.add("animate")}),o.forEach((e,t)=>{e.classList.add("animate")})):(c.forEach((e,t)=>{e.classList.add("animate")}),d.forEach((e,t)=>{e.classList.add("animate")}))}});else{const t=r.filter(e=>"true"!==e.dataset.noScrub),i=o.filter(e=>"true"!==e.dataset.noScrub);u=l.timeline({scrollTrigger:{trigger:m.current,start:()=>"top bottom",endTrigger:m.current,end:()=>"+="+1.2*m.current.clientHeight,scrub:!0,id:`${s}-scrub-trigger`,immediateRender:!1,invalidateOnRefresh:!1,fastScrollEnd:!0,...e&&{scroller:e},onEnter:()=>{E(),window.innerWidth<1025&&(m.current.dataset.isScrubbing||m.current.querySelectorAll(".is-mobile .main-title").forEach((e,t)=>{e.classList.add("animate")})),l.delayedCall(.9,()=>{m.current.dataset.isScrubbing="true"})}}}),u.to(t,{x:0,force3D:!0,ease:"power1.out"},0),u.to(i,{x:0,force3D:!0,ease:"power1.out"},0)}})(),v.current=!0},50)},[m]),t.jsxs(Ve,{ref:m,style:d,children:[t.jsxs(Ue,{className:"layer is-pc",ref:f,children:[t.jsx(Ge,{ref:_,children:r.filter(e=>"left"===e.groupAlign).map((e,i)=>t.jsxs(We,{className:"left-group",style:{justifyContent:e.justifyContent||"space-between",...e.style},children:[e.words.map((n,r)=>t.jsxs(qe,{className:`main-title ${e.groupAlign} ${n.isNotAnim?"not-anim":""} ${n.viewportX?`viewportX-${n.viewportX}`:""}`,"data-align":n.align??1,"data-custom-align":n.customAlign??!1,"data-is-fixed":n.isFixed??!1,"data-no-scrub":n.noScrub??!1,$theme:o,children:[n.text,t.jsx(Xe,{className:"sub-title-inner --top "+(n.prefix?"prefix":""),$theme:o,"data-x":n.x??void 0,"data-y":"top","data-text":n.text,children:n.text})]},`${s}-left-group-${i}-${r}`)),e.badge&&Array.isArray(e.badge)?t.jsx("div",{className:"badge-container",style:e.badgeStyle,children:e.badge.map((e,n)=>t.jsx(te,{text:e,theme:"dark"===o?"black":"white",enableScrollTrigger:!0,ref:b?e=>y.current[i]=e:null},`${s}-badge-${n}`))}):null]},`${s}-left-group-${i}`))}),t.jsx(Ge,{ref:j,children:r.filter(e=>"right"===e.groupAlign).map((e,i)=>t.jsxs(We,{style:{justifyContent:e.justifyContent||"space-between",...e.style},children:[e.words.map((i,n)=>t.jsxs(qe,{className:`main-title ${e.groupAlign} ${i.isNotAnim?"not-anim":""} ${i.viewportX?`viewportX-${i.viewportX}`:""}`,"data-align":i.align??1,"data-custom-align":i.customAlign??!1,"data-is-fixed":i.isFixed??!1,"data-no-scrub":i.noScrub??!1,$theme:o,children:[i.text,t.jsx(Xe,{className:"sub-title-inner --top "+(i.prefix?"prefix":""),$theme:o,"data-x":i.x??void 0,"data-y":"top","data-text":i.text,children:i.text})]},n)),e.badge&&Array.isArray(e.badge)?t.jsx("div",{className:"badge-container",style:e.badgeStyle,children:e.badge.map((e,n)=>t.jsx(te,{text:e,theme:"dark"===o?"black":"white",enableScrollTrigger:!0,ref:b?e=>y.current[i]=e:null},`${s}-right-badge-${n}`))}):null]},`${s}-right-group-${i}`))})]}),t.jsx($e,{className:"layer is-mobile",ref:g,children:t.jsxs(t.Fragment,{children:[u&&t.jsx("div",{className:"badge-container",style:{marginBottom:"30vw"},children:t.jsx(te,{text:u,theme:"dark"===o?"black":"white",enableScrollTrigger:!0,ref:null})}),r.map((e,i)=>t.jsx(We,{className:"mobile-row",style:{justifyContent:e.justifyContent||"space-between",gap:e.gap?`${e.gap}px`:void 0},children:e.words.map((i,n)=>t.jsxs(qe,{className:`main-title ${e.groupAlign} ${i.isNotAnim?"not-anim":""}`,$theme:o,children:[i.text,t.jsx(Xe,{className:"sub-title-inner --top "+(i.prefix?"prefix":""),$theme:o,"data-x":i.x??void 0,"data-y":"top","data-text":i.text,children:i.text})]},n))},i)),h&&t.jsx("div",{className:"badge-container",style:{marginTop:"30vw"},children:t.jsx(te,{text:h,theme:"dark"===o?"black":"white",enableScrollTrigger:!0,ref:null})})]})})]})}),Ve=h.div`
  position: relative;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 64px 16px;

  @media (max-width: 1366px) {
    padding: var(--gap180) 16px;
    // min-height: dvh !important;
    justify-content: space-between;
  }
  .device-tablet & {
    padding: var(--gap180) 16px;
    // min-height: dvh !important;
    justify-content: space-between;
  }
`,Ue=h.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  will-change: transform;
  backface-visibility: hidden;
  transform: var(--scale) !important;
  transform-origin: center top;

  @media (max-width: 1366px) {
    display: none;
  }
`,$e=h.div`
  display: none;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  will-change: transform;
  backface-visibility: hidden;
  transform: var(--scale) !important;
  transform-origin: center top;

  @media (max-width: 1366px) {
    display: flex;
  }
`,We=h.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`,qe=h.div`
  position: relative;
  ${F.Hero_Intro}
  white-space: nowrap;
  overflow: hidden;
  z-index: 2;
  color: transparent;
  will-change: transform;

  &.left {
    // transform: translateX(500px);

    @media (max-width: 1366px) {
      &:not(.not-anim) {
        transform: translateX(24vw);
      }

      &.is-first {
        &:not(.not-anim) {
          transform: translateX(30vw);
        }
      }
    }
    &.not-anim {
      transform: none;
    }
  }
  &.right {
    // transform: translateX(-500px);
    // transform: translateX(
    //   calc(calc(calc(-100vw + 32px) + var(--margin) + 100%) * var(--align))
    // );

    @media (max-width: 1366px) {
      &:not(.not-anim) {
        transform: translateX(-28vw);
      }
      &.is-first {
        &:not(.not-anim) {
          transform: translateX(-37vw);
        }
      }
    }
    &.viewportX-center {
      // transform: translateX(calc(-50vw - 50%));
    }
  }
  @media (max-width: 1366px) {
    &.animate {
      transform: translateX(0) !important;
      transition: transform 0.85s var(--power2InOut);
    }
  }
  &[data-no-scrub='true'] {
    transform: none !important;
    will-change: unset;
  }
`,Xe=h.div`
  ${F.Hero_Intro}
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
  backface-visibility: hidden;

  transition: transform ${.8}s ${"var(--power4Out)"};

  color: ${e=>"dark"===e.$theme?"var(--text-color-white)":"var(--text-color-black)"};

  &.animate {
    transform: translateY(0%);
  }
`;h.div`
  ${F.Hero_Intro}
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
  backface-visibility: hidden;
  transition: transform ${.8}s ${"var(--power4Out)"};
  transform: translateY(0%);
  &.animate {
    transform: translateY(101%);
  }
  color: ${e=>"dark"===e.$theme?"var(--text-color-white)":"var(--text-color-black)"};
`;const Ge=h.div`
  display: flex;
  flex-direction: column;

  width: 100%;
`,Ye=e.forwardRef(({symbolRef:e,symbolContainerRef:i},n)=>{ke();const r=[{badgeFirst:"what keeps we moving is"},{badgeSecond:"the refusal to stand still"}],o=window.innerWidth>1024?[{justifyContent:"flex-start",words:[{text:"RE",isNotAnim:!0},{text:"BIRTH",y:"top"}],groupAlign:"left"},{words:[{text:"FROM",y:"top",align:.7,isFixed:!0}],groupAlign:"left",badge:["the refusal to stand still"],badgeStyle:{paddingRight:"var(--grid-1)"}},{justifyContent:"space-between",style:{flexDirection:"row-reverse"},gap:33,words:[{text:"THE",y:"top",align:.4,isFixed:!0}],badge:["what keeps we moving is"],badgeStyle:{paddingLeft:"var(--grid-1)"},groupAlign:"right"},{justifyContent:"flex-end",words:[{text:"EXPERIENCE",y:"top"}],groupAlign:"right"}]:[{justifyContent:"flex-start",words:[{text:"RE",isNotAnim:!0}],groupAlign:"left"},{justifyContent:"flex-start",words:[{text:"BIRTH",y:"top"}],groupAlign:"left"},{justifyContent:"flex-start",words:[{text:"FROM",y:"top"}],groupAlign:"left"},{justifyContent:"flex-end",words:[{text:"THE",y:"top"}],groupAlign:"right"},{justifyContent:"flex-end",words:[{text:"EXPERI",y:"top"}],groupAlign:"right"},{justifyContent:"flex-end",words:[{text:"ENCE",y:"top"}],groupAlign:"right"}];return t.jsx(t.Fragment,{children:t.jsx(Fe,{ref:n,symbolRef:e,symbolContainerRef:i,rows:o,theme:"light",sectionName:"historyOpener",badgeFirst:r[0].badgeFirst,badgeSecond:r[1].badgeSecond})})});function Ke(e,t){var i=e.__state.conversionName.toString(),n=Math.round(e.r),r=Math.round(e.g),o=Math.round(e.b),s=e.a,a=Math.round(e.h),l=e.s.toFixed(1),c=e.v.toFixed(1);if(t||"THREE_CHAR_HEX"===i||"SIX_CHAR_HEX"===i){for(var d=e.hex.toString(16);d.length<6;)d="0"+d;return"#"+d}return"CSS_RGB"===i?"rgb("+n+","+r+","+o+")":"CSS_RGBA"===i?"rgba("+n+","+r+","+o+","+s+")":"HEX"===i?"0x"+e.hex.toString(16):"RGB_ARRAY"===i?"["+n+","+r+","+o+"]":"RGBA_ARRAY"===i?"["+n+","+r+","+o+","+s+"]":"RGB_OBJ"===i?"{r:"+n+",g:"+r+",b:"+o+"}":"RGBA_OBJ"===i?"{r:"+n+",g:"+r+",b:"+o+",a:"+s+"}":"HSV_OBJ"===i?"{h:"+a+",s:"+l+",v:"+c+"}":"HSVA_OBJ"===i?"{h:"+a+",s:"+l+",v:"+c+",a:"+s+"}":"unknown format"}l.registerPlugin(a,s),h.div`
  width: 100vw;
  padding: 45dvh calc(var(--grid-gap) * 2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  @media (max-width: 1024px) {
    padding: 27dvh var(--grid-gap);
  }
`,h.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  ${F.Body_Large}
  color: var(--text-color-black);
  z-index: 2;
  overflow: hidden;
  width: 100%;
`,h.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: var(--gap32);
  text-align: center;
  z-index: 3;
`,h.div`
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  background-color: #f4f4f4;
  margin: var(--gap60) 0;
`,h.div``;var Ze=Array.prototype.forEach,Je=Array.prototype.slice,Qe={BREAK:{},extend:function(e){return this.each(Je.call(arguments,1),function(t){(this.isObject(t)?Object.keys(t):[]).forEach(function(i){this.isUndefined(t[i])||(e[i]=t[i])}.bind(this))},this),e},defaults:function(e){return this.each(Je.call(arguments,1),function(t){(this.isObject(t)?Object.keys(t):[]).forEach(function(i){this.isUndefined(e[i])&&(e[i]=t[i])}.bind(this))},this),e},compose:function(){var e=Je.call(arguments);return function(){for(var t=Je.call(arguments),i=e.length-1;i>=0;i--)t=[e[i].apply(this,t)];return t[0]}},each:function(e,t,i){if(e)if(Ze&&e.forEach&&e.forEach===Ze)e.forEach(t,i);else if(e.length===e.length+0){var n,r=void 0;for(r=0,n=e.length;r<n;r++)if(r in e&&t.call(i,e[r],r)===this.BREAK)return}else for(var o in e)if(t.call(i,e[o],o)===this.BREAK)return},defer:function(e){setTimeout(e,0)},debounce:function(e,t,i){var n=void 0;return function(){var r=this,o=arguments;var s=i||!n;clearTimeout(n),n=setTimeout(function(){n=null,i||e.apply(r,o)},t),s&&e.apply(r,o)}},toArray:function(e){return e.toArray?e.toArray():Je.call(e)},isUndefined:function(e){return void 0===e},isNull:function(e){return null===e},isNaN:function(e){function t(t){return e.apply(this,arguments)}return t.toString=function(){return e.toString()},t}(function(e){return isNaN(e)}),isArray:Array.isArray||function(e){return e.constructor===Array},isObject:function(e){return e===Object(e)},isNumber:function(e){return e===e+0},isString:function(e){return e===e+""},isBoolean:function(e){return!1===e||!0===e},isFunction:function(e){return e instanceof Function}},et=[{litmus:Qe.isString,conversions:{THREE_CHAR_HEX:{read:function(e){var t=e.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);return null!==t&&{space:"HEX",hex:parseInt("0x"+t[1].toString()+t[1].toString()+t[2].toString()+t[2].toString()+t[3].toString()+t[3].toString(),0)}},write:Ke},SIX_CHAR_HEX:{read:function(e){var t=e.match(/^#([A-F0-9]{6})$/i);return null!==t&&{space:"HEX",hex:parseInt("0x"+t[1].toString(),0)}},write:Ke},CSS_RGB:{read:function(e){var t=e.match(/^rgb\(\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*\)/);return null!==t&&{space:"RGB",r:parseFloat(t[1]),g:parseFloat(t[2]),b:parseFloat(t[3])}},write:Ke},CSS_RGBA:{read:function(e){var t=e.match(/^rgba\(\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*\)/);return null!==t&&{space:"RGB",r:parseFloat(t[1]),g:parseFloat(t[2]),b:parseFloat(t[3]),a:parseFloat(t[4])}},write:Ke}}},{litmus:Qe.isNumber,conversions:{HEX:{read:function(e){return{space:"HEX",hex:e,conversionName:"HEX"}},write:function(e){return e.hex}}}},{litmus:Qe.isArray,conversions:{RGB_ARRAY:{read:function(e){return 3===e.length&&{space:"RGB",r:e[0],g:e[1],b:e[2]}},write:function(e){return[e.r,e.g,e.b]}},RGBA_ARRAY:{read:function(e){return 4===e.length&&{space:"RGB",r:e[0],g:e[1],b:e[2],a:e[3]}},write:function(e){return[e.r,e.g,e.b,e.a]}}}},{litmus:Qe.isObject,conversions:{RGBA_OBJ:{read:function(e){return!!(Qe.isNumber(e.r)&&Qe.isNumber(e.g)&&Qe.isNumber(e.b)&&Qe.isNumber(e.a))&&{space:"RGB",r:e.r,g:e.g,b:e.b,a:e.a}},write:function(e){return{r:e.r,g:e.g,b:e.b,a:e.a}}},RGB_OBJ:{read:function(e){return!!(Qe.isNumber(e.r)&&Qe.isNumber(e.g)&&Qe.isNumber(e.b))&&{space:"RGB",r:e.r,g:e.g,b:e.b}},write:function(e){return{r:e.r,g:e.g,b:e.b}}},HSVA_OBJ:{read:function(e){return!!(Qe.isNumber(e.h)&&Qe.isNumber(e.s)&&Qe.isNumber(e.v)&&Qe.isNumber(e.a))&&{space:"HSV",h:e.h,s:e.s,v:e.v,a:e.a}},write:function(e){return{h:e.h,s:e.s,v:e.v,a:e.a}}},HSV_OBJ:{read:function(e){return!!(Qe.isNumber(e.h)&&Qe.isNumber(e.s)&&Qe.isNumber(e.v))&&{space:"HSV",h:e.h,s:e.s,v:e.v}},write:function(e){return{h:e.h,s:e.s,v:e.v}}}}}],tt=void 0,it=void 0,nt=function(){it=!1;var e=arguments.length>1?Qe.toArray(arguments):arguments[0];return Qe.each(et,function(t){if(t.litmus(e))return Qe.each(t.conversions,function(t,i){if(tt=t.read(e),!1===it&&!1!==tt)return it=tt,tt.conversionName=i,tt.conversion=t,Qe.BREAK}),Qe.BREAK}),it},rt=void 0,ot={hsv_to_rgb:function(e,t,i){var n=Math.floor(e/60)%6,r=e/60-Math.floor(e/60),o=i*(1-t),s=i*(1-r*t),a=i*(1-(1-r)*t),l=[[i,a,o],[s,i,o],[o,i,a],[o,s,i],[a,o,i],[i,o,s]][n];return{r:255*l[0],g:255*l[1],b:255*l[2]}},rgb_to_hsv:function(e,t,i){var n=Math.min(e,t,i),r=Math.max(e,t,i),o=r-n,s=void 0;return 0===r?{h:NaN,s:0,v:0}:(s=e===r?(t-i)/o:t===r?2+(i-e)/o:4+(e-t)/o,(s/=6)<0&&(s+=1),{h:360*s,s:o/r,v:r/255})},rgb_to_hex:function(e,t,i){var n=this.hex_with_component(0,2,e);return n=this.hex_with_component(n,1,t),n=this.hex_with_component(n,0,i)},component_from_hex:function(e,t){return e>>8*t&255},hex_with_component:function(e,t,i){return i<<(rt=8*t)|e&~(255<<rt)}},st="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},at=function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")},lt=function(){function e(e,t){for(var i=0;i<t.length;i++){var n=t[i];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}return function(t,i,n){return i&&e(t.prototype,i),n&&e(t,n),t}}(),ct=function e(t,i,n){null===t&&(t=Function.prototype);var r=Object.getOwnPropertyDescriptor(t,i);if(void 0===r){var o=Object.getPrototypeOf(t);return null===o?void 0:e(o,i,n)}if("value"in r)return r.value;var s=r.get;return void 0!==s?s.call(n):void 0},dt=function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)},ut=function(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t},ht=function(){function e(){if(at(this,e),this.__state=nt.apply(this,arguments),!1===this.__state)throw new Error("Failed to interpret color arguments");this.__state.a=this.__state.a||1}return lt(e,[{key:"toString",value:function(){return Ke(this)}},{key:"toHexString",value:function(){return Ke(this,!0)}},{key:"toOriginal",value:function(){return this.__state.conversion.write(this)}}]),e}();function pt(e,t,i){Object.defineProperty(e,t,{get:function(){return"RGB"===this.__state.space||ht.recalculateRGB(this,t,i),this.__state[t]},set:function(e){"RGB"!==this.__state.space&&(ht.recalculateRGB(this,t,i),this.__state.space="RGB"),this.__state[t]=e}})}function mt(e,t){Object.defineProperty(e,t,{get:function(){return"HSV"===this.__state.space||ht.recalculateHSV(this),this.__state[t]},set:function(e){"HSV"!==this.__state.space&&(ht.recalculateHSV(this),this.__state.space="HSV"),this.__state[t]=e}})}ht.recalculateRGB=function(e,t,i){if("HEX"===e.__state.space)e.__state[t]=ot.component_from_hex(e.__state.hex,i);else{if("HSV"!==e.__state.space)throw new Error("Corrupted color state");Qe.extend(e.__state,ot.hsv_to_rgb(e.__state.h,e.__state.s,e.__state.v))}},ht.recalculateHSV=function(e){var t=ot.rgb_to_hsv(e.r,e.g,e.b);Qe.extend(e.__state,{s:t.s,v:t.v}),Qe.isNaN(t.h)?Qe.isUndefined(e.__state.h)&&(e.__state.h=0):e.__state.h=t.h},ht.COMPONENTS=["r","g","b","h","s","v","hex","a"],pt(ht.prototype,"r",2),pt(ht.prototype,"g",1),pt(ht.prototype,"b",0),mt(ht.prototype,"h"),mt(ht.prototype,"s"),mt(ht.prototype,"v"),Object.defineProperty(ht.prototype,"a",{get:function(){return this.__state.a},set:function(e){this.__state.a=e}}),Object.defineProperty(ht.prototype,"hex",{get:function(){return"HEX"!==this.__state.space&&(this.__state.hex=ot.rgb_to_hex(this.r,this.g,this.b),this.__state.space="HEX"),this.__state.hex},set:function(e){this.__state.space="HEX",this.__state.hex=e}});var ft=function(){function e(t,i){at(this,e),this.initialValue=t[i],this.domElement=document.createElement("div"),this.object=t,this.property=i,this.__onChange=void 0,this.__onFinishChange=void 0}return lt(e,[{key:"onChange",value:function(e){return this.__onChange=e,this}},{key:"onFinishChange",value:function(e){return this.__onFinishChange=e,this}},{key:"setValue",value:function(e){return this.object[this.property]=e,this.__onChange&&this.__onChange.call(this,e),this.updateDisplay(),this}},{key:"getValue",value:function(){return this.object[this.property]}},{key:"updateDisplay",value:function(){return this}},{key:"isModified",value:function(){return this.initialValue!==this.getValue()}}]),e}(),gt={};Qe.each({HTMLEvents:["change"],MouseEvents:["click","mousemove","mousedown","mouseup","mouseover"],KeyboardEvents:["keydown"]},function(e,t){Qe.each(e,function(e){gt[e]=t})});var xt=/(\d+(\.\d+)?)px/;function bt(e){if("0"===e||Qe.isUndefined(e))return 0;var t=e.match(xt);return Qe.isNull(t)?0:parseFloat(t[1])}var wt={makeSelectable:function(e,t){void 0!==e&&void 0!==e.style&&(e.onselectstart=t?function(){return!1}:function(){},e.style.MozUserSelect=t?"auto":"none",e.style.KhtmlUserSelect=t?"auto":"none",e.unselectable=t?"on":"off")},makeFullscreen:function(e,t,i){var n=i,r=t;Qe.isUndefined(r)&&(r=!0),Qe.isUndefined(n)&&(n=!0),e.style.position="absolute",r&&(e.style.left=0,e.style.right=0),n&&(e.style.top=0,e.style.bottom=0)},fakeEvent:function(e,t,i,n){var r=i||{},o=gt[t];if(!o)throw new Error("Event type "+t+" not supported.");var s=document.createEvent(o);switch(o){case"MouseEvents":var a=r.x||r.clientX||0,l=r.y||r.clientY||0;s.initMouseEvent(t,r.bubbles||!1,r.cancelable||!0,window,r.clickCount||1,0,0,a,l,!1,!1,!1,!1,0,null);break;case"KeyboardEvents":var c=s.initKeyboardEvent||s.initKeyEvent;Qe.defaults(r,{cancelable:!0,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1,keyCode:void 0,charCode:void 0}),c(t,r.bubbles||!1,r.cancelable,window,r.ctrlKey,r.altKey,r.shiftKey,r.metaKey,r.keyCode,r.charCode);break;default:s.initEvent(t,r.bubbles||!1,r.cancelable||!0)}Qe.defaults(s,n),e.dispatchEvent(s)},bind:function(e,t,i,n){var r=n||!1;return e.addEventListener?e.addEventListener(t,i,r):e.attachEvent&&e.attachEvent("on"+t,i),wt},unbind:function(e,t,i,n){var r=n||!1;return e.removeEventListener?e.removeEventListener(t,i,r):e.detachEvent&&e.detachEvent("on"+t,i),wt},addClass:function(e,t){if(void 0===e.className)e.className=t;else if(e.className!==t){var i=e.className.split(/ +/);-1===i.indexOf(t)&&(i.push(t),e.className=i.join(" ").replace(/^\s+/,"").replace(/\s+$/,""))}return wt},removeClass:function(e,t){if(t)if(e.className===t)e.removeAttribute("class");else{var i=e.className.split(/ +/),n=i.indexOf(t);-1!==n&&(i.splice(n,1),e.className=i.join(" "))}else e.className=void 0;return wt},hasClass:function(e,t){return new RegExp("(?:^|\\s+)"+t+"(?:\\s+|$)").test(e.className)||!1},getWidth:function(e){var t=getComputedStyle(e);return bt(t["border-left-width"])+bt(t["border-right-width"])+bt(t["padding-left"])+bt(t["padding-right"])+bt(t.width)},getHeight:function(e){var t=getComputedStyle(e);return bt(t["border-top-width"])+bt(t["border-bottom-width"])+bt(t["padding-top"])+bt(t["padding-bottom"])+bt(t.height)},getOffset:function(e){var t=e,i={left:0,top:0};if(t.offsetParent)do{i.left+=t.offsetLeft,i.top+=t.offsetTop,t=t.offsetParent}while(t);return i},isActive:function(e){return e===document.activeElement&&(e.type||e.href)}},vt=function(){function e(t,i){at(this,e);var n=ut(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,t,i)),r=n;return n.__prev=n.getValue(),n.__checkbox=document.createElement("input"),n.__checkbox.setAttribute("type","checkbox"),wt.bind(n.__checkbox,"change",function(){r.setValue(!r.__prev)},!1),n.domElement.appendChild(n.__checkbox),n.updateDisplay(),n}return dt(e,ft),lt(e,[{key:"setValue",value:function(t){var i=ct(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"setValue",this).call(this,t);return this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue()),this.__prev=this.getValue(),i}},{key:"updateDisplay",value:function(){return!0===this.getValue()?(this.__checkbox.setAttribute("checked","checked"),this.__checkbox.checked=!0,this.__prev=!0):(this.__checkbox.checked=!1,this.__prev=!1),ct(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"updateDisplay",this).call(this)}}]),e}(),yt=function(){function e(t,i,n){at(this,e);var r=ut(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,t,i)),o=n,s=r;if(r.__select=document.createElement("select"),Qe.isArray(o)){var a={};Qe.each(o,function(e){a[e]=e}),o=a}return Qe.each(o,function(e,t){var i=document.createElement("option");i.innerHTML=t,i.setAttribute("value",e),s.__select.appendChild(i)}),r.updateDisplay(),wt.bind(r.__select,"change",function(){var e=this.options[this.selectedIndex].value;s.setValue(e)}),r.domElement.appendChild(r.__select),r}return dt(e,ft),lt(e,[{key:"setValue",value:function(t){var i=ct(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"setValue",this).call(this,t);return this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue()),i}},{key:"updateDisplay",value:function(){return wt.isActive(this.__select)?this:(this.__select.value=this.getValue(),ct(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"updateDisplay",this).call(this))}}]),e}(),_t=function(){function e(t,i){at(this,e);var n=ut(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,t,i)),r=n;function o(){r.setValue(r.__input.value)}return n.__input=document.createElement("input"),n.__input.setAttribute("type","text"),wt.bind(n.__input,"keyup",o),wt.bind(n.__input,"change",o),wt.bind(n.__input,"blur",function(){r.__onFinishChange&&r.__onFinishChange.call(r,r.getValue())}),wt.bind(n.__input,"keydown",function(e){13===e.keyCode&&this.blur()}),n.updateDisplay(),n.domElement.appendChild(n.__input),n}return dt(e,ft),lt(e,[{key:"updateDisplay",value:function(){return wt.isActive(this.__input)||(this.__input.value=this.getValue()),ct(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"updateDisplay",this).call(this)}}]),e}();function jt(e){var t=e.toString();return t.indexOf(".")>-1?t.length-t.indexOf(".")-1:0}var kt=function(){function e(t,i,n){at(this,e);var r=ut(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,t,i)),o=n||{};return r.__min=o.min,r.__max=o.max,r.__step=o.step,Qe.isUndefined(r.__step)?0===r.initialValue?r.__impliedStep=1:r.__impliedStep=Math.pow(10,Math.floor(Math.log(Math.abs(r.initialValue))/Math.LN10))/10:r.__impliedStep=r.__step,r.__precision=jt(r.__impliedStep),r}return dt(e,ft),lt(e,[{key:"setValue",value:function(t){var i=t;return void 0!==this.__min&&i<this.__min?i=this.__min:void 0!==this.__max&&i>this.__max&&(i=this.__max),void 0!==this.__step&&i%this.__step!==0&&(i=Math.round(i/this.__step)*this.__step),ct(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"setValue",this).call(this,i)}},{key:"min",value:function(e){return this.__min=e,this}},{key:"max",value:function(e){return this.__max=e,this}},{key:"step",value:function(e){return this.__step=e,this.__impliedStep=e,this.__precision=jt(e),this}}]),e}();var Et=function(){function e(t,i,n){at(this,e);var r=ut(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,t,i,n));r.__truncationSuspended=!1;var o=r,s=void 0;function a(){o.__onFinishChange&&o.__onFinishChange.call(o,o.getValue())}function l(e){var t=s-e.clientY;o.setValue(o.getValue()+t*o.__impliedStep),s=e.clientY}function c(){wt.unbind(window,"mousemove",l),wt.unbind(window,"mouseup",c),a()}return r.__input=document.createElement("input"),r.__input.setAttribute("type","text"),wt.bind(r.__input,"change",function(){var e=parseFloat(o.__input.value);Qe.isNaN(e)||o.setValue(e)}),wt.bind(r.__input,"blur",function(){a()}),wt.bind(r.__input,"mousedown",function(e){wt.bind(window,"mousemove",l),wt.bind(window,"mouseup",c),s=e.clientY}),wt.bind(r.__input,"keydown",function(e){13===e.keyCode&&(o.__truncationSuspended=!0,this.blur(),o.__truncationSuspended=!1,a())}),r.updateDisplay(),r.domElement.appendChild(r.__input),r}return dt(e,kt),lt(e,[{key:"updateDisplay",value:function(){var t,i,n;return this.__input.value=this.__truncationSuspended?this.getValue():(t=this.getValue(),i=this.__precision,n=Math.pow(10,i),Math.round(t*n)/n),ct(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"updateDisplay",this).call(this)}}]),e}();function Ct(e,t,i,n,r){return n+(e-t)/(i-t)*(r-n)}var Rt=function(){function e(t,i,n,r,o){at(this,e);var s=ut(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,t,i,{min:n,max:r,step:o})),a=s;function l(e){e.preventDefault();var t=a.__background.getBoundingClientRect();return a.setValue(Ct(e.clientX,t.left,t.right,a.__min,a.__max)),!1}function c(){wt.unbind(window,"mousemove",l),wt.unbind(window,"mouseup",c),a.__onFinishChange&&a.__onFinishChange.call(a,a.getValue())}function d(e){var t=e.touches[0].clientX,i=a.__background.getBoundingClientRect();a.setValue(Ct(t,i.left,i.right,a.__min,a.__max))}function u(){wt.unbind(window,"touchmove",d),wt.unbind(window,"touchend",u),a.__onFinishChange&&a.__onFinishChange.call(a,a.getValue())}return s.__background=document.createElement("div"),s.__foreground=document.createElement("div"),wt.bind(s.__background,"mousedown",function(e){document.activeElement.blur(),wt.bind(window,"mousemove",l),wt.bind(window,"mouseup",c),l(e)}),wt.bind(s.__background,"touchstart",function(e){if(1!==e.touches.length)return;wt.bind(window,"touchmove",d),wt.bind(window,"touchend",u),d(e)}),wt.addClass(s.__background,"slider"),wt.addClass(s.__foreground,"slider-fg"),s.updateDisplay(),s.__background.appendChild(s.__foreground),s.domElement.appendChild(s.__background),s}return dt(e,kt),lt(e,[{key:"updateDisplay",value:function(){var t=(this.getValue()-this.__min)/(this.__max-this.__min);return this.__foreground.style.width=100*t+"%",ct(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"updateDisplay",this).call(this)}}]),e}(),St=function(){function e(t,i,n){at(this,e);var r=ut(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,t,i)),o=r;return r.__button=document.createElement("div"),r.__button.innerHTML=void 0===n?"Fire":n,wt.bind(r.__button,"click",function(e){return e.preventDefault(),o.fire(),!1}),wt.addClass(r.__button,"button"),r.domElement.appendChild(r.__button),r}return dt(e,ft),lt(e,[{key:"fire",value:function(){this.__onChange&&this.__onChange.call(this),this.getValue().call(this.object),this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue())}}]),e}(),Ot=function(){function e(t,i){at(this,e);var n=ut(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,t,i));n.__color=new ht(n.getValue()),n.__temp=new ht(0);var r=n;n.domElement=document.createElement("div"),wt.makeSelectable(n.domElement,!1),n.__selector=document.createElement("div"),n.__selector.className="selector",n.__saturation_field=document.createElement("div"),n.__saturation_field.className="saturation-field",n.__field_knob=document.createElement("div"),n.__field_knob.className="field-knob",n.__field_knob_border="2px solid ",n.__hue_knob=document.createElement("div"),n.__hue_knob.className="hue-knob",n.__hue_field=document.createElement("div"),n.__hue_field.className="hue-field",n.__input=document.createElement("input"),n.__input.type="text",n.__input_textShadow="0 1px 1px ",wt.bind(n.__input,"keydown",function(e){13===e.keyCode&&u.call(this)}),wt.bind(n.__input,"blur",u),wt.bind(n.__selector,"mousedown",function(){wt.addClass(this,"drag").bind(window,"mouseup",function(){wt.removeClass(r.__selector,"drag")})}),wt.bind(n.__selector,"touchstart",function(){wt.addClass(this,"drag").bind(window,"touchend",function(){wt.removeClass(r.__selector,"drag")})});var o,s=document.createElement("div");function a(e){p(e),wt.bind(window,"mousemove",p),wt.bind(window,"touchmove",p),wt.bind(window,"mouseup",c),wt.bind(window,"touchend",c)}function l(e){m(e),wt.bind(window,"mousemove",m),wt.bind(window,"touchmove",m),wt.bind(window,"mouseup",d),wt.bind(window,"touchend",d)}function c(){wt.unbind(window,"mousemove",p),wt.unbind(window,"touchmove",p),wt.unbind(window,"mouseup",c),wt.unbind(window,"touchend",c),h()}function d(){wt.unbind(window,"mousemove",m),wt.unbind(window,"touchmove",m),wt.unbind(window,"mouseup",d),wt.unbind(window,"touchend",d),h()}function u(){var e=nt(this.value);!1!==e?(r.__color.__state=e,r.setValue(r.__color.toOriginal())):this.value=r.__color.toString()}function h(){r.__onFinishChange&&r.__onFinishChange.call(r,r.__color.toOriginal())}function p(e){-1===e.type.indexOf("touch")&&e.preventDefault();var t=r.__saturation_field.getBoundingClientRect(),i=e.touches&&e.touches[0]||e,n=i.clientX,o=i.clientY,s=(n-t.left)/(t.right-t.left),a=1-(o-t.top)/(t.bottom-t.top);return a>1?a=1:a<0&&(a=0),s>1?s=1:s<0&&(s=0),r.__color.v=a,r.__color.s=s,r.setValue(r.__color.toOriginal()),!1}function m(e){-1===e.type.indexOf("touch")&&e.preventDefault();var t=r.__hue_field.getBoundingClientRect(),i=1-((e.touches&&e.touches[0]||e).clientY-t.top)/(t.bottom-t.top);return i>1?i=1:i<0&&(i=0),r.__color.h=360*i,r.setValue(r.__color.toOriginal()),!1}return Qe.extend(n.__selector.style,{width:"122px",height:"102px",padding:"3px",backgroundColor:"#222",boxShadow:"0px 1px 3px rgba(0,0,0,0.3)"}),Qe.extend(n.__field_knob.style,{position:"absolute",width:"12px",height:"12px",border:n.__field_knob_border+(n.__color.v<.5?"#fff":"#000"),boxShadow:"0px 1px 3px rgba(0,0,0,0.5)",borderRadius:"12px",zIndex:1}),Qe.extend(n.__hue_knob.style,{position:"absolute",width:"15px",height:"2px",borderRight:"4px solid #fff",zIndex:1}),Qe.extend(n.__saturation_field.style,{width:"100px",height:"100px",border:"1px solid #555",marginRight:"3px",display:"inline-block",cursor:"pointer"}),Qe.extend(s.style,{width:"100%",height:"100%",background:"none"}),At(s,"top","rgba(0,0,0,0)","#000"),Qe.extend(n.__hue_field.style,{width:"15px",height:"100px",border:"1px solid #555",cursor:"ns-resize",position:"absolute",top:"3px",right:"3px"}),(o=n.__hue_field).style.background="",o.style.cssText+="background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);",o.style.cssText+="background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",o.style.cssText+="background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",o.style.cssText+="background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",o.style.cssText+="background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",Qe.extend(n.__input.style,{outline:"none",textAlign:"center",color:"#fff",border:0,fontWeight:"bold",textShadow:n.__input_textShadow+"rgba(0,0,0,0.7)"}),wt.bind(n.__saturation_field,"mousedown",a),wt.bind(n.__saturation_field,"touchstart",a),wt.bind(n.__field_knob,"mousedown",a),wt.bind(n.__field_knob,"touchstart",a),wt.bind(n.__hue_field,"mousedown",l),wt.bind(n.__hue_field,"touchstart",l),n.__saturation_field.appendChild(s),n.__selector.appendChild(n.__field_knob),n.__selector.appendChild(n.__saturation_field),n.__selector.appendChild(n.__hue_field),n.__hue_field.appendChild(n.__hue_knob),n.domElement.appendChild(n.__input),n.domElement.appendChild(n.__selector),n.updateDisplay(),n}return dt(e,ft),lt(e,[{key:"updateDisplay",value:function(){var e=nt(this.getValue());if(!1!==e){var t=!1;Qe.each(ht.COMPONENTS,function(i){if(!Qe.isUndefined(e[i])&&!Qe.isUndefined(this.__color.__state[i])&&e[i]!==this.__color.__state[i])return t=!0,{}},this),t&&Qe.extend(this.__color.__state,e)}Qe.extend(this.__temp.__state,this.__color.__state),this.__temp.a=1;var i=this.__color.v<.5||this.__color.s>.5?255:0,n=255-i;Qe.extend(this.__field_knob.style,{marginLeft:100*this.__color.s-7+"px",marginTop:100*(1-this.__color.v)-7+"px",backgroundColor:this.__temp.toHexString(),border:this.__field_knob_border+"rgb("+i+","+i+","+i+")"}),this.__hue_knob.style.marginTop=100*(1-this.__color.h/360)+"px",this.__temp.s=1,this.__temp.v=1,At(this.__saturation_field,"left","#fff",this.__temp.toHexString()),this.__input.value=this.__color.toString(),Qe.extend(this.__input.style,{backgroundColor:this.__color.toHexString(),color:"rgb("+i+","+i+","+i+")",textShadow:this.__input_textShadow+"rgba("+n+","+n+","+n+",.7)"})}}]),e}(),Tt=["-moz-","-o-","-webkit-","-ms-",""];function At(e,t,i,n){e.style.background="",Qe.each(Tt,function(r){e.style.cssText+="background: "+r+"linear-gradient("+t+", "+i+" 0%, "+n+" 100%); "})}var Lt=function(e,t){var i=t||document,n=document.createElement("style");n.type="text/css",n.innerHTML=e;var r=i.getElementsByTagName("head")[0];try{r.appendChild(n)}catch(o){}},Nt=function(e,t){var i=e[t];return Qe.isArray(arguments[2])||Qe.isObject(arguments[2])?new yt(e,t,arguments[2]):Qe.isNumber(i)?Qe.isNumber(arguments[2])&&Qe.isNumber(arguments[3])?Qe.isNumber(arguments[4])?new Rt(e,t,arguments[2],arguments[3],arguments[4]):new Rt(e,t,arguments[2],arguments[3]):Qe.isNumber(arguments[4])?new Et(e,t,{min:arguments[2],max:arguments[3],step:arguments[4]}):new Et(e,t,{min:arguments[2],max:arguments[3]}):Qe.isString(i)?new _t(e,t):Qe.isFunction(i)?new St(e,t,""):Qe.isBoolean(i)?new vt(e,t):null};var zt=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(e){setTimeout(e,1e3/60)},Pt=function(){function e(){at(this,e),this.backgroundElement=document.createElement("div"),Qe.extend(this.backgroundElement.style,{backgroundColor:"rgba(0,0,0,0.8)",top:0,left:0,display:"none",zIndex:"1000",opacity:0,WebkitTransition:"opacity 0.2s linear",transition:"opacity 0.2s linear"}),wt.makeFullscreen(this.backgroundElement),this.backgroundElement.style.position="fixed",this.domElement=document.createElement("div"),Qe.extend(this.domElement.style,{position:"fixed",display:"none",zIndex:"1001",opacity:0,WebkitTransition:"-webkit-transform 0.2s ease-out, opacity 0.2s linear",transition:"transform 0.2s ease-out, opacity 0.2s linear"}),document.body.appendChild(this.backgroundElement),document.body.appendChild(this.domElement);var t=this;wt.bind(this.backgroundElement,"click",function(){t.hide()})}return lt(e,[{key:"show",value:function(){var e=this;this.backgroundElement.style.display="block",this.domElement.style.display="block",this.domElement.style.opacity=0,this.domElement.style.webkitTransform="scale(1.1)",this.layout(),Qe.defer(function(){e.backgroundElement.style.opacity=1,e.domElement.style.opacity=1,e.domElement.style.webkitTransform="scale(1)"})}},{key:"hide",value:function(){var e=this,t=function t(){e.domElement.style.display="none",e.backgroundElement.style.display="none",wt.unbind(e.domElement,"webkitTransitionEnd",t),wt.unbind(e.domElement,"transitionend",t),wt.unbind(e.domElement,"oTransitionEnd",t)};wt.bind(this.domElement,"webkitTransitionEnd",t),wt.bind(this.domElement,"transitionend",t),wt.bind(this.domElement,"oTransitionEnd",t),this.backgroundElement.style.opacity=0,this.domElement.style.opacity=0,this.domElement.style.webkitTransform="scale(1.1)"}},{key:"layout",value:function(){this.domElement.style.left=window.innerWidth/2-wt.getWidth(this.domElement)/2+"px",this.domElement.style.top=window.innerHeight/2-wt.getHeight(this.domElement)/2+"px"}}]),e}();Lt(function(e){if("undefined"!=typeof window){var t=document.createElement("style");return t.setAttribute("type","text/css"),t.innerHTML=e,document.head.appendChild(t),e}}(".dg ul{list-style:none;margin:0;padding:0;width:100%;clear:both}.dg.ac{position:fixed;top:0;left:0;right:0;height:0;z-index:0}.dg:not(.ac) .main{overflow:hidden}.dg.main{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear}.dg.main.taller-than-window{overflow-y:auto}.dg.main.taller-than-window .close-button{opacity:1;margin-top:-1px;border-top:1px solid #2c2c2c}.dg.main ul.closed .close-button{opacity:1 !important}.dg.main:hover .close-button,.dg.main .close-button.drag{opacity:1}.dg.main .close-button{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear;border:0;line-height:19px;height:20px;cursor:pointer;text-align:center;background-color:#000}.dg.main .close-button.close-top{position:relative}.dg.main .close-button.close-bottom{position:absolute}.dg.main .close-button:hover{background-color:#111}.dg.a{float:right;margin-right:15px;overflow-y:visible}.dg.a.has-save>ul.close-top{margin-top:0}.dg.a.has-save>ul.close-bottom{margin-top:27px}.dg.a.has-save>ul.closed{margin-top:0}.dg.a .save-row{top:0;z-index:1002}.dg.a .save-row.close-top{position:relative}.dg.a .save-row.close-bottom{position:fixed}.dg li{-webkit-transition:height .1s ease-out;-o-transition:height .1s ease-out;-moz-transition:height .1s ease-out;transition:height .1s ease-out;-webkit-transition:overflow .1s linear;-o-transition:overflow .1s linear;-moz-transition:overflow .1s linear;transition:overflow .1s linear}.dg li:not(.folder){cursor:auto;height:27px;line-height:27px;padding:0 4px 0 5px}.dg li.folder{padding:0;border-left:4px solid rgba(0,0,0,0)}.dg li.title{cursor:pointer;margin-left:-4px}.dg .closed li:not(.title),.dg .closed ul li,.dg .closed ul li>*{height:0;overflow:hidden;border:0}.dg .cr{clear:both;padding-left:3px;height:27px;overflow:hidden}.dg .property-name{cursor:default;float:left;clear:left;width:40%;overflow:hidden;text-overflow:ellipsis}.dg .cr.function .property-name{width:100%}.dg .c{float:left;width:60%;position:relative}.dg .c input[type=text]{border:0;margin-top:4px;padding:3px;width:100%;float:right}.dg .has-slider input[type=text]{width:30%;margin-left:0}.dg .slider{float:left;width:66%;margin-left:-5px;margin-right:0;height:19px;margin-top:4px}.dg .slider-fg{height:100%}.dg .c input[type=checkbox]{margin-top:7px}.dg .c select{margin-top:5px}.dg .cr.function,.dg .cr.function .property-name,.dg .cr.function *,.dg .cr.boolean,.dg .cr.boolean *{cursor:pointer}.dg .cr.color{overflow:visible}.dg .selector{display:none;position:absolute;margin-left:-9px;margin-top:23px;z-index:10}.dg .c:hover .selector,.dg .selector.drag{display:block}.dg li.save-row{padding:0}.dg li.save-row .button{display:inline-block;padding:0px 6px}.dg.dialogue{background-color:#222;width:460px;padding:15px;font-size:13px;line-height:15px}#dg-new-constructor{padding:10px;color:#222;font-family:Monaco, monospace;font-size:10px;border:0;resize:none;box-shadow:inset 1px 1px 1px #888;word-wrap:break-word;margin:12px 0;display:block;width:440px;overflow-y:scroll;height:100px;position:relative}#dg-local-explain{display:none;font-size:11px;line-height:17px;border-radius:3px;background-color:#333;padding:8px;margin-top:10px}#dg-local-explain code{font-size:10px}#dat-gui-save-locally{display:none}.dg{color:#eee;font:11px 'Lucida Grande', sans-serif;text-shadow:0 -1px 0 #111}.dg.main::-webkit-scrollbar{width:5px;background:#1a1a1a}.dg.main::-webkit-scrollbar-corner{height:0;display:none}.dg.main::-webkit-scrollbar-thumb{border-radius:5px;background:#676767}.dg li:not(.folder){background:#1a1a1a;border-bottom:1px solid #2c2c2c}.dg li.save-row{line-height:25px;background:#dad5cb;border:0}.dg li.save-row select{margin-left:5px;width:108px}.dg li.save-row .button{margin-left:5px;margin-top:1px;border-radius:2px;font-size:9px;line-height:7px;padding:4px 4px 5px 4px;background:#c5bdad;color:#fff;text-shadow:0 1px 0 #b0a58f;box-shadow:0 -1px 0 #b0a58f;cursor:pointer}.dg li.save-row .button.gears{background:#c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;height:7px;width:8px}.dg li.save-row .button:hover{background-color:#bab19e;box-shadow:0 -1px 0 #b0a58f}.dg li.folder{border-bottom:0}.dg li.title{padding-left:16px;background:#000 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.2)}.dg .closed li.title{background-image:url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==)}.dg .cr.boolean{border-left:3px solid #806787}.dg .cr.color{border-left:3px solid}.dg .cr.function{border-left:3px solid #e61d5f}.dg .cr.number{border-left:3px solid #2FA1D6}.dg .cr.number input[type=text]{color:#2FA1D6}.dg .cr.string{border-left:3px solid #1ed36f}.dg .cr.string input[type=text]{color:#1ed36f}.dg .cr.function:hover,.dg .cr.boolean:hover{background:#111}.dg .c input[type=text]{background:#303030;outline:none}.dg .c input[type=text]:hover{background:#3c3c3c}.dg .c input[type=text]:focus{background:#494949;color:#fff}.dg .c .slider{background:#303030;cursor:ew-resize}.dg .c .slider-fg{background:#2FA1D6;max-width:100%}.dg .c .slider:hover{background:#3c3c3c}.dg .c .slider:hover .slider-fg{background:#44abda}\n"));var It="Default",Bt=function(){try{return!!window.localStorage}catch(e){return!1}}(),Mt=void 0,Dt=!0,Ht=void 0,Ft=!1,Vt=[],Ut=function e(t){var i=this,n=t||{};this.domElement=document.createElement("div"),this.__ul=document.createElement("ul"),this.domElement.appendChild(this.__ul),wt.addClass(this.domElement,"dg"),this.__folders={},this.__controllers=[],this.__rememberedObjects=[],this.__rememberedObjectIndecesToControllers=[],this.__listening=[],n=Qe.defaults(n,{closeOnTop:!1,autoPlace:!0,width:e.DEFAULT_WIDTH}),n=Qe.defaults(n,{resizable:n.autoPlace,hideable:n.autoPlace}),Qe.isUndefined(n.load)?n.load={preset:It}:n.preset&&(n.load.preset=n.preset),Qe.isUndefined(n.parent)&&n.hideable&&Vt.push(this),n.resizable=Qe.isUndefined(n.parent)&&n.resizable,n.autoPlace&&Qe.isUndefined(n.scrollable)&&(n.scrollable=!0);var r,o=Bt&&"true"===localStorage.getItem(Yt(this,"isLocal")),s=void 0,a=void 0;if(Object.defineProperties(this,{parent:{get:function(){return n.parent}},scrollable:{get:function(){return n.scrollable}},autoPlace:{get:function(){return n.autoPlace}},closeOnTop:{get:function(){return n.closeOnTop}},preset:{get:function(){return i.parent?i.getRoot().preset:n.load.preset},set:function(e){i.parent?i.getRoot().preset=e:n.load.preset=e,function(e){for(var t=0;t<e.__preset_select.length;t++)e.__preset_select[t].value===e.preset&&(e.__preset_select.selectedIndex=t)}(this),i.revert()}},width:{get:function(){return n.width},set:function(e){n.width=e,Jt(i,e)}},name:{get:function(){return n.name},set:function(e){n.name=e,a&&(a.innerHTML=n.name)}},closed:{get:function(){return n.closed},set:function(t){n.closed=t,n.closed?wt.addClass(i.__ul,e.CLASS_CLOSED):wt.removeClass(i.__ul,e.CLASS_CLOSED),this.onResize(),i.__closeButton&&(i.__closeButton.innerHTML=t?e.TEXT_OPEN:e.TEXT_CLOSED)}},load:{get:function(){return n.load}},useLocalStorage:{get:function(){return o},set:function(e){Bt&&(o=e,e?wt.bind(window,"unload",s):wt.unbind(window,"unload",s),localStorage.setItem(Yt(i,"isLocal"),e))}}}),Qe.isUndefined(n.parent)){if(this.closed=n.closed||!1,wt.addClass(this.domElement,e.CLASS_MAIN),wt.makeSelectable(this.domElement,!1),Bt&&o){i.useLocalStorage=!0;var l=localStorage.getItem(Yt(this,"gui"));l&&(n.load=JSON.parse(l))}this.__closeButton=document.createElement("div"),this.__closeButton.innerHTML=e.TEXT_CLOSED,wt.addClass(this.__closeButton,e.CLASS_CLOSE_BUTTON),n.closeOnTop?(wt.addClass(this.__closeButton,e.CLASS_CLOSE_TOP),this.domElement.insertBefore(this.__closeButton,this.domElement.childNodes[0])):(wt.addClass(this.__closeButton,e.CLASS_CLOSE_BOTTOM),this.domElement.appendChild(this.__closeButton)),wt.bind(this.__closeButton,"click",function(){i.closed=!i.closed})}else{void 0===n.closed&&(n.closed=!0);var c=document.createTextNode(n.name);wt.addClass(c,"controller-name"),a=$t(i,c);wt.addClass(this.__ul,e.CLASS_CLOSED),wt.addClass(a,"title"),wt.bind(a,"click",function(e){return e.preventDefault(),i.closed=!i.closed,!1}),n.closed||(this.closed=!1)}n.autoPlace&&(Qe.isUndefined(n.parent)&&(Dt&&(Ht=document.createElement("div"),wt.addClass(Ht,"dg"),wt.addClass(Ht,e.CLASS_AUTO_PLACE_CONTAINER),document.body.appendChild(Ht),Dt=!1),Ht.appendChild(this.domElement),wt.addClass(this.domElement,e.CLASS_AUTO_PLACE)),this.parent||Jt(i,n.width)),this.__resizeHandler=function(){i.onResizeDebounced()},wt.bind(window,"resize",this.__resizeHandler),wt.bind(this.__ul,"webkitTransitionEnd",this.__resizeHandler),wt.bind(this.__ul,"transitionend",this.__resizeHandler),wt.bind(this.__ul,"oTransitionEnd",this.__resizeHandler),this.onResize(),n.resizable&&function(e){var t=void 0;function i(i){return i.preventDefault(),e.width+=t-i.clientX,e.onResize(),t=i.clientX,!1}function n(){wt.removeClass(e.__closeButton,Ut.CLASS_DRAG),wt.unbind(window,"mousemove",i),wt.unbind(window,"mouseup",n)}function r(r){return r.preventDefault(),t=r.clientX,wt.addClass(e.__closeButton,Ut.CLASS_DRAG),wt.bind(window,"mousemove",i),wt.bind(window,"mouseup",n),!1}e.__resize_handle=document.createElement("div"),Qe.extend(e.__resize_handle.style,{width:"6px",marginLeft:"-3px",height:"200px",cursor:"ew-resize",position:"absolute"}),wt.bind(e.__resize_handle,"mousedown",r),wt.bind(e.__closeButton,"mousedown",r),e.domElement.insertBefore(e.__resize_handle,e.domElement.firstElementChild)}(this),s=function(){Bt&&"true"===localStorage.getItem(Yt(i,"isLocal"))&&localStorage.setItem(Yt(i,"gui"),JSON.stringify(i.getSaveObject()))},this.saveToLocalStorageIfPossible=s,n.parent||((r=i.getRoot()).width+=1,Qe.defer(function(){r.width-=1}))};function $t(e,t,i){var n=document.createElement("li");return t&&n.appendChild(t),i?e.__ul.insertBefore(n,i):e.__ul.appendChild(n),e.onResize(),n}function Wt(e){wt.unbind(window,"resize",e.__resizeHandler),e.saveToLocalStorageIfPossible&&wt.unbind(window,"unload",e.saveToLocalStorageIfPossible)}function qt(e,t){var i=e.__preset_select[e.__preset_select.selectedIndex];i.innerHTML=t?i.value+"*":i.value}function Xt(e,t){var i=e.getRoot(),n=i.__rememberedObjects.indexOf(t.object);if(-1!==n){var r=i.__rememberedObjectIndecesToControllers[n];if(void 0===r&&(r={},i.__rememberedObjectIndecesToControllers[n]=r),r[t.property]=t,i.load&&i.load.remembered){var o=i.load.remembered,s=void 0;if(o[e.preset])s=o[e.preset];else{if(!o[It])return;s=o[It]}if(s[n]&&void 0!==s[n][t.property]){var a=s[n][t.property];t.initialValue=a,t.setValue(a)}}}}function Gt(e,t,i,n){if(void 0===t[i])throw new Error('Object "'+t+'" has no property "'+i+'"');var r=void 0;if(n.color)r=new Ot(t,i);else{var o=[t,i].concat(n.factoryArgs);r=Nt.apply(e,o)}n.before instanceof ft&&(n.before=n.before.__li),Xt(e,r),wt.addClass(r.domElement,"c");var s=document.createElement("span");wt.addClass(s,"property-name"),s.innerHTML=r.property;var a=document.createElement("div");a.appendChild(s),a.appendChild(r.domElement);var l=$t(e,a,n.before);return wt.addClass(l,Ut.CLASS_CONTROLLER_ROW),r instanceof Ot?wt.addClass(l,"color"):wt.addClass(l,st(r.getValue())),function(e,t,i){if(i.__li=t,i.__gui=e,Qe.extend(i,{options:function(t){if(arguments.length>1){var n=i.__li.nextElementSibling;return i.remove(),Gt(e,i.object,i.property,{before:n,factoryArgs:[Qe.toArray(arguments)]})}if(Qe.isArray(t)||Qe.isObject(t)){var r=i.__li.nextElementSibling;return i.remove(),Gt(e,i.object,i.property,{before:r,factoryArgs:[t]})}},name:function(e){return i.__li.firstElementChild.firstElementChild.innerHTML=e,i},listen:function(){return i.__gui.listen(i),i},remove:function(){return i.__gui.remove(i),i}}),i instanceof Rt){var n=new Et(i.object,i.property,{min:i.__min,max:i.__max,step:i.__step});Qe.each(["updateDisplay","onChange","onFinishChange","step","min","max"],function(e){var t=i[e],r=n[e];i[e]=n[e]=function(){var e=Array.prototype.slice.call(arguments);return r.apply(n,e),t.apply(i,e)}}),wt.addClass(t,"has-slider"),i.domElement.insertBefore(n.domElement,i.domElement.firstElementChild)}else if(i instanceof Et){var r=function(t){if(Qe.isNumber(i.__min)&&Qe.isNumber(i.__max)){var n=i.__li.firstElementChild.firstElementChild.innerHTML,r=i.__gui.__listening.indexOf(i)>-1;i.remove();var o=Gt(e,i.object,i.property,{before:i.__li.nextElementSibling,factoryArgs:[i.__min,i.__max,i.__step]});return o.name(n),r&&o.listen(),o}return t};i.min=Qe.compose(r,i.min),i.max=Qe.compose(r,i.max)}else i instanceof vt?(wt.bind(t,"click",function(){wt.fakeEvent(i.__checkbox,"click")}),wt.bind(i.__checkbox,"click",function(e){e.stopPropagation()})):i instanceof St?(wt.bind(t,"click",function(){wt.fakeEvent(i.__button,"click")}),wt.bind(t,"mouseover",function(){wt.addClass(i.__button,"hover")}),wt.bind(t,"mouseout",function(){wt.removeClass(i.__button,"hover")})):i instanceof Ot&&(wt.addClass(t,"color"),i.updateDisplay=Qe.compose(function(e){return t.style.borderLeftColor=i.__color.toString(),e},i.updateDisplay),i.updateDisplay());i.setValue=Qe.compose(function(t){return e.getRoot().__preset_select&&i.isModified()&&qt(e.getRoot(),!0),t},i.setValue)}(e,l,r),e.__controllers.push(r),r}function Yt(e,t){return document.location.href+"."+t}function Kt(e,t,i){var n=document.createElement("option");n.innerHTML=t,n.value=t,e.__preset_select.appendChild(n),i&&(e.__preset_select.selectedIndex=e.__preset_select.length-1)}function Zt(e,t){t.style.display=e.useLocalStorage?"block":"none"}function Jt(e,t){e.domElement.style.width=t+"px",e.__save_row&&e.autoPlace&&(e.__save_row.style.width=t+"px"),e.__closeButton&&(e.__closeButton.style.width=t+"px")}function Qt(e,t){var i={};return Qe.each(e.__rememberedObjects,function(n,r){var o={},s=e.__rememberedObjectIndecesToControllers[r];Qe.each(s,function(e,i){o[i]=t?e.initialValue:e.getValue()}),i[r]=o}),i}function ei(e){0!==e.length&&zt.call(window,function(){ei(e)}),Qe.each(e,function(e){e.updateDisplay()})}function ti(e,t){return function(){return e.apply(t,arguments)}}Ut.toggleHide=function(){Ft=!Ft,Qe.each(Vt,function(e){e.domElement.style.display=Ft?"none":""})},Ut.CLASS_AUTO_PLACE="a",Ut.CLASS_AUTO_PLACE_CONTAINER="ac",Ut.CLASS_MAIN="main",Ut.CLASS_CONTROLLER_ROW="cr",Ut.CLASS_TOO_TALL="taller-than-window",Ut.CLASS_CLOSED="closed",Ut.CLASS_CLOSE_BUTTON="close-button",Ut.CLASS_CLOSE_TOP="close-top",Ut.CLASS_CLOSE_BOTTOM="close-bottom",Ut.CLASS_DRAG="drag",Ut.DEFAULT_WIDTH=245,Ut.TEXT_CLOSED="Close Controls",Ut.TEXT_OPEN="Open Controls",Ut._keydownHandler=function(e){"text"===document.activeElement.type||72!==e.which&&72!==e.keyCode||Ut.toggleHide()},wt.bind(window,"keydown",Ut._keydownHandler,!1),Qe.extend(Ut.prototype,{add:function(e,t){return Gt(this,e,t,{factoryArgs:Array.prototype.slice.call(arguments,2)})},addColor:function(e,t){return Gt(this,e,t,{color:!0})},remove:function(e){this.__ul.removeChild(e.__li),this.__controllers.splice(this.__controllers.indexOf(e),1);var t=this;Qe.defer(function(){t.onResize()})},destroy:function(){if(this.parent)throw new Error("Only the root GUI should be removed with .destroy(). For subfolders, use gui.removeFolder(folder) instead.");this.autoPlace&&Ht.removeChild(this.domElement);var e=this;Qe.each(this.__folders,function(t){e.removeFolder(t)}),wt.unbind(window,"keydown",Ut._keydownHandler,!1),Wt(this)},addFolder:function(e){if(void 0!==this.__folders[e])throw new Error('You already have a folder in this GUI by the name "'+e+'"');var t={name:e,parent:this};t.autoPlace=this.autoPlace,this.load&&this.load.folders&&this.load.folders[e]&&(t.closed=this.load.folders[e].closed,t.load=this.load.folders[e]);var i=new Ut(t);this.__folders[e]=i;var n=$t(this,i.domElement);return wt.addClass(n,"folder"),i},removeFolder:function(e){this.__ul.removeChild(e.domElement.parentElement),delete this.__folders[e.name],this.load&&this.load.folders&&this.load.folders[e.name]&&delete this.load.folders[e.name],Wt(e);var t=this;Qe.each(e.__folders,function(t){e.removeFolder(t)}),Qe.defer(function(){t.onResize()})},open:function(){this.closed=!1},close:function(){this.closed=!0},hide:function(){this.domElement.style.display="none"},show:function(){this.domElement.style.display=""},onResize:function(){var e=this.getRoot();if(e.scrollable){var t=wt.getOffset(e.__ul).top,i=0;Qe.each(e.__ul.childNodes,function(t){e.autoPlace&&t===e.__save_row||(i+=wt.getHeight(t))}),window.innerHeight-t-20<i?(wt.addClass(e.domElement,Ut.CLASS_TOO_TALL),e.__ul.style.height=window.innerHeight-t-20+"px"):(wt.removeClass(e.domElement,Ut.CLASS_TOO_TALL),e.__ul.style.height="auto")}e.__resize_handle&&Qe.defer(function(){e.__resize_handle.style.height=e.__ul.offsetHeight+"px"}),e.__closeButton&&(e.__closeButton.style.width=e.width+"px")},onResizeDebounced:Qe.debounce(function(){this.onResize()},50),remember:function(){if(Qe.isUndefined(Mt)&&((Mt=new Pt).domElement.innerHTML='<div id="dg-save" class="dg dialogue">\n\n  Here\'s the new load parameter for your <code>GUI</code>\'s constructor:\n\n  <textarea id="dg-new-constructor"></textarea>\n\n  <div id="dg-save-locally">\n\n    <input id="dg-local-storage" type="checkbox"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id="dg-local-explain">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>\'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n\n    </div>\n\n  </div>\n\n</div>'),this.parent)throw new Error("You can only call remember on a top level GUI.");var e=this;Qe.each(Array.prototype.slice.call(arguments),function(t){0===e.__rememberedObjects.length&&function(e){var t=e.__save_row=document.createElement("li");wt.addClass(e.domElement,"has-save"),e.__ul.insertBefore(t,e.__ul.firstChild),wt.addClass(t,"save-row");var i=document.createElement("span");i.innerHTML="&nbsp;",wt.addClass(i,"button gears");var n=document.createElement("span");n.innerHTML="Save",wt.addClass(n,"button"),wt.addClass(n,"save");var r=document.createElement("span");r.innerHTML="New",wt.addClass(r,"button"),wt.addClass(r,"save-as");var o=document.createElement("span");o.innerHTML="Revert",wt.addClass(o,"button"),wt.addClass(o,"revert");var s=e.__preset_select=document.createElement("select");e.load&&e.load.remembered?Qe.each(e.load.remembered,function(t,i){Kt(e,i,i===e.preset)}):Kt(e,It,!1);if(wt.bind(s,"change",function(){for(var t=0;t<e.__preset_select.length;t++)e.__preset_select[t].innerHTML=e.__preset_select[t].value;e.preset=this.value}),t.appendChild(s),t.appendChild(i),t.appendChild(n),t.appendChild(r),t.appendChild(o),Bt){var a=document.getElementById("dg-local-explain"),l=document.getElementById("dg-local-storage");document.getElementById("dg-save-locally").style.display="block","true"===localStorage.getItem(Yt(e,"isLocal"))&&l.setAttribute("checked","checked"),Zt(e,a),wt.bind(l,"change",function(){e.useLocalStorage=!e.useLocalStorage,Zt(e,a)})}var c=document.getElementById("dg-new-constructor");wt.bind(c,"keydown",function(e){!e.metaKey||67!==e.which&&67!==e.keyCode||Mt.hide()}),wt.bind(i,"click",function(){c.innerHTML=JSON.stringify(e.getSaveObject(),void 0,2),Mt.show(),c.focus(),c.select()}),wt.bind(n,"click",function(){e.save()}),wt.bind(r,"click",function(){var t=prompt("Enter a new preset name.");t&&e.saveAs(t)}),wt.bind(o,"click",function(){e.revert()})}(e),-1===e.__rememberedObjects.indexOf(t)&&e.__rememberedObjects.push(t)}),this.autoPlace&&Jt(this,this.width)},getRoot:function(){for(var e=this;e.parent;)e=e.parent;return e},getSaveObject:function(){var e=this.load;return e.closed=this.closed,this.__rememberedObjects.length>0&&(e.preset=this.preset,e.remembered||(e.remembered={}),e.remembered[this.preset]=Qt(this)),e.folders={},Qe.each(this.__folders,function(t,i){e.folders[i]=t.getSaveObject()}),e},save:function(){this.load.remembered||(this.load.remembered={}),this.load.remembered[this.preset]=Qt(this),qt(this,!1),this.saveToLocalStorageIfPossible()},saveAs:function(e){this.load.remembered||(this.load.remembered={},this.load.remembered[It]=Qt(this,!0)),this.load.remembered[e]=Qt(this),this.preset=e,Kt(this,e,!0),this.saveToLocalStorageIfPossible()},revert:function(e){Qe.each(this.__controllers,function(t){this.getRoot().load.remembered?Xt(e||this.getRoot(),t):t.setValue(t.initialValue),t.__onFinishChange&&t.__onFinishChange.call(t,t.getValue())},this),Qe.each(this.__folders,function(e){e.revert(e)}),e||qt(this.getRoot(),!1)},listen:function(e){var t=0===this.__listening.length;this.__listening.push(e),t&&ei(this.__listening)},updateDisplay:function(){Qe.each(this.__controllers,function(e){e.updateDisplay()}),Qe.each(this.__folders,function(e){e.updateDisplay()})}});const{toString:ii}=Object.prototype,{getPrototypeOf:ni}=Object,{iterator:ri,toStringTag:oi}=Symbol,si=(e=>t=>{const i=ii.call(t);return e[i]||(e[i]=i.slice(8,-1).toLowerCase())})(Object.create(null)),ai=e=>(e=e.toLowerCase(),t=>si(t)===e),li=e=>t=>typeof t===e,{isArray:ci}=Array,di=li("undefined");function ui(e){return null!==e&&!di(e)&&null!==e.constructor&&!di(e.constructor)&&mi(e.constructor.isBuffer)&&e.constructor.isBuffer(e)}const hi=ai("ArrayBuffer");const pi=li("string"),mi=li("function"),fi=li("number"),gi=e=>null!==e&&"object"==typeof e,xi=e=>{if("object"!==si(e))return!1;const t=ni(e);return!(null!==t&&t!==Object.prototype&&null!==Object.getPrototypeOf(t)||oi in e||ri in e)},bi=ai("Date"),wi=ai("File"),vi=ai("Blob"),yi=ai("FileList"),_i=ai("URLSearchParams"),[ji,ki,Ei,Ci]=["ReadableStream","Request","Response","Headers"].map(ai);function Ri(e,t,{allOwnKeys:i=!1}={}){if(null==e)return;let n,r;if("object"!=typeof e&&(e=[e]),ci(e))for(n=0,r=e.length;n<r;n++)t.call(null,e[n],n,e);else{if(ui(e))return;const r=i?Object.getOwnPropertyNames(e):Object.keys(e),o=r.length;let s;for(n=0;n<o;n++)s=r[n],t.call(null,e[s],s,e)}}function Si(e,t){if(ui(e))return null;t=t.toLowerCase();const i=Object.keys(e);let n,r=i.length;for(;r-- >0;)if(n=i[r],t===n.toLowerCase())return n;return null}const Oi="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:global,Ti=e=>!di(e)&&e!==Oi;const Ai=(e=>t=>e&&t instanceof e)("undefined"!=typeof Uint8Array&&ni(Uint8Array)),Li=ai("HTMLFormElement"),Ni=(({hasOwnProperty:e})=>(t,i)=>e.call(t,i))(Object.prototype),zi=ai("RegExp"),Pi=(e,t)=>{const i=Object.getOwnPropertyDescriptors(e),n={};Ri(i,(i,r)=>{let o;!1!==(o=t(i,r,e))&&(n[r]=o||i)}),Object.defineProperties(e,n)};const Ii=ai("AsyncFunction"),Bi=(Mi="function"==typeof setImmediate,Di=mi(Oi.postMessage),Mi?setImmediate:Di?(Hi=`axios@${Math.random()}`,Fi=[],Oi.addEventListener("message",({source:e,data:t})=>{e===Oi&&t===Hi&&Fi.length&&Fi.shift()()},!1),e=>{Fi.push(e),Oi.postMessage(Hi,"*")}):e=>setTimeout(e));var Mi,Di,Hi,Fi;const Vi="undefined"!=typeof queueMicrotask?queueMicrotask.bind(Oi):"undefined"!=typeof process&&process.nextTick||Bi,Ui={isArray:ci,isArrayBuffer:hi,isBuffer:ui,isFormData:e=>{let t;return e&&("function"==typeof FormData&&e instanceof FormData||mi(e.append)&&("formdata"===(t=si(e))||"object"===t&&mi(e.toString)&&"[object FormData]"===e.toString()))},isArrayBufferView:function(e){let t;return t="undefined"!=typeof ArrayBuffer&&ArrayBuffer.isView?ArrayBuffer.isView(e):e&&e.buffer&&hi(e.buffer),t},isString:pi,isNumber:fi,isBoolean:e=>!0===e||!1===e,isObject:gi,isPlainObject:xi,isEmptyObject:e=>{if(!gi(e)||ui(e))return!1;try{return 0===Object.keys(e).length&&Object.getPrototypeOf(e)===Object.prototype}catch(t){return!1}},isReadableStream:ji,isRequest:ki,isResponse:Ei,isHeaders:Ci,isUndefined:di,isDate:bi,isFile:wi,isBlob:vi,isRegExp:zi,isFunction:mi,isStream:e=>gi(e)&&mi(e.pipe),isURLSearchParams:_i,isTypedArray:Ai,isFileList:yi,forEach:Ri,merge:function e(){const{caseless:t}=Ti(this)&&this||{},i={},n=(n,r)=>{const o=t&&Si(i,r)||r;xi(i[o])&&xi(n)?i[o]=e(i[o],n):xi(n)?i[o]=e({},n):ci(n)?i[o]=n.slice():i[o]=n};for(let r=0,o=arguments.length;r<o;r++)arguments[r]&&Ri(arguments[r],n);return i},extend:(e,t,i,{allOwnKeys:n}={})=>(Ri(t,(t,n)=>{i&&mi(t)?e[n]=ti(t,i):e[n]=t},{allOwnKeys:n}),e),trim:e=>e.trim?e.trim():e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,""),stripBOM:e=>(65279===e.charCodeAt(0)&&(e=e.slice(1)),e),inherits:(e,t,i,n)=>{e.prototype=Object.create(t.prototype,n),e.prototype.constructor=e,Object.defineProperty(e,"super",{value:t.prototype}),i&&Object.assign(e.prototype,i)},toFlatObject:(e,t,i,n)=>{let r,o,s;const a={};if(t=t||{},null==e)return t;do{for(r=Object.getOwnPropertyNames(e),o=r.length;o-- >0;)s=r[o],n&&!n(s,e,t)||a[s]||(t[s]=e[s],a[s]=!0);e=!1!==i&&ni(e)}while(e&&(!i||i(e,t))&&e!==Object.prototype);return t},kindOf:si,kindOfTest:ai,endsWith:(e,t,i)=>{e=String(e),(void 0===i||i>e.length)&&(i=e.length),i-=t.length;const n=e.indexOf(t,i);return-1!==n&&n===i},toArray:e=>{if(!e)return null;if(ci(e))return e;let t=e.length;if(!fi(t))return null;const i=new Array(t);for(;t-- >0;)i[t]=e[t];return i},forEachEntry:(e,t)=>{const i=(e&&e[ri]).call(e);let n;for(;(n=i.next())&&!n.done;){const i=n.value;t.call(e,i[0],i[1])}},matchAll:(e,t)=>{let i;const n=[];for(;null!==(i=e.exec(t));)n.push(i);return n},isHTMLForm:Li,hasOwnProperty:Ni,hasOwnProp:Ni,reduceDescriptors:Pi,freezeMethods:e=>{Pi(e,(t,i)=>{if(mi(e)&&-1!==["arguments","caller","callee"].indexOf(i))return!1;const n=e[i];mi(n)&&(t.enumerable=!1,"writable"in t?t.writable=!1:t.set||(t.set=()=>{throw Error("Can not rewrite read-only method '"+i+"'")}))})},toObjectSet:(e,t)=>{const i={},n=e=>{e.forEach(e=>{i[e]=!0})};return ci(e)?n(e):n(String(e).split(t)),i},toCamelCase:e=>e.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g,function(e,t,i){return t.toUpperCase()+i}),noop:()=>{},toFiniteNumber:(e,t)=>null!=e&&Number.isFinite(e=+e)?e:t,findKey:Si,global:Oi,isContextDefined:Ti,isSpecCompliantForm:function(e){return!!(e&&mi(e.append)&&"FormData"===e[oi]&&e[ri])},toJSONObject:e=>{const t=new Array(10),i=(e,n)=>{if(gi(e)){if(t.indexOf(e)>=0)return;if(ui(e))return e;if(!("toJSON"in e)){t[n]=e;const r=ci(e)?[]:{};return Ri(e,(e,t)=>{const o=i(e,n+1);!di(o)&&(r[t]=o)}),t[n]=void 0,r}}return e};return i(e,0)},isAsyncFn:Ii,isThenable:e=>e&&(gi(e)||mi(e))&&mi(e.then)&&mi(e.catch),setImmediate:Bi,asap:Vi,isIterable:e=>null!=e&&mi(e[ri])};function $i(e,t,i,n,r){Error.call(this),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=(new Error).stack,this.message=e,this.name="AxiosError",t&&(this.code=t),i&&(this.config=i),n&&(this.request=n),r&&(this.response=r,this.status=r.status?r.status:null)}Ui.inherits($i,Error,{toJSON:function(){return{message:this.message,name:this.name,description:this.description,number:this.number,fileName:this.fileName,lineNumber:this.lineNumber,columnNumber:this.columnNumber,stack:this.stack,config:Ui.toJSONObject(this.config),code:this.code,status:this.status}}});const Wi=$i.prototype,qi={};["ERR_BAD_OPTION_VALUE","ERR_BAD_OPTION","ECONNABORTED","ETIMEDOUT","ERR_NETWORK","ERR_FR_TOO_MANY_REDIRECTS","ERR_DEPRECATED","ERR_BAD_RESPONSE","ERR_BAD_REQUEST","ERR_CANCELED","ERR_NOT_SUPPORT","ERR_INVALID_URL"].forEach(e=>{qi[e]={value:e}}),Object.defineProperties($i,qi),Object.defineProperty(Wi,"isAxiosError",{value:!0}),$i.from=(e,t,i,n,r,o)=>{const s=Object.create(Wi);return Ui.toFlatObject(e,s,function(e){return e!==Error.prototype},e=>"isAxiosError"!==e),$i.call(s,e.message,t,i,n,r),s.cause=e,s.name=e.name,o&&Object.assign(s,o),s};function Xi(e){return Ui.isPlainObject(e)||Ui.isArray(e)}function Gi(e){return Ui.endsWith(e,"[]")?e.slice(0,-2):e}function Yi(e,t,i){return e?e.concat(t).map(function(e,t){return e=Gi(e),!i&&t?"["+e+"]":e}).join(i?".":""):t}const Ki=Ui.toFlatObject(Ui,{},null,function(e){return/^is[A-Z]/.test(e)});function Zi(e,t,i){if(!Ui.isObject(e))throw new TypeError("target must be an object");t=t||new FormData;const n=(i=Ui.toFlatObject(i,{metaTokens:!0,dots:!1,indexes:!1},!1,function(e,t){return!Ui.isUndefined(t[e])})).metaTokens,r=i.visitor||c,o=i.dots,s=i.indexes,a=(i.Blob||"undefined"!=typeof Blob&&Blob)&&Ui.isSpecCompliantForm(t);if(!Ui.isFunction(r))throw new TypeError("visitor must be a function");function l(e){if(null===e)return"";if(Ui.isDate(e))return e.toISOString();if(Ui.isBoolean(e))return e.toString();if(!a&&Ui.isBlob(e))throw new $i("Blob is not supported. Use a Buffer instead.");return Ui.isArrayBuffer(e)||Ui.isTypedArray(e)?a&&"function"==typeof Blob?new Blob([e]):Buffer.from(e):e}function c(e,i,r){let a=e;if(e&&!r&&"object"==typeof e)if(Ui.endsWith(i,"{}"))i=n?i:i.slice(0,-2),e=JSON.stringify(e);else if(Ui.isArray(e)&&function(e){return Ui.isArray(e)&&!e.some(Xi)}(e)||(Ui.isFileList(e)||Ui.endsWith(i,"[]"))&&(a=Ui.toArray(e)))return i=Gi(i),a.forEach(function(e,n){!Ui.isUndefined(e)&&null!==e&&t.append(!0===s?Yi([i],n,o):null===s?i:i+"[]",l(e))}),!1;return!!Xi(e)||(t.append(Yi(r,i,o),l(e)),!1)}const d=[],u=Object.assign(Ki,{defaultVisitor:c,convertValue:l,isVisitable:Xi});if(!Ui.isObject(e))throw new TypeError("data must be an object");return function e(i,n){if(!Ui.isUndefined(i)){if(-1!==d.indexOf(i))throw Error("Circular reference detected in "+n.join("."));d.push(i),Ui.forEach(i,function(i,o){!0===(!(Ui.isUndefined(i)||null===i)&&r.call(t,i,Ui.isString(o)?o.trim():o,n,u))&&e(i,n?n.concat(o):[o])}),d.pop()}}(e),t}function Ji(e){const t={"!":"%21","'":"%27","(":"%28",")":"%29","~":"%7E","%20":"+","%00":"\0"};return encodeURIComponent(e).replace(/[!'()~]|%20|%00/g,function(e){return t[e]})}function Qi(e,t){this._pairs=[],e&&Zi(e,this,t)}const en=Qi.prototype;function tn(e){return encodeURIComponent(e).replace(/%3A/gi,":").replace(/%24/g,"$").replace(/%2C/gi,",").replace(/%20/g,"+").replace(/%5B/gi,"[").replace(/%5D/gi,"]")}function nn(e,t,i){if(!t)return e;const n=i&&i.encode||tn;Ui.isFunction(i)&&(i={serialize:i});const r=i&&i.serialize;let o;if(o=r?r(t,i):Ui.isURLSearchParams(t)?t.toString():new Qi(t,i).toString(n),o){const t=e.indexOf("#");-1!==t&&(e=e.slice(0,t)),e+=(-1===e.indexOf("?")?"?":"&")+o}return e}en.append=function(e,t){this._pairs.push([e,t])},en.toString=function(e){const t=e?function(t){return e.call(this,t,Ji)}:Ji;return this._pairs.map(function(e){return t(e[0])+"="+t(e[1])},"").join("&")};class rn{constructor(){this.handlers=[]}use(e,t,i){return this.handlers.push({fulfilled:e,rejected:t,synchronous:!!i&&i.synchronous,runWhen:i?i.runWhen:null}),this.handlers.length-1}eject(e){this.handlers[e]&&(this.handlers[e]=null)}clear(){this.handlers&&(this.handlers=[])}forEach(e){Ui.forEach(this.handlers,function(t){null!==t&&e(t)})}}const on={silentJSONParsing:!0,forcedJSONParsing:!0,clarifyTimeoutError:!1},sn={isBrowser:!0,classes:{URLSearchParams:"undefined"!=typeof URLSearchParams?URLSearchParams:Qi,FormData:"undefined"!=typeof FormData?FormData:null,Blob:"undefined"!=typeof Blob?Blob:null},protocols:["http","https","file","blob","url","data"]},an="undefined"!=typeof window&&"undefined"!=typeof document,ln="object"==typeof navigator&&navigator||void 0,cn=an&&(!ln||["ReactNative","NativeScript","NS"].indexOf(ln.product)<0),dn="undefined"!=typeof WorkerGlobalScope&&self instanceof WorkerGlobalScope&&"function"==typeof self.importScripts,un=an&&window.location.href||"http://localhost",hn={...Object.freeze(Object.defineProperty({__proto__:null,hasBrowserEnv:an,hasStandardBrowserEnv:cn,hasStandardBrowserWebWorkerEnv:dn,navigator:ln,origin:un},Symbol.toStringTag,{value:"Module"})),...sn};function pn(e){function t(e,i,n,r){let o=e[r++];if("__proto__"===o)return!0;const s=Number.isFinite(+o),a=r>=e.length;if(o=!o&&Ui.isArray(n)?n.length:o,a)return Ui.hasOwnProp(n,o)?n[o]=[n[o],i]:n[o]=i,!s;n[o]&&Ui.isObject(n[o])||(n[o]=[]);return t(e,i,n[o],r)&&Ui.isArray(n[o])&&(n[o]=function(e){const t={},i=Object.keys(e);let n;const r=i.length;let o;for(n=0;n<r;n++)o=i[n],t[o]=e[o];return t}(n[o])),!s}if(Ui.isFormData(e)&&Ui.isFunction(e.entries)){const i={};return Ui.forEachEntry(e,(e,n)=>{t(function(e){return Ui.matchAll(/\w+|\[(\w*)]/g,e).map(e=>"[]"===e[0]?"":e[1]||e[0])}(e),n,i,0)}),i}return null}const mn={transitional:on,adapter:["xhr","http","fetch"],transformRequest:[function(e,t){const i=t.getContentType()||"",n=i.indexOf("application/json")>-1,r=Ui.isObject(e);r&&Ui.isHTMLForm(e)&&(e=new FormData(e));if(Ui.isFormData(e))return n?JSON.stringify(pn(e)):e;if(Ui.isArrayBuffer(e)||Ui.isBuffer(e)||Ui.isStream(e)||Ui.isFile(e)||Ui.isBlob(e)||Ui.isReadableStream(e))return e;if(Ui.isArrayBufferView(e))return e.buffer;if(Ui.isURLSearchParams(e))return t.setContentType("application/x-www-form-urlencoded;charset=utf-8",!1),e.toString();let o;if(r){if(i.indexOf("application/x-www-form-urlencoded")>-1)return function(e,t){return Zi(e,new hn.classes.URLSearchParams,{visitor:function(e,t,i,n){return hn.isNode&&Ui.isBuffer(e)?(this.append(t,e.toString("base64")),!1):n.defaultVisitor.apply(this,arguments)},...t})}(e,this.formSerializer).toString();if((o=Ui.isFileList(e))||i.indexOf("multipart/form-data")>-1){const t=this.env&&this.env.FormData;return Zi(o?{"files[]":e}:e,t&&new t,this.formSerializer)}}return r||n?(t.setContentType("application/json",!1),function(e,t,i){if(Ui.isString(e))try{return(t||JSON.parse)(e),Ui.trim(e)}catch(n){if("SyntaxError"!==n.name)throw n}return(i||JSON.stringify)(e)}(e)):e}],transformResponse:[function(e){const t=this.transitional||mn.transitional,i=t&&t.forcedJSONParsing,n="json"===this.responseType;if(Ui.isResponse(e)||Ui.isReadableStream(e))return e;if(e&&Ui.isString(e)&&(i&&!this.responseType||n)){const i=!(t&&t.silentJSONParsing)&&n;try{return JSON.parse(e)}catch(r){if(i){if("SyntaxError"===r.name)throw $i.from(r,$i.ERR_BAD_RESPONSE,this,null,this.response);throw r}}}return e}],timeout:0,xsrfCookieName:"XSRF-TOKEN",xsrfHeaderName:"X-XSRF-TOKEN",maxContentLength:-1,maxBodyLength:-1,env:{FormData:hn.classes.FormData,Blob:hn.classes.Blob},validateStatus:function(e){return e>=200&&e<300},headers:{common:{Accept:"application/json, text/plain, */*","Content-Type":void 0}}};Ui.forEach(["delete","get","head","post","put","patch"],e=>{mn.headers[e]={}});const fn=Ui.toObjectSet(["age","authorization","content-length","content-type","etag","expires","from","host","if-modified-since","if-unmodified-since","last-modified","location","max-forwards","proxy-authorization","referer","retry-after","user-agent"]),gn=Symbol("internals");function xn(e){return e&&String(e).trim().toLowerCase()}function bn(e){return!1===e||null==e?e:Ui.isArray(e)?e.map(bn):String(e)}function wn(e,t,i,n,r){return Ui.isFunction(n)?n.call(this,t,i):(r&&(t=i),Ui.isString(t)?Ui.isString(n)?-1!==t.indexOf(n):Ui.isRegExp(n)?n.test(t):void 0:void 0)}let vn=class{constructor(e){e&&this.set(e)}set(e,t,i){const n=this;function r(e,t,i){const r=xn(t);if(!r)throw new Error("header name must be a non-empty string");const o=Ui.findKey(n,r);(!o||void 0===n[o]||!0===i||void 0===i&&!1!==n[o])&&(n[o||t]=bn(e))}const o=(e,t)=>Ui.forEach(e,(e,i)=>r(e,i,t));if(Ui.isPlainObject(e)||e instanceof this.constructor)o(e,t);else if(Ui.isString(e)&&(e=e.trim())&&!/^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(e.trim()))o((e=>{const t={};let i,n,r;return e&&e.split("\n").forEach(function(e){r=e.indexOf(":"),i=e.substring(0,r).trim().toLowerCase(),n=e.substring(r+1).trim(),!i||t[i]&&fn[i]||("set-cookie"===i?t[i]?t[i].push(n):t[i]=[n]:t[i]=t[i]?t[i]+", "+n:n)}),t})(e),t);else if(Ui.isObject(e)&&Ui.isIterable(e)){let i,n,r={};for(const t of e){if(!Ui.isArray(t))throw TypeError("Object iterator must return a key-value pair");r[n=t[0]]=(i=r[n])?Ui.isArray(i)?[...i,t[1]]:[i,t[1]]:t[1]}o(r,t)}else null!=e&&r(t,e,i);return this}get(e,t){if(e=xn(e)){const i=Ui.findKey(this,e);if(i){const e=this[i];if(!t)return e;if(!0===t)return function(e){const t=Object.create(null),i=/([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;let n;for(;n=i.exec(e);)t[n[1]]=n[2];return t}(e);if(Ui.isFunction(t))return t.call(this,e,i);if(Ui.isRegExp(t))return t.exec(e);throw new TypeError("parser must be boolean|regexp|function")}}}has(e,t){if(e=xn(e)){const i=Ui.findKey(this,e);return!(!i||void 0===this[i]||t&&!wn(0,this[i],i,t))}return!1}delete(e,t){const i=this;let n=!1;function r(e){if(e=xn(e)){const r=Ui.findKey(i,e);!r||t&&!wn(0,i[r],r,t)||(delete i[r],n=!0)}}return Ui.isArray(e)?e.forEach(r):r(e),n}clear(e){const t=Object.keys(this);let i=t.length,n=!1;for(;i--;){const r=t[i];e&&!wn(0,this[r],r,e,!0)||(delete this[r],n=!0)}return n}normalize(e){const t=this,i={};return Ui.forEach(this,(n,r)=>{const o=Ui.findKey(i,r);if(o)return t[o]=bn(n),void delete t[r];const s=e?function(e){return e.trim().toLowerCase().replace(/([a-z\d])(\w*)/g,(e,t,i)=>t.toUpperCase()+i)}(r):String(r).trim();s!==r&&delete t[r],t[s]=bn(n),i[s]=!0}),this}concat(...e){return this.constructor.concat(this,...e)}toJSON(e){const t=Object.create(null);return Ui.forEach(this,(i,n)=>{null!=i&&!1!==i&&(t[n]=e&&Ui.isArray(i)?i.join(", "):i)}),t}[Symbol.iterator](){return Object.entries(this.toJSON())[Symbol.iterator]()}toString(){return Object.entries(this.toJSON()).map(([e,t])=>e+": "+t).join("\n")}getSetCookie(){return this.get("set-cookie")||[]}get[Symbol.toStringTag](){return"AxiosHeaders"}static from(e){return e instanceof this?e:new this(e)}static concat(e,...t){const i=new this(e);return t.forEach(e=>i.set(e)),i}static accessor(e){const t=(this[gn]=this[gn]={accessors:{}}).accessors,i=this.prototype;function n(e){const n=xn(e);t[n]||(!function(e,t){const i=Ui.toCamelCase(" "+t);["get","set","has"].forEach(n=>{Object.defineProperty(e,n+i,{value:function(e,i,r){return this[n].call(this,t,e,i,r)},configurable:!0})})}(i,e),t[n]=!0)}return Ui.isArray(e)?e.forEach(n):n(e),this}};function yn(e,t){const i=this||mn,n=t||i,r=vn.from(n.headers);let o=n.data;return Ui.forEach(e,function(e){o=e.call(i,o,r.normalize(),t?t.status:void 0)}),r.normalize(),o}function _n(e){return!(!e||!e.__CANCEL__)}function jn(e,t,i){$i.call(this,null==e?"canceled":e,$i.ERR_CANCELED,t,i),this.name="CanceledError"}function kn(e,t,i){const n=i.config.validateStatus;i.status&&n&&!n(i.status)?t(new $i("Request failed with status code "+i.status,[$i.ERR_BAD_REQUEST,$i.ERR_BAD_RESPONSE][Math.floor(i.status/100)-4],i.config,i.request,i)):e(i)}vn.accessor(["Content-Type","Content-Length","Accept","Accept-Encoding","User-Agent","Authorization"]),Ui.reduceDescriptors(vn.prototype,({value:e},t)=>{let i=t[0].toUpperCase()+t.slice(1);return{get:()=>e,set(e){this[i]=e}}}),Ui.freezeMethods(vn),Ui.inherits(jn,$i,{__CANCEL__:!0});const En=(e,t,i=3)=>{let n=0;const r=function(e,t){e=e||10;const i=new Array(e),n=new Array(e);let r,o=0,s=0;return t=void 0!==t?t:1e3,function(a){const l=Date.now(),c=n[s];r||(r=l),i[o]=a,n[o]=l;let d=s,u=0;for(;d!==o;)u+=i[d++],d%=e;if(o=(o+1)%e,o===s&&(s=(s+1)%e),l-r<t)return;const h=c&&l-c;return h?Math.round(1e3*u/h):void 0}}(50,250);return function(e,t){let i,n,r=0,o=1e3/t;const s=(t,o=Date.now())=>{r=o,i=null,n&&(clearTimeout(n),n=null),e(...t)};return[(...e)=>{const t=Date.now(),a=t-r;a>=o?s(e,t):(i=e,n||(n=setTimeout(()=>{n=null,s(i)},o-a)))},()=>i&&s(i)]}(i=>{const o=i.loaded,s=i.lengthComputable?i.total:void 0,a=o-n,l=r(a);n=o;e({loaded:o,total:s,progress:s?o/s:void 0,bytes:a,rate:l||void 0,estimated:l&&s&&o<=s?(s-o)/l:void 0,event:i,lengthComputable:null!=s,[t?"download":"upload"]:!0})},i)},Cn=(e,t)=>{const i=null!=e;return[n=>t[0]({lengthComputable:i,total:e,loaded:n}),t[1]]},Rn=e=>(...t)=>Ui.asap(()=>e(...t)),Sn=hn.hasStandardBrowserEnv?((e,t)=>i=>(i=new URL(i,hn.origin),e.protocol===i.protocol&&e.host===i.host&&(t||e.port===i.port)))(new URL(hn.origin),hn.navigator&&/(msie|trident)/i.test(hn.navigator.userAgent)):()=>!0,On=hn.hasStandardBrowserEnv?{write(e,t,i,n,r,o){const s=[e+"="+encodeURIComponent(t)];Ui.isNumber(i)&&s.push("expires="+new Date(i).toGMTString()),Ui.isString(n)&&s.push("path="+n),Ui.isString(r)&&s.push("domain="+r),!0===o&&s.push("secure"),document.cookie=s.join("; ")},read(e){const t=document.cookie.match(new RegExp("(^|;\\s*)("+e+")=([^;]*)"));return t?decodeURIComponent(t[3]):null},remove(e){this.write(e,"",Date.now()-864e5)}}:{write(){},read:()=>null,remove(){}};function Tn(e,t,i){let n=!/^([a-z][a-z\d+\-.]*:)?\/\//i.test(t);return e&&(n||0==i)?function(e,t){return t?e.replace(/\/?\/$/,"")+"/"+t.replace(/^\/+/,""):e}(e,t):t}const An=e=>e instanceof vn?{...e}:e;function Ln(e,t){t=t||{};const i={};function n(e,t,i,n){return Ui.isPlainObject(e)&&Ui.isPlainObject(t)?Ui.merge.call({caseless:n},e,t):Ui.isPlainObject(t)?Ui.merge({},t):Ui.isArray(t)?t.slice():t}function r(e,t,i,r){return Ui.isUndefined(t)?Ui.isUndefined(e)?void 0:n(void 0,e,0,r):n(e,t,0,r)}function o(e,t){if(!Ui.isUndefined(t))return n(void 0,t)}function s(e,t){return Ui.isUndefined(t)?Ui.isUndefined(e)?void 0:n(void 0,e):n(void 0,t)}function a(i,r,o){return o in t?n(i,r):o in e?n(void 0,i):void 0}const l={url:o,method:o,data:o,baseURL:s,transformRequest:s,transformResponse:s,paramsSerializer:s,timeout:s,timeoutMessage:s,withCredentials:s,withXSRFToken:s,adapter:s,responseType:s,xsrfCookieName:s,xsrfHeaderName:s,onUploadProgress:s,onDownloadProgress:s,decompress:s,maxContentLength:s,maxBodyLength:s,beforeRedirect:s,transport:s,httpAgent:s,httpsAgent:s,cancelToken:s,socketPath:s,responseEncoding:s,validateStatus:a,headers:(e,t,i)=>r(An(e),An(t),0,!0)};return Ui.forEach(Object.keys({...e,...t}),function(n){const o=l[n]||r,s=o(e[n],t[n],n);Ui.isUndefined(s)&&o!==a||(i[n]=s)}),i}const Nn=e=>{const t=Ln({},e);let i,{data:n,withXSRFToken:r,xsrfHeaderName:o,xsrfCookieName:s,headers:a,auth:l}=t;if(t.headers=a=vn.from(a),t.url=nn(Tn(t.baseURL,t.url,t.allowAbsoluteUrls),e.params,e.paramsSerializer),l&&a.set("Authorization","Basic "+btoa((l.username||"")+":"+(l.password?unescape(encodeURIComponent(l.password)):""))),Ui.isFormData(n))if(hn.hasStandardBrowserEnv||hn.hasStandardBrowserWebWorkerEnv)a.setContentType(void 0);else if(!1!==(i=a.getContentType())){const[e,...t]=i?i.split(";").map(e=>e.trim()).filter(Boolean):[];a.setContentType([e||"multipart/form-data",...t].join("; "))}if(hn.hasStandardBrowserEnv&&(r&&Ui.isFunction(r)&&(r=r(t)),r||!1!==r&&Sn(t.url))){const e=o&&s&&On.read(s);e&&a.set(o,e)}return t},zn="undefined"!=typeof XMLHttpRequest&&function(e){return new Promise(function(t,i){const n=Nn(e);let r=n.data;const o=vn.from(n.headers).normalize();let s,a,l,c,d,{responseType:u,onUploadProgress:h,onDownloadProgress:p}=n;function m(){c&&c(),d&&d(),n.cancelToken&&n.cancelToken.unsubscribe(s),n.signal&&n.signal.removeEventListener("abort",s)}let f=new XMLHttpRequest;function g(){if(!f)return;const n=vn.from("getAllResponseHeaders"in f&&f.getAllResponseHeaders());kn(function(e){t(e),m()},function(e){i(e),m()},{data:u&&"text"!==u&&"json"!==u?f.response:f.responseText,status:f.status,statusText:f.statusText,headers:n,config:e,request:f}),f=null}f.open(n.method.toUpperCase(),n.url,!0),f.timeout=n.timeout,"onloadend"in f?f.onloadend=g:f.onreadystatechange=function(){f&&4===f.readyState&&(0!==f.status||f.responseURL&&0===f.responseURL.indexOf("file:"))&&setTimeout(g)},f.onabort=function(){f&&(i(new $i("Request aborted",$i.ECONNABORTED,e,f)),f=null)},f.onerror=function(){i(new $i("Network Error",$i.ERR_NETWORK,e,f)),f=null},f.ontimeout=function(){let t=n.timeout?"timeout of "+n.timeout+"ms exceeded":"timeout exceeded";const r=n.transitional||on;n.timeoutErrorMessage&&(t=n.timeoutErrorMessage),i(new $i(t,r.clarifyTimeoutError?$i.ETIMEDOUT:$i.ECONNABORTED,e,f)),f=null},void 0===r&&o.setContentType(null),"setRequestHeader"in f&&Ui.forEach(o.toJSON(),function(e,t){f.setRequestHeader(t,e)}),Ui.isUndefined(n.withCredentials)||(f.withCredentials=!!n.withCredentials),u&&"json"!==u&&(f.responseType=n.responseType),p&&([l,d]=En(p,!0),f.addEventListener("progress",l)),h&&f.upload&&([a,c]=En(h),f.upload.addEventListener("progress",a),f.upload.addEventListener("loadend",c)),(n.cancelToken||n.signal)&&(s=t=>{f&&(i(!t||t.type?new jn(null,e,f):t),f.abort(),f=null)},n.cancelToken&&n.cancelToken.subscribe(s),n.signal&&(n.signal.aborted?s():n.signal.addEventListener("abort",s)));const x=function(e){const t=/^([-+\w]{1,25})(:?\/\/|:)/.exec(e);return t&&t[1]||""}(n.url);x&&-1===hn.protocols.indexOf(x)?i(new $i("Unsupported protocol "+x+":",$i.ERR_BAD_REQUEST,e)):f.send(r||null)})},Pn=(e,t)=>{const{length:i}=e=e?e.filter(Boolean):[];if(t||i){let i,n=new AbortController;const r=function(e){if(!i){i=!0,s();const t=e instanceof Error?e:this.reason;n.abort(t instanceof $i?t:new jn(t instanceof Error?t.message:t))}};let o=t&&setTimeout(()=>{o=null,r(new $i(`timeout ${t} of ms exceeded`,$i.ETIMEDOUT))},t);const s=()=>{e&&(o&&clearTimeout(o),o=null,e.forEach(e=>{e.unsubscribe?e.unsubscribe(r):e.removeEventListener("abort",r)}),e=null)};e.forEach(e=>e.addEventListener("abort",r));const{signal:a}=n;return a.unsubscribe=()=>Ui.asap(s),a}},In=function*(e,t){let i=e.byteLength;if(i<t)return void(yield e);let n,r=0;for(;r<i;)n=r+t,yield e.slice(r,n),r=n},Bn=async function*(e){if(e[Symbol.asyncIterator])return void(yield*e);const t=e.getReader();try{for(;;){const{done:e,value:i}=await t.read();if(e)break;yield i}}finally{await t.cancel()}},Mn=(e,t,i,n)=>{const r=async function*(e,t){for await(const i of Bn(e))yield*In(i,t)}(e,t);let o,s=0,a=e=>{o||(o=!0,n&&n(e))};return new ReadableStream({async pull(e){try{const{done:t,value:n}=await r.next();if(t)return a(),void e.close();let o=n.byteLength;if(i){let e=s+=o;i(e)}e.enqueue(new Uint8Array(n))}catch(t){throw a(t),t}},cancel:e=>(a(e),r.return())},{highWaterMark:2})},Dn="function"==typeof fetch&&"function"==typeof Request&&"function"==typeof Response,Hn=Dn&&"function"==typeof ReadableStream,Fn=Dn&&("function"==typeof TextEncoder?(e=>t=>e.encode(t))(new TextEncoder):async e=>new Uint8Array(await new Response(e).arrayBuffer())),Vn=(e,...t)=>{try{return!!e(...t)}catch(i){return!1}},Un=Hn&&Vn(()=>{let e=!1;const t=new Request(hn.origin,{body:new ReadableStream,method:"POST",get duplex(){return e=!0,"half"}}).headers.has("Content-Type");return e&&!t}),$n=Hn&&Vn(()=>Ui.isReadableStream(new Response("").body)),Wn={stream:$n&&(e=>e.body)};var qn;Dn&&(qn=new Response,["text","arrayBuffer","blob","formData","stream"].forEach(e=>{!Wn[e]&&(Wn[e]=Ui.isFunction(qn[e])?t=>t[e]():(t,i)=>{throw new $i(`Response type '${e}' is not supported`,$i.ERR_NOT_SUPPORT,i)})}));const Xn=async(e,t)=>{const i=Ui.toFiniteNumber(e.getContentLength());return null==i?(async e=>{if(null==e)return 0;if(Ui.isBlob(e))return e.size;if(Ui.isSpecCompliantForm(e)){const t=new Request(hn.origin,{method:"POST",body:e});return(await t.arrayBuffer()).byteLength}return Ui.isArrayBufferView(e)||Ui.isArrayBuffer(e)?e.byteLength:(Ui.isURLSearchParams(e)&&(e+=""),Ui.isString(e)?(await Fn(e)).byteLength:void 0)})(t):i},Gn={http:null,xhr:zn,fetch:Dn&&(async e=>{let{url:t,method:i,data:n,signal:r,cancelToken:o,timeout:s,onDownloadProgress:a,onUploadProgress:l,responseType:c,headers:d,withCredentials:u="same-origin",fetchOptions:h}=Nn(e);c=c?(c+"").toLowerCase():"text";let p,m=Pn([r,o&&o.toAbortSignal()],s);const f=m&&m.unsubscribe&&(()=>{m.unsubscribe()});let g;try{if(l&&Un&&"get"!==i&&"head"!==i&&0!==(g=await Xn(d,n))){let e,i=new Request(t,{method:"POST",body:n,duplex:"half"});if(Ui.isFormData(n)&&(e=i.headers.get("content-type"))&&d.setContentType(e),i.body){const[e,t]=Cn(g,En(Rn(l)));n=Mn(i.body,65536,e,t)}}Ui.isString(u)||(u=u?"include":"omit");const r="credentials"in Request.prototype;p=new Request(t,{...h,signal:m,method:i.toUpperCase(),headers:d.normalize().toJSON(),body:n,duplex:"half",credentials:r?u:void 0});let o=await fetch(p,h);const s=$n&&("stream"===c||"response"===c);if($n&&(a||s&&f)){const e={};["status","statusText","headers"].forEach(t=>{e[t]=o[t]});const t=Ui.toFiniteNumber(o.headers.get("content-length")),[i,n]=a&&Cn(t,En(Rn(a),!0))||[];o=new Response(Mn(o.body,65536,i,()=>{n&&n(),f&&f()}),e)}c=c||"text";let x=await Wn[Ui.findKey(Wn,c)||"text"](o,e);return!s&&f&&f(),await new Promise((t,i)=>{kn(t,i,{data:x,headers:vn.from(o.headers),status:o.status,statusText:o.statusText,config:e,request:p})})}catch(x){if(f&&f(),x&&"TypeError"===x.name&&/Load failed|fetch/i.test(x.message))throw Object.assign(new $i("Network Error",$i.ERR_NETWORK,e,p),{cause:x.cause||x});throw $i.from(x,x&&x.code,e,p)}})};Ui.forEach(Gn,(e,t)=>{if(e){try{Object.defineProperty(e,"name",{value:t})}catch(i){}Object.defineProperty(e,"adapterName",{value:t})}});const Yn=e=>`- ${e}`,Kn=e=>Ui.isFunction(e)||null===e||!1===e,Zn=e=>{e=Ui.isArray(e)?e:[e];const{length:t}=e;let i,n;const r={};for(let o=0;o<t;o++){let t;if(i=e[o],n=i,!Kn(i)&&(n=Gn[(t=String(i)).toLowerCase()],void 0===n))throw new $i(`Unknown adapter '${t}'`);if(n)break;r[t||"#"+o]=n}if(!n){const e=Object.entries(r).map(([e,t])=>`adapter ${e} `+(!1===t?"is not supported by the environment":"is not available in the build"));throw new $i("There is no suitable adapter to dispatch the request "+(t?e.length>1?"since :\n"+e.map(Yn).join("\n"):" "+Yn(e[0]):"as no adapter specified"),"ERR_NOT_SUPPORT")}return n};function Jn(e){if(e.cancelToken&&e.cancelToken.throwIfRequested(),e.signal&&e.signal.aborted)throw new jn(null,e)}function Qn(e){Jn(e),e.headers=vn.from(e.headers),e.data=yn.call(e,e.transformRequest),-1!==["post","put","patch"].indexOf(e.method)&&e.headers.setContentType("application/x-www-form-urlencoded",!1);return Zn(e.adapter||mn.adapter)(e).then(function(t){return Jn(e),t.data=yn.call(e,e.transformResponse,t),t.headers=vn.from(t.headers),t},function(t){return _n(t)||(Jn(e),t&&t.response&&(t.response.data=yn.call(e,e.transformResponse,t.response),t.response.headers=vn.from(t.response.headers))),Promise.reject(t)})}const er="1.11.0",tr={};["object","boolean","number","function","string","symbol"].forEach((e,t)=>{tr[e]=function(i){return typeof i===e||"a"+(t<1?"n ":" ")+e}});const ir={};tr.transitional=function(e,t,i){return(n,r,o)=>{if(!1===e)throw new $i(function(e,t){return"[Axios v"+er+"] Transitional option '"+e+"'"+t+(i?". "+i:"")}(r," has been removed"+(t?" in "+t:"")),$i.ERR_DEPRECATED);return t&&!ir[r]&&(ir[r]=!0),!e||e(n,r,o)}},tr.spelling=function(e){return(e,t)=>!0};const nr={assertOptions:function(e,t,i){if("object"!=typeof e)throw new $i("options must be an object",$i.ERR_BAD_OPTION_VALUE);const n=Object.keys(e);let r=n.length;for(;r-- >0;){const o=n[r],s=t[o];if(s){const t=e[o],i=void 0===t||s(t,o,e);if(!0!==i)throw new $i("option "+o+" must be "+i,$i.ERR_BAD_OPTION_VALUE);continue}if(!0!==i)throw new $i("Unknown option "+o,$i.ERR_BAD_OPTION)}},validators:tr},rr=nr.validators;let or=class{constructor(e){this.defaults=e||{},this.interceptors={request:new rn,response:new rn}}async request(e,t){try{return await this._request(e,t)}catch(i){if(i instanceof Error){let e={};Error.captureStackTrace?Error.captureStackTrace(e):e=new Error;const t=e.stack?e.stack.replace(/^.+\n/,""):"";try{i.stack?t&&!String(i.stack).endsWith(t.replace(/^.+\n.+\n/,""))&&(i.stack+="\n"+t):i.stack=t}catch(n){}}throw i}}_request(e,t){"string"==typeof e?(t=t||{}).url=e:t=e||{},t=Ln(this.defaults,t);const{transitional:i,paramsSerializer:n,headers:r}=t;void 0!==i&&nr.assertOptions(i,{silentJSONParsing:rr.transitional(rr.boolean),forcedJSONParsing:rr.transitional(rr.boolean),clarifyTimeoutError:rr.transitional(rr.boolean)},!1),null!=n&&(Ui.isFunction(n)?t.paramsSerializer={serialize:n}:nr.assertOptions(n,{encode:rr.function,serialize:rr.function},!0)),void 0!==t.allowAbsoluteUrls||(void 0!==this.defaults.allowAbsoluteUrls?t.allowAbsoluteUrls=this.defaults.allowAbsoluteUrls:t.allowAbsoluteUrls=!0),nr.assertOptions(t,{baseUrl:rr.spelling("baseURL"),withXsrfToken:rr.spelling("withXSRFToken")},!0),t.method=(t.method||this.defaults.method||"get").toLowerCase();let o=r&&Ui.merge(r.common,r[t.method]);r&&Ui.forEach(["delete","get","head","post","put","patch","common"],e=>{delete r[e]}),t.headers=vn.concat(o,r);const s=[];let a=!0;this.interceptors.request.forEach(function(e){"function"==typeof e.runWhen&&!1===e.runWhen(t)||(a=a&&e.synchronous,s.unshift(e.fulfilled,e.rejected))});const l=[];let c;this.interceptors.response.forEach(function(e){l.push(e.fulfilled,e.rejected)});let d,u=0;if(!a){const e=[Qn.bind(this),void 0];for(e.unshift(...s),e.push(...l),d=e.length,c=Promise.resolve(t);u<d;)c=c.then(e[u++],e[u++]);return c}d=s.length;let h=t;for(u=0;u<d;){const e=s[u++],t=s[u++];try{h=e(h)}catch(p){t.call(this,p);break}}try{c=Qn.call(this,h)}catch(p){return Promise.reject(p)}for(u=0,d=l.length;u<d;)c=c.then(l[u++],l[u++]);return c}getUri(e){return nn(Tn((e=Ln(this.defaults,e)).baseURL,e.url,e.allowAbsoluteUrls),e.params,e.paramsSerializer)}};Ui.forEach(["delete","get","head","options"],function(e){or.prototype[e]=function(t,i){return this.request(Ln(i||{},{method:e,url:t,data:(i||{}).data}))}}),Ui.forEach(["post","put","patch"],function(e){function t(t){return function(i,n,r){return this.request(Ln(r||{},{method:e,headers:t?{"Content-Type":"multipart/form-data"}:{},url:i,data:n}))}}or.prototype[e]=t(),or.prototype[e+"Form"]=t(!0)});const sr={Continue:100,SwitchingProtocols:101,Processing:102,EarlyHints:103,Ok:200,Created:201,Accepted:202,NonAuthoritativeInformation:203,NoContent:204,ResetContent:205,PartialContent:206,MultiStatus:207,AlreadyReported:208,ImUsed:226,MultipleChoices:300,MovedPermanently:301,Found:302,SeeOther:303,NotModified:304,UseProxy:305,Unused:306,TemporaryRedirect:307,PermanentRedirect:308,BadRequest:400,Unauthorized:401,PaymentRequired:402,Forbidden:403,NotFound:404,MethodNotAllowed:405,NotAcceptable:406,ProxyAuthenticationRequired:407,RequestTimeout:408,Conflict:409,Gone:410,LengthRequired:411,PreconditionFailed:412,PayloadTooLarge:413,UriTooLong:414,UnsupportedMediaType:415,RangeNotSatisfiable:416,ExpectationFailed:417,ImATeapot:418,MisdirectedRequest:421,UnprocessableEntity:422,Locked:423,FailedDependency:424,TooEarly:425,UpgradeRequired:426,PreconditionRequired:428,TooManyRequests:429,RequestHeaderFieldsTooLarge:431,UnavailableForLegalReasons:451,InternalServerError:500,NotImplemented:501,BadGateway:502,ServiceUnavailable:503,GatewayTimeout:504,HttpVersionNotSupported:505,VariantAlsoNegotiates:506,InsufficientStorage:507,LoopDetected:508,NotExtended:510,NetworkAuthenticationRequired:511};Object.entries(sr).forEach(([e,t])=>{sr[t]=e});const ar=function e(t){const i=new or(t),n=ti(or.prototype.request,i);return Ui.extend(n,or.prototype,i,{allOwnKeys:!0}),Ui.extend(n,i,null,{allOwnKeys:!0}),n.create=function(i){return e(Ln(t,i))},n}(mn);ar.Axios=or,ar.CanceledError=jn,ar.CancelToken=class e{constructor(e){if("function"!=typeof e)throw new TypeError("executor must be a function.");let t;this.promise=new Promise(function(e){t=e});const i=this;this.promise.then(e=>{if(!i._listeners)return;let t=i._listeners.length;for(;t-- >0;)i._listeners[t](e);i._listeners=null}),this.promise.then=e=>{let t;const n=new Promise(e=>{i.subscribe(e),t=e}).then(e);return n.cancel=function(){i.unsubscribe(t)},n},e(function(e,n,r){i.reason||(i.reason=new jn(e,n,r),t(i.reason))})}throwIfRequested(){if(this.reason)throw this.reason}subscribe(e){this.reason?e(this.reason):this._listeners?this._listeners.push(e):this._listeners=[e]}unsubscribe(e){if(!this._listeners)return;const t=this._listeners.indexOf(e);-1!==t&&this._listeners.splice(t,1)}toAbortSignal(){const e=new AbortController,t=t=>{e.abort(t)};return this.subscribe(t),e.signal.unsubscribe=()=>this.unsubscribe(t),e.signal}static source(){let t;return{token:new e(function(e){t=e}),cancel:t}}},ar.isCancel=_n,ar.VERSION=er,ar.toFormData=Zi,ar.AxiosError=$i,ar.Cancel=ar.CanceledError,ar.all=function(e){return Promise.all(e)},ar.spread=function(e){return function(t){return e.apply(null,t)}},ar.isAxiosError=function(e){return Ui.isObject(e)&&!0===e.isAxiosError},ar.mergeConfig=Ln,ar.AxiosHeaders=vn,ar.formToJSON=e=>pn(Ui.isHTMLForm(e)?new FormData(e):e),ar.getAdapter=Zn,ar.HttpStatusCode=sr,ar.default=ar;const{Axios:lr,AxiosError:cr,CanceledError:dr,isCancel:ur,CancelToken:hr,VERSION:pr,all:mr,Cancel:fr,isAxiosError:gr,spread:xr,toFormData:br,AxiosHeaders:wr,HttpStatusCode:vr,formToJSON:yr,getAdapter:_r,mergeConfig:jr}=ar;class kr{constructor(e,t,i,n){this.url=e,this.data=t,this.contentType=i,this.cancelToken=ar.CancelToken.source(),this.withCredentials=n,this.xhr=new XMLHttpRequest,this.init()}init(){this.xhr.open("GET",this.url,!0),this.xhr.responseType="arraybuffer",this.xhr.onprogress=e=>{if(e.lengthComputable){const t=e.loaded/e.total*100;this.dispatchEvent("loadDataPregress",{loaded:e.loaded,total:e.total,progress:t})}},this.xhr.onload=()=>{200===this.xhr.status?this.dispatchEvent("loadDataComplete",this.xhr.response):this.dispatchEvent("loadDataError",{status:this.xhr.status,statusText:this.xhr.statusText})},this.xhr.onerror=()=>{this.dispatchEvent("loadDataError",{message:"Network error occurred"})},this.xhr.onabort=()=>{this.dispatchEvent("loadDataCancel",{message:"Request was cancelled"})},this.xhr.send()}dispatchEvent(e,t){const i=new CustomEvent(e,{detail:t});document.dispatchEvent(i)}cancel(){this.xhr&&this.xhr.abort()}delete(){this.cancel(),this.xhr=null,this.dispatchEvent("deleteComplete",{message:"Connection deleted"})}async serverData(e){await ar.get(this.url,e,{cancelToken:this.cancelToken.token,onDownloadProgress:e=>{let t=new CustomEvent("loadDataPregress",{bubbles:!0,detail:{loaded:e.loaded,total:e.total}});document.dispatchEvent(t)}}).then(e=>{let t=new CustomEvent("loadDataComplete",{detail:{res:e.data}});document.dispatchEvent(t)}).catch(function(e){ar.isCancel(e)})}async serverUpdate(){let e,t;var i;"form"===this.contentType?(e="multipart/form-data",i=this.data,t=Object.keys(i).reduce((e,t)=>(e.append(t,i[t]),e),new FormData)):"app"===this.contentType&&(e="application/json",t=this.data);let n={"Content-Type":e};1==this.withCredentials&&(n.withCredentials=!0),await ar.post(this.url,t,{headers:n}).then(e=>{this.dispatchEvent({type:"loadDataComplete",message:{res:e}})}).catch(e=>{e&&400===e.response.status&&this.dispatchEvent({type:"loadDataComplete",message:{res:e.response},err:!0})})}async serverDelete(){await ar.delete(this.url).then(e=>{this.dispatchEvent({type:"loadDataComplete",message:{res:e.data}})}).catch(e=>{})}}class Er{constructor(e=null){this.container=e||document.body,this.isPlaying=!0,this.isMobile=this.isTouchDevice(),this.targetDelta=0,this.touchStartY=0,this.touchCurrentY=0;const t=new p({antialias:!0,alpha:!0});t.setPixelRatio(Math.min(window.devicePixelRatio,1)),t.setSize(this.container.clientWidth,this.container.clientHeight),this.renderer=t,this.container.appendChild(this.renderer.domElement),this.container.classList.add("symbol-container");const i=new m;this.scene=i;{const e=16777215,t=60,n=90;i.fog=new f(e,t,n)}const n=window.innerWidth/window.innerHeight,r=new g(-10*n,10*n,10,-10,1,1e4);r.position.set(0,0,100),this.camera=r,this.time=0,this.isPlaying=!0}loadData(e,t,i,n,r){const o=new kr(e);document.addEventListener("loadDataPregress",e=>t(e,n)),document.addEventListener("loadDataComplete",e=>i(e,n)),o.serverData(r)}loadModel(e,t,i,n){(new x).load(decodeURI(e),e=>{i(e,n)},e=>{t(e.loaded,e.total,n)},e=>{})}update(){}play(){this.isPlaying||(this.isPlaying=!0,this.render())}stop(){this.isPlaying=!1}render(){this.isPlaying&&(requestAnimationFrame(this.render.bind(this)),this.update(),this.renderer.render(this.scene,this.camera))}setupResize(){window.onresize=this.resize.bind(this)}resize(){const e=window.innerWidth/window.innerHeight;this.camera.left=-10*e,this.camera.right=10*e,this.camera.top=10,this.camera.bottom=-10,this.camera.updateProjectionMatrix(),this.renderer.setSize(window.innerWidth,window.innerHeight)}isTouchDevice(){return"ontouchstart"in window||navigator.maxTouchPoints>0||navigator.msMaxTouchPoints>0}destroy(){this.isPlaying=!1,this.renderer&&(this.renderer.dispose(),this.renderer.domElement&&this.renderer.domElement.parentNode&&this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)),this.scene&&this.scene.clear(),this.stats&&this.stats.dom&&this.stats.dom.parentNode&&this.stats.dom.parentNode.removeChild(this.stats.dom),window.onresize=null,this.container=null,this.renderer=null,this.scene=null,this.camera=null,this.stats=null}}class Cr{constructor(e){this.index=e,this.ar={x:0,y:0,z:0},this.arv={x:0,y:0,z:0},this.scrollTop=0,this.targetX=0,this.targetY=0,this.targetZ=0,this.currentX=0,this.currentZ=0,this.currentY=0,this.isMobile=window.innerWidth<1025}update(){0!=this.arv.x&&(this.ar.x+=this.arv.x),0!=this.arv.y&&(this.ar.y+=this.arv.y),0!=this.arv.z&&(this.ar.z+=this.arv.z),1==this.index?this.isMobile?(this.targetX=.0015*this.scrollTop,this.targetY=8e-4*this.scrollTop,this.targetZ=.0013*this.scrollTop):(this.targetX=9e-4*this.scrollTop,this.targetY=5e-4*this.scrollTop,this.targetZ=7e-4*this.scrollTop):this.isMobile?(this.targetX=.0015*this.scrollTop,this.targetY=8e-4*this.scrollTop,this.targetZ=.0013*this.scrollTop):(this.targetX=8e-4*this.scrollTop,this.targetY=3e-4*this.scrollTop,this.targetZ=6e-4*this.scrollTop),this.currentX+=.1*(this.targetX-this.currentX),this.currentZ+=.1*(this.targetZ-this.currentZ),this.currentY+=.1*(this.targetY-this.currentY)}resetAutoRotation(){this.ar.x=0,this.ar.y=0,this.ar.z=0,this.arv.x=0,this.arv.y=0,this.arv.z=0}}class Rr extends Er{constructor(e,t={}){super(e),this.options={showGUI:!0,showStats:!0,...t},this.distanceValue={large:100,small:100},this.projectId="project-init",this.isMobile=this.isTouchDevice(),this.onReadyCallback=t.onReady||null,this.onReadyCalled=!1,this.init()}init(){this.scene.background=null,this.camera&&(this.camera.position.set(0,0,100),this.camera.zoom=.3,this.camera.updateProjectionMatrix());const e=new b(16777215,.99);this.scene.add(e),this.light=e;const t=new w(16777215,0,1e3);t.position.set(100,100,300),this.scene.add(t),this.pointLight1=t;const i=new w(16777215,0,1e3);i.position.set(-100,-100,300),this.scene.add(i),this.pointLight2=i,this.mouse=new v,this.isInit=0,this.initObject(),this.resize(),this.render(),this.setupResize(),this.onReadyCallback&&!this.onReadyCalled&&(this.onReadyCalled=!0,requestAnimationFrame(()=>{this.onReadyCallback()}))}test(){}createObject(e){const t=new y;t.rotation.set(0,0,O.toRadian(90));const i=new y;t.add(i),t.model=i;const n=new _(1,1,1),r=new j({color:0,transparent:!0,metalness:0,roughness:1,side:k,opacity:1});t.material=r,t.partLength=1,t.partThick=1;const o=t.partLength,s=t.partThick,a=new E(n,r);a.scale.set(o,s,s),i.add(a),t.part_1=a;const c=new E(n,r);c.scale.set(s,o,s),i.add(c),t.part_2=c;const d=new E(n,r);d.scale.set(s,s,o),i.add(d),t.part_3=d,this.scene.add(t),this[`group${e}`]=t;const u=new Cr(e);if(this[`group${e}`].info=u,this[`group${e}`].name=`group_${e}`,2==e){const e=(()=>{const e="ontouchstart"in window,t=navigator.maxTouchPoints>0,i=navigator.msMaxTouchPoints>0,n=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;return e||t||i||n})();t._resize=()=>{let i=10;if(e)i=10;else{i=35;i+=i*(window.innerWidth/window.innerHeight-1920/1080),i=Math.max(i,15),t.symbolDist=i}t.symbolDist=i;const n=Number(t.position.x);n>0?t.position.x=`${t.symbolDist}`:n<0&&(t.position.x=`-${t.symbolDist}`)},t._resize();try{t.visible=!1}catch(h){}}1==e&&l.set(t.rotation,{z:O.toRadian(180)})}initObject(){this.createObject(1),this.createObject(2),this.isInit=1}setMode(e,t){}showObject(e,t=.8,i="white"){l.killTweensOf(e.position,"z"),l.killTweensOf(e,"visible"),l.set(e,{visible:!0}),"group_1"==e.name?l.to(e.position,{duration:.6,z:0,ease:"expo.out"}):l.to(e.position,{duration:.7,z:0,ease:"expo.out"})}hideObject(e,t=.8){l.killTweensOf(e.position,"z"),l.killTweensOf(e,"visible"),l.set(e,{visible:!1,delay:t}),l.to(e.position,{duration:.8,z:"group_1"===e.name?-40:-150,ease:"power2.inOut"})}resetModeWhite(e){}resetModeBlack(e){}updateFog(){}resetFog(e=1.1){if(!document.body.dataset.effectFog)return;document.body.dataset.effectFog="false",l.killTweensOf(this.scene.effectFog,"near,far");l.to(this.scene.fog,{duration:e,near:88,far:115,ease:"expo.inOut"})}updateFogColor(e){const{val:t,duration:i=0,ease:n="expo.inOut",kill:r,delay:o=0}=e,s=new C(t);l.killTweensOf(this.scene.fog.color,"r,g,b"),0==i?this.scene.fog.color.set(s):l.to(this.scene.fog.color,{duration:i,r:s.r,g:s.g,b:s.b,ease:n,delay:o})}updatePartColor(e){const{group:t=this.group1,val:i,duration:n=0,ease:r="expo.inOut",kill:o,delay:s=0}=e,a=new C(i);l.killTweensOf(t.material.color,"r,g,b"),0==n?t.material.color.set(a):l.to(t.material.color,{duration:n,r:a.r,g:a.g,b:a.b,ease:r,delay:s})}updateLightColor(e){const{val:t,duration:i=0,ease:n="expo.inOut",kill:r,delay:o=0}=e,s=new C(t);l.killTweensOf(this.pointLight3.color,"r,g,b"),0==i?this.pointLight3.color.set(s):l.to(this.pointLight3.color,{duration:i,r:s.r,g:s.g,b:s.b,ease:n,delay:o})}updatePartScale(e){const{group:t=this.group1,duration:i=0,ease:n="expo.out",length:r,thick:o,delay:s=0}=e,a=r||t.partLength,c=o||t.partThick;l.killTweensOf(t.part_1.scale,"x,y,z"),l.killTweensOf(t.part_2.scale,"x,y,z"),l.killTweensOf(t.part_3.scale,"x,y,z"),0==i?(l.set(t.part_1.scale,{x:a,y:c,z:c,delay:s,onComplete:()=>{t.partLength=a,t.partThick=c}}),l.set(t.part_2.scale,{x:c,y:a,z:c,delay:s}),l.set(t.part_3.scale,{x:c,y:c,z:a,delay:s})):(l.to(t.part_1.scale,{duration:i,x:a,y:c,z:c,delay:s,ease:n,onComplete:()=>{t.partLength=a,t.partThick=c}}),l.to(t.part_2.scale,{duration:i,x:c,y:a,z:c,delay:s,ease:n}),l.to(t.part_3.scale,{duration:i,x:c,y:c,z:a,delay:s,ease:n}))}updateBgColor(e,t){l.to(this.scene.background,{duration:t,color:e})}update(){if(this.isInit){if(0==this.group1.info.arv.x&&0==this.group1.info.arv.y&&0==this.group1.info.arv.z);else{const e=this.group1.info;e.update(),this.group1.model.rotation.set(e.ar.x,e.ar.y,e.ar.z),this.group1.rotation.z=e.currentZ,this.group1.rotation.y=e.currentY}if(0==this.group2.info.arv.x&&0==this.group2.info.arv.y&&0==this.group2.info.arv.z);else{const e=this.group2.info;e.update(),this.group2.model.rotation.set(e.ar.x,e.ar.y,e.ar.z),this.group2.rotation.z=e.currentZ,this.group2.rotation.y=e.currentY}}}resetMode(e,t=0,i){if(document.body.classList.contains("is-complete")){const i="power1.out";"light"===e?(l.killTweensOf(this.light,"intensity"),l.killTweensOf(this.pointLight1,"intensity"),l.killTweensOf(this.pointLight2,"intensity"),l.to(this.light,{duration:.5*t,intensity:1,ease:i}),this.updateFogColor({duration:t,ease:i,val:16777215,kill:!0}),this.updatePartColor({group:this.group2,duration:t,ease:i,val:16777215,kill:!0}),this.updatePartColor({group:this.group1,duration:t,ease:i,val:16777215,kill:!0})):"dark"===e&&(l.killTweensOf(this.light,"intensity"),l.killTweensOf(this.pointLight1,"intensity"),l.killTweensOf(this.pointLight2,"intensity"),l.to(this.light,{duration:.5*t,intensity:0,ease:i}),l.to(this.pointLight1,{duration:.5*t,intensity:0,ease:i}),l.to(this.pointLight2,{duration:.5*t,intensity:0,ease:i}),"large"==document.body.dataset.size?this.updatePartColor({group:this.group2,duration:t,ease:i,val:0,kill:!0}):this.updatePartColor({group:this.group1,duration:t,ease:i,val:0,kill:!0}),this.updateFogColor({duration:t,ease:i,val:0,kill:!0}))}}modeWhite(e=0,t=!1){const i="power2.out",n=.5;l.killTweensOf(this.light,"intensity"),l.killTweensOf(this.pointLight1,"intensity"),l.killTweensOf(this.pointLight2,"intensity"),l.killTweensOf(this.pointLight1.position,"z"),l.killTweensOf(this.pointLight2.position,"z"),this.updatePartColor({group:this.group2,duration:n,val:16777215,ease:i,kill:!0}),this.updatePartColor({group:this.group1,duration:n,val:16777215,ease:i,kill:!0}),this.updateFogColor({val:16777215,duration:n,ease:i,kill:!0}),l.to(this.light,{duration:.25,intensity:.5,ease:i}),l.to(this.pointLight1,{duration:.25,intensity:.5,ease:i}),l.to(this.pointLight2,{duration:.25,intensity:.5,ease:i}),l.to(this.pointLight1.position,{duration:.25,z:300,ease:i}),l.to(this.pointLight2.position,{duration:.25,z:300,ease:i})}modeBlack(e=0,t=!1){const i="power1.out",n=.5;l.killTweensOf(this.light,"intensity"),l.killTweensOf(this.pointLight1,"intensity"),l.killTweensOf(this.pointLight2,"intensity"),l.killTweensOf(this.pointLight1.position,"z"),l.killTweensOf(this.pointLight2.position,"z"),this.updatePartColor({group:this.group2,duration:n,val:0,ease:i,kill:!0}),this.updatePartColor({group:this.group1,duration:n,val:0,ease:i,kill:!0}),this.updateFogColor({val:0,duration:n,ease:i,kill:!0}),l.to(this.light,{duration:.25,intensity:0,ease:i}),l.to(this.pointLight1,{duration:.25,intensity:15,ease:i}),l.to(this.pointLight2,{duration:.25,intensity:15,ease:i}),l.to(this.pointLight1.position,{duration:.25,z:0,ease:i}),l.to(this.pointLight2.position,{duration:.25,z:0,ease:i})}onKeyUp(e){(e=e||window.event).keyCode}onKeyDown(e){if(192===(e=e||window.event).keyCode)this.test()}}const Sr=e.forwardRef(({className:i,style:n,showGUI:r=!0,showStats:o=!0,onReady:s=null},a)=>{const l=e.useRef(),c=e.useRef(),d=e.useRef(!1),u=e.useRef(!1);return e.useImperativeHandle(a,()=>c.current||null,[]),e.useEffect(()=>{const e=l.current;if(e&&!c.current&&!d.current){d.current=!0;try{const t=new Rr(e,{showGUI:r,showStats:o,onReady:s});t&&(c.current=t,u.current=!0,a&&"object"==typeof a&&(a.current=t))}catch(t){d.current=!1}return()=>{c.current&&(c.current=null,d.current=!1,u.current=!1)}}},[]),t.jsx("div",{ref:l,className:i,style:{width:"100%",height:"100%",position:"absolute",zIndex:1,...n}})}),Or=e.forwardRef(({bgColor:e="transparent",onReady:i,...n},r)=>t.jsx(Sr,{ref:r,showGUI:!1,showStats:!1,bgColor:e,onReady:i,...n}));Or.displayName="Symbol",l.registerPlugin(a);const Tr=({src:i,srcMobile:n,aspectRatio:r="1920/1080",style:o,full:s=!1,sectionName:c,backgroundColor:d="transparent",noScrub:u=!1,lineColor:h="transparent",moveY:p=30})=>{const m=e.useRef(null),f=e.useRef(null),g=e.useRef(null),x=e.useRef(null),{isMobileOrTablet:b}=D();return e.useEffect(()=>{if(u||!m.current||!f.current)return;return b?void 0:(l.set(f.current,{scale:1,y:`-${p}%`,willChange:"transform"}),g.current=l.to(f.current,{y:`${p}%`,ease:"none",scrollTrigger:{id:"parallax-trigger",scroller:"#smooth-wrapper",pinType:"transform",trigger:m.current,start:()=>"top bottom",end:()=>"110% top",scrub:!0}}),x.current=a.create({trigger:m.current,start:"top bottom",end:"bottom top",onLeave:()=>{var e,t;return null==(t=null==(e=g.current)?void 0:e.scrollTrigger)?void 0:t.disable()},onLeaveBack:()=>{var e,t;return null==(t=null==(e=g.current)?void 0:e.scrollTrigger)?void 0:t.disable()},onEnter:()=>{var e,t;return null==(t=null==(e=g.current)?void 0:e.scrollTrigger)?void 0:t.enable()},onEnterBack:()=>{var e,t;return null==(t=null==(e=g.current)?void 0:e.scrollTrigger)?void 0:t.enable()}}),()=>{var e,t;null==(e=g.current)||e.kill(),null==(t=x.current)||t.kill()})},[u,p]),t.jsx(Nr,{$aspectRatio:r,$full:s,ref:m,className:"image-with-parallax",style:{background:d,...o,"--lineColor":h},children:t.jsxs(Lr,{ref:f,children:[t.jsx(Ar,{src:i,className:"is-pc",alt:"",loading:"lazy"}),t.jsx(Ar,{src:n,className:"is-mobile",alt:"",loading:"lazy"})]})})},Ar=h.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center center;
`,Lr=h.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  will-change: transform;
  transform-origin: center center;
`,Nr=h.div`
  position: relative;
  width: 100%;
  margin: 0 auto;
  aspect-ratio: ${e=>e.$aspectRatio};
  border-radius: 30px;
  overflow: hidden;

  @media (max-width: 1024px) {
    aspect-ratio: unset;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
  }

  .device-mobile & {
    overflow: visible !important;
  }

  &::before {
    position: absolute;
    content: '';
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 4px;
    background-color: var(--lineColor);
  }
`;l.registerPlugin(a,s);const zr=({src:i,srcMobile:n,aspectRatio:r="1920/1080",mobileAspectRatio:o="1920/1080",style:a,full:l=!1,sectionName:c})=>{const d=e.useRef(null),u=e.useRef(null);return s(()=>{},{scope:d}),t.jsxs(Pr,{$aspectRatio:r,$mobileAspectRatio:o,$full:l,ref:d,$sectionName:c,className:"sticky-image-container",children:[t.jsx("img",{src:i,alt:"",loading:"lazy",ref:u,className:n?"is-pc":"",style:{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"cover",willChange:"transform"}}),n&&t.jsx("img",{className:"is-mobile",src:n,alt:"",loading:"lazy",style:{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"cover"}})]})},Pr=h.div`
  position: relative;
  width: 100%;
  max-width: 100vw;
  aspect-ratio: ${e=>e.$aspectRatio};
  min-width: ${e=>e.$full?"100vw":"auto"};
  font-size: 0;
  will-change: transform;
  backface-visibility: hidden;

  ${e=>"imageOsulloc"===e.$sectionName&&u`
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 2px;
        transform: translateY(-50%);
        background-color: var(--text-color-black);
        z-index: 1;
      }
    `}

  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: var(--scale);
    will-change: transform;
    backface-visibility: hidden;
  }
  @media (max-width: 1024px) {
    aspect-ratio: ${e=>e.$mobileAspectRatio};

    min-height: 100dvh;
  }
`;h.div.withConfig({shouldForwardProp:e=>!["isActive"].includes(e)})`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: max-content;
  min-width: 40px;
  border: 1px solid var(--text-color-white);
  padding: 4px 8px;
  max-height: 48px;
  border-radius: 12px;
  background-color: ${e=>e.isActive?"var(--text-color-white)":"transparent"};
  transition: background-color 0.2s ease;
  cursor: pointer;
`,h.div.withConfig({shouldForwardProp:e=>!["isActive"].includes(e)})`
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: ${e=>e.isActive?"var(--text-color-black)":"var(--text-color-white)"};
  font-size: 1.2rem;
  transition: color 0.2s ease;
`,l.registerPlugin(a);const Ir=({children:i,className:n,style:r,sectionName:o})=>{const s=e.useRef(),c=e.useRef([]),{isMobileOrTablet:d}=D();d&&(document.querySelector("#smooth-wrapper")||document.body);const u=()=>{const e=l.utils.toArray(".main-title",s.current);if(e.length<=0)return;const t=.5*window.innerHeight,i=e.map(e=>{const i=e.getBoundingClientRect(),n=i.top+i.height/2;return Math.abs(n-t)}),n=Math.min(...i),r=i.indexOf(n);e.forEach((e,t)=>{let i="";const o=e.clientHeight;i=n<=o&&t===r?"now":t<r?"prev":"next",e.dataset.state=i})};return e.useEffect(()=>((()=>{if(!s.current)return;Object.values(c.current).forEach(e=>{e&&e.kill&&e.kill()}),c.current={};const e=l.utils.toArray(".main-title",s.current),t=l.utils.toArray(".main-title-row",s.current);let i;i=d?a.create({trigger:s.current,start:`top-=${.5*window.innerHeight}px bottom`,end:`bottom+=${.5*window.innerHeight}px top`,id:"baseManifesto-animate",invalidateOnRefresh:!0,immediateRender:!1,onToggle:e=>{},onUpdate:()=>{u()},onLeave:()=>{e.forEach(e=>{e.dataset.state="next"})},onLeaveBack:()=>{e.forEach(e=>{e.dataset.state="prev"})}}):a.create({trigger:s.current,start:`top-=${.5*window.innerHeight}px bottom`,end:`bottom+=${.5*window.innerHeight}px top`,id:"baseManifesto-animate",invalidateOnRefresh:!0,immediateRender:!1,onToggle:e=>{},onUpdate:e=>{u();const i=e.progress;t.forEach((e,t)=>{const n=11*i+20,r=.09*window.innerWidth;let s=.05*window.innerWidth+Math.cos(O.toRadian(20*-t)+n)*r;if("newIntroManifesto"===o);else if("newIntroManifesto2"===o){const e=12*i-4,n=145;s=.3*-window.innerWidth+Math.sin(O.toRadian(20*-t)+e)*n}else if("newIntroManifesto3"===o){const e=8*i,n=160;s=Math.sin(O.toRadian(20*t)+e+O.toRadian(180))*n}l.set(e,{x:s,force3D:!0})})},onLeave:()=>{e.forEach(e=>{e.dataset.state="next"})},onLeaveBack:()=>{e.forEach(e=>{e.dataset.state="prev"})}}),c.current={scrollAnimTrigger:i}})(),()=>{Object.values(c.current).forEach(e=>{e&&e.kill&&e.kill()}),c.current={}}),[]),t.jsx("div",{ref:s,className:n,style:r,children:i})},Br=h.div`
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0 16px;
  gap: var(--gap80);
  padding-bottom: 20dvh;
  @media (max-width: 1024px) {
    gap: var(--gap48);
    margin-top: 0 !important;
    padding-top: 0 !important;

    &:has(.badge) {
      position: relative;
      padding-top: 64px !important;
      padding-bottom: 64px !important;
      position: unset;
    }
    .badge-wrap {
      margin-bottom: 0 !important;
      margin-top: 0 !important;
    }
  }
`,Mr=h.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  margin-left: 0 !important;
  margin-right: 0 !important;
  &:has(.badge) {
    display: flex;
    flex-direction: column;
    width: max-content !important;
    .badge {
      position: relative;
    }
    @media (max-width: 1024px) {
    }
  }
  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100% !important;
    margin-left: 0 !important;

    position: unset;
    &.mb-align-right {
      .device-mobile & {
        align-items: flex-end !important;
        text-align: right !important;
      }
    }
  }
  &.row-full {
    width: 100% !important;
  }
`,Dr=h.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  z-index: 3;
  .width-full & {
    width: max-content !important;

    margin-left: auto !important;
    margin-right: auto !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
  }
  .width-fit & {
    width: max-content !important;
  }
  @media (max-width: 1024px) {
    width: 100% !important;
    margin-left: 0 !important;
    position: unset;
  }
`,Hr=h.div`
  ${F.Header_Huge}
  color: var(--text-color-white);
  white-space: nowrap;
  z-index: 2;
  color: #808080;
  margin-left: 0 !important;
  margin-right: 0 !important;
  width: max-content !important;
  .width-full & {
    width: 100% !important;
  }
  @media (min-width: 1025px) {
    &.is-first {
      color: #808080 !important;
    }
  }
  &[data-state='now'] {
    color: #fff;
  }
  &[data-state='prev'] {
    color: #4c4c4c;
    transition: color 0.8s var(--expoOut);
  }
  &[data-state='next'] {
    color: #4c4c4c;
    transition: color 0.8s var(--expoOut);
  }
  @media (max-width: 1024px) {
    font-size: clamp(14vmin, 7.3vw, 14rem);
  }
  &[data-theme='light'] {
    color: #808080;
    &[data-state='now'] {
      color: var(--text-color-black);
    }
    &[data-state='prev'] {
      color: #cacaca;
      transition: color 0.8s var(--expoOut);
    }
    &[data-state='next'] {
      color: #cacaca;
      transition: color 0.8s var(--expoOut);
    }
  }

  &.check-trigger {
    @media (max-width: 1024px) {
      align-items: flex-end;
      justify-content: flex-end;
      text-align: right;
      span {
        justify-content: flex-end;
      }
      + .main-title-row {
        order: -1;
        justify-content: flex-end;
        text-align: right;
      }
    }
  }
  &.main-title-row {
    will-change: transform;
  }
`;h.div`
  ${F.Body_Small}
  color: var(--text-color-white);
  max-width: var(--grid-2);
  z-index: 2;

  @media (max-width: 1024px) {
    padding: var(--gap120) 0 var(--gap104) 0;
  }
`;const Fr=h.div`
  position: relative;
  overflow: visible;
  display: flex;
  flex-direction: row;
  gap: var(--gap40);

  .badge {
    margin-top: 6px !important;
  }

  @media (max-width: 1024px) {
    gap: 0;
    position: unset;
    .badge {
      width: max-content;
      margin-left: var(--grid-gap);
      &.align-right {
        top: 0;
        position: absolute;
        left: 0;
        left: auto;
        top: auto;
        bottom: 0;
      }
    }
  }
`,Vr=()=>t.jsx(Ir,{sectionName:"newIntroManifesto",children:t.jsxs(Br,{className:"width-fit",children:[t.jsx(Mr,{className:"manifesto-row",children:t.jsxs(Dr,{className:"manifesto-column",children:[t.jsxs(Hr,{className:"main-title main-title-row",children:["Wider ",t.jsx("br",{className:"is-mobile"}),"in view,"]}),t.jsx(Hr,{className:"main-title main-title-row","data-start":!0,children:"deeper in"}),t.jsx(Hr,{className:"main-title main-title-row","data-start":!0,children:"thought"})]})}),t.jsx(Mr,{className:"manifesto-row row-full",children:t.jsxs(Dr,{className:"manifesto-column",children:[t.jsx(Hr,{className:"main-title main-title-row",children:"Better in "}),t.jsxs(Fr,{style:{width:"max-content"},className:"badge main-title-row mb-align-left",children:[t.jsxs(Hr,{className:"main-title",children:["experi",t.jsx("br",{className:"is-mobile"}),"ence"]}),t.jsx("div",{className:"badge align-right",children:t.jsx(te,{text:"Explorative",theme:"black",size:"large",enableScrollTrigger:!0,className:"badge-component"})})]})]})}),t.jsx(Mr,{className:"manifesto-row row-full width-fit2",children:t.jsxs(Dr,{className:"manifesto-column",children:[t.jsx(Hr,{className:"main-title main-title-row",children:"Insight"}),t.jsx(Hr,{className:"main-title main-title-row",children:"forms"}),t.jsxs(Hr,{className:"main-title main-title-row",children:["struct",t.jsx("br",{className:"is-mobile"}),"ure"]})]})}),t.jsx(Mr,{className:"manifesto-row row-full mb-align-right",children:t.jsxs(Dr,{className:"manifesto-column",children:[t.jsx(Hr,{className:"main-title main-title-row",children:"Structure"}),t.jsx(Hr,{className:"main-title main-title-row",children:"drives "}),t.jsxs(Fr,{style:{width:"max-content"},className:"badge main-title-row last-badge",children:[t.jsx("div",{className:"badge",style:{width:"max-content"},children:t.jsx(te,{text:"Articulate",theme:"black",size:"large",enableScrollTrigger:!0,className:"badge-component"})}),t.jsxs(Hr,{className:"main-title",children:["experi",t.jsx("br",{className:"is-mobile"}),"ence"]})]})]})})]})}),Ur=()=>t.jsx(Ir,{sectionName:"newIntroManifesto2",children:t.jsxs(Br,{style:{alignItems:"center",justifyContent:"center",textAlign:"center",marginTop:"var(--gap500)"},children:[t.jsx("div",{className:"badge-wrap",children:t.jsx(te,{text:"EMPATHETIC",theme:"white",size:"large",enableScrollTrigger:!0})}),t.jsx(Mr,{"data-start":!0,children:t.jsxs(Dr,{children:[t.jsx(Hr,{className:"main-title main-title-row","data-theme":"light",children:"DESIGN AS"}),t.jsx(Hr,{className:"main-title main-title-row","data-theme":"light","data-start":!0,children:"USERS"})]})}),t.jsx(Mr,{style:{alignItems:"flex-start",textAlign:"left"},children:t.jsxs(Dr,{children:[t.jsx(Hr,{className:"main-title main-title-row mb-align-left","data-theme":"light",children:"EVERY MOVE"}),t.jsx(Hr,{className:"main-title main-title-row mb-align-left","data-theme":"light",children:"REFLECT"}),t.jsxs(Hr,{className:"main-title main-title-row mb-align-left","data-theme":"light",children:["HOW WE ",t.jsx("br",{className:"is-mobile"})," FEEL"]})]})}),t.jsx(Mr,{style:{minWidth:"max-content",alignItems:"flex-start",textAlign:"left"},children:t.jsxs(Dr,{children:[t.jsx(Hr,{className:"main-title main-title-row mb-align-left","data-theme":"light",children:"DESIGN TO"}),t.jsx(Hr,{className:"main-title main-title-row mb-align-left","data-theme":"light",children:"SOLVE"})]})}),t.jsx(Mr,{style:{minWidth:"max-content",alignItems:"flex-start",textAlign:"left"},children:t.jsxs(Dr,{children:[t.jsx(Hr,{className:"main-title main-title-row mb-align-left","data-theme":"light",children:"NOT TO"}),t.jsxs(Hr,{className:"main-title main-title-row mb-align-left","data-theme":"light",children:["JUST SHOW"," "]})]})}),t.jsx(Mr,{className:"end-trigger",children:t.jsxs(Dr,{children:[t.jsx(Hr,{className:"main-title main-title-row","data-theme":"light",children:"bUILD WITH"}),t.jsx(Hr,{className:"main-title main-title-row","data-theme":"light",children:"REASON"})]})}),t.jsx("div",{className:"badge-wrap b-last",children:t.jsx(te,{text:"Strategic",theme:"white",size:"large",enableScrollTrigger:!0,"data-end":!0})})]})}),$r=()=>t.jsx(Ir,{sectionName:"newIntroManifesto3",children:t.jsxs(Br,{style:{alignItems:"center",justifyContent:"center",textAlign:"center",marginTop:"var(--gap300)"},className:"width-full",children:[t.jsx("div",{className:"badge-wrap",children:t.jsx(te,{text:"Intuitive",size:"large",enableScrollTrigger:!0})}),t.jsx(Mr,{"data-start":!0,children:t.jsxs(Dr,{children:[t.jsx(Hr,{className:"main-title main-title-row",children:"invesT"}),t.jsx(Hr,{className:"main-title main-title-row","data-start":!0,children:"in the"}),t.jsx(Hr,{className:"main-title main-title-row",children:"ecosytem"})]})}),t.jsx(Mr,{children:t.jsxs(Dr,{children:[t.jsx(Hr,{className:"main-title main-title-row",children:"not for"}),t.jsx(Hr,{className:"main-title main-title-row",children:"SPEED"}),t.jsx(Hr,{className:"main-title main-title-row",children:"BUT FOR"}),t.jsx(Hr,{className:"main-title main-title-row",children:"CONTINUITY"})]})}),t.jsx(Mr,{className:"end-trigger",children:t.jsxs(Dr,{children:[t.jsx(Hr,{className:"main-title main-title-row",children:"BUILD VOICE"}),t.jsx(Hr,{className:"main-title main-title-row",children:"NOT NOISE"}),t.jsx(Hr,{className:"main-title main-title-row",children:"NOT TO"}),t.jsx(Hr,{className:"main-title main-title-row mb-gap",children:"SO IT FEELS"}),t.jsx(Hr,{className:"main-title main-title-row",children:"inevitable"})]})}),t.jsx("div",{className:"badge-wrap",children:t.jsx(te,{text:"ENDURING",size:"large",enableScrollTrigger:!0,"data-end":!0})})]})}),Wr=h.div`
  width: 100vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 40dvh calc(var(--grid-1) + calc(var(--grid-gap) * 2)) 27dvh;
  @media (min-width: 1025px) {
    padding-left: 16px;
    padding-right: 16px;
  }
  @media (max-width: 1024px) {
    width: 100%;

    padding: 48vw 16px 48vw;
  }
`;h.div`
  position: relative;
  ${F.Body_Medium}
  color: var(--text-color-white);
  z-index: 2;
  overflow: hidden;
`;const qr=h.div`
  position: relative;
  ${F.Header_Large}
  color: var(--text-color-white);
  z-index: 2;
  overflow: hidden;
`,Xr=h.div`
  color: var(--text-color-white);
`,Gr=h.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  width: var(--grid-6);
  gap: var(--gap32);
  z-index: 3;
  text-align: center;
  > div {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  @media (max-width: 1024px) {
    width: 100%;
    gap: var(--gap40);
  }
`;h.div`
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  background-color: #f4f4f4;
`;const Yr=()=>{e.useRef(),e.useRef();const i=e.useRef(),{containerRef:n}=ke({enableDeviceFiltering:!0,start:"50% bottom"}),{containerRef:r}=ke({enableDeviceFiltering:!0});return t.jsx(Wr,{ref:i,children:t.jsxs(Gr,{style:{width:"100%"},children:[t.jsxs("div",{className:"sub-title-container is-pc",ref:n,children:[t.jsx(qr,{children:t.jsx(Xr,{className:"sub-title",children:"We document, share, and refine"})}),t.jsx(qr,{children:t.jsx(Xr,{className:"sub-title",children:"not just for ourselves,"})}),t.jsx(qr,{children:t.jsx(Xr,{className:"sub-title",children:"but to grow as a collective effort."})})]}),t.jsxs("div",{className:"sub-title-container is-mobile",ref:r,children:[t.jsx(qr,{children:t.jsx(Xr,{className:"sub-title",children:"We document, "})}),t.jsx(qr,{children:t.jsx(Xr,{className:"sub-title",children:"share, and refine. "})}),t.jsx(qr,{children:t.jsx(Xr,{className:"sub-title",children:"Not just for "})}),t.jsx(qr,{children:t.jsx(Xr,{className:"sub-title",children:"ourselves,"})}),t.jsx(qr,{children:t.jsx(Xr,{className:"sub-title",children:"but to grow as."})}),t.jsx(qr,{children:t.jsx(Xr,{className:"sub-title",children:"a collective effort."})})]}),t.jsx("div",{"data-end":!0,children:t.jsx(te,{text:"ENVIRONMENT",theme:"black",direction:"center",enableScrollTrigger:!0})})]})})},Kr=()=>t.jsx("svg",{width:"44",height:"44",viewBox:"0 0 44 44",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:t.jsx("path",{d:"M19.9451 2C19.81025 5.51117 25.1929 5.35675 25.2485 2H29.5417C29.7135 4.9669 27.4128 7.23764 24.7838 8.11607L24.7434 11.8728C29.1452 12.2601 33.3021 15.1131 35.5523 18.885C40.4036 27.0161 36.9488 37.5269 28.0921 40.9267C26.2973 41.6162 24.5032 42 22.5968 42C20.8849 42 19.2635 41.6888 17.6192 41.1671C11.6888 39.2853 7.27593 33.0034 7.24431 26.75C7.23311 24.534 7.87755 22.317 8.79026 20.3128C10.798 15.8953 15.571 12.2449 20.4477 11.8728L20.4174 8.11101C17.5055 7.30346 15.7933 4.94665 15.3993 2.00253H19.9451V2ZM11.6112 28.8337C13.0431 37.0915 22.9579 40.8532 29.5443 35.5447C35.2669 30.9323 35.1987 22.4823 29.4079 17.9534C22.9327 12.8905 13.1971 16.5611 11.6086 24.5302H16.0281C17.2479 21.8063 19.387 19.8672 22.468 19.7204V24.0239C18.7127 24.7024 18.9829 28.6768 22.468 29.7198V33.8967C19.5057 33.6385 16.9777 31.7196 16.1544 28.8337H11.6086H11.6112Z",fill:"black"})}),Zr=()=>t.jsx("svg",{width:"44",height:"44",viewBox:"0 0 44 44",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:t.jsx("path",{d:"M40 42H3V2H40V42ZM18.6641 10.543V33.9365H24.8467V10.543H18.6641ZM10.9385 18.8867V33.9258H17.1211V18.8867H10.9385ZM26.3926 18.8867V25.5713H32.5752V18.8867H26.3926ZM13.9736 10.0586C12.014 10.0586 10.4258 11.7751 10.4258 13.8936C10.4258 16.0114 12.014 17.7285 13.9736 17.7285C15.9331 17.7283 17.5215 16.0113 17.5215 13.8936C17.5215 11.7752 15.9331 10.0588 13.9736 10.0586ZM26.3926 10.543V17.2266H32.5752V10.543H26.3926Z",fill:"black"})}),Jr=()=>t.jsxs("svg",{width:"44",height:"44",viewBox:"0 0 44 44",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("path",{d:"M22.7216 21.8204L26.5549 25.5762L30.4624 21.811L34.3699 25.5762L38.2033 21.8204L42 25.6987L30.4624 37.3131L18.9248 25.6987L22.7216 21.8204Z",fill:"black"}),t.jsx("path",{d:"M29.7382 38H6.56505L18.1205 26.3591L29.7382 38Z",fill:"black"}),t.jsx("path",{d:"M5.88424 13.9695L2 17.8741L13.6365 29.5716L17.5207 25.667L5.88424 13.9695Z",fill:"black"}),t.jsx("path",{d:"M22.0051 9.42729C25.2254 12.6645 25.2254 17.9203 22.0051 21.1575L18.2022 24.9803L6.53383 13.2507L10.3367 9.42789C13.557 6.1907 18.7854 6.1907 22.0057 9.42789L22.0051 9.42729Z",fill:"black"})]}),Qr=()=>t.jsxs("svg",{width:"44",height:"44",viewBox:"0 0 44 44",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("path",{d:"M23.779 4.60675C23.5835 5.24163 23.1437 5.94163 22.5248 6.62535C21.8896 7.32534 21.0589 8.04162 20.0979 8.70905C19.1206 9.39277 18.0293 10.0277 16.8565 10.5811C15.6838 11.1346 14.4459 11.6067 13.1917 11.9649C11.9538 12.3067 10.8462 12.4858 9.88524 12.5346C8.94053 12.5672 8.1587 12.4695 7.55604 12.2416C6.96967 12.0137 6.57876 11.6718 6.41588 11.1997C6.253 10.7439 6.28557 10.1904 6.57876 9.53928C6.6602 9.34393 6.77421 9.14859 6.90452 8.95324C7.03482 8.75789 7.16513 8.54626 7.32801 8.35092C7.49089 8.15557 7.67006 7.94394 7.84923 7.74859C8.04468 7.55325 8.24014 7.34162 8.46817 7.14627L9.05455 6.62535C9.91782 5.92535 10.8462 5.27419 11.8072 4.70443L12.3285 4.4114C12.3285 4.4114 11.2697 5.22535 10.7485 5.87651C10.4553 6.25093 10.2273 6.56023 10.0807 6.88581C9.95039 7.19511 9.9341 7.47185 10.0318 7.68348C10.1296 7.89511 10.3413 8.05789 10.6345 8.15557C10.9277 8.25324 11.3349 8.30208 11.7909 8.26952C12.2633 8.23696 12.8008 8.13929 13.4035 7.9765C14.0061 7.79743 14.6088 7.56953 15.1789 7.29278C15.749 7.01604 16.2865 6.70674 16.7588 6.38116C17.2312 6.05558 17.6384 5.71372 17.9641 5.37186C18.2899 5.03001 18.5179 4.68815 18.6319 4.37885C18.746 4.06955 18.7297 3.80908 18.5994 3.59746C18.4691 3.40211 18.241 3.2556 17.9316 3.15792C17.6221 3.07653 17.2312 3.09281 16.7751 3.1742C16.3353 3.2556 15.7978 3.30444 15.2277 3.46723C14.8531 3.58118 14.6414 3.66257 14.283 3.82536C15.3743 3.2556 16.0258 2.99513 17.2149 2.62072C17.9804 2.37653 18.5016 2.2463 19.202 2.11607C20.0164 1.96956 20.7005 1.98584 21.3195 2.03468C21.9384 2.08351 22.4759 2.21374 22.8831 2.42537C23.2903 2.637 23.5998 2.91374 23.7464 3.27188C23.9093 3.66257 23.9256 4.10211 23.779 4.60675Z",fill:"black"}),t.jsx("path",{d:"M39.0939 31.8582C39.0939 31.8582 38.817 32.5908 38.5727 33.0303C38.3447 33.4373 37.9049 34.007 37.9049 34.007C37.9049 34.007 37.7583 34.2024 37.6606 34.3326C37.3837 34.6907 36.9276 35.2117 36.9276 35.2117L36.325 35.8791C35.6897 36.5303 34.973 37.1489 34.1912 37.7512C33.3931 38.3372 32.5298 38.8907 31.6177 39.3954C30.7056 39.9 29.7283 40.3396 28.7347 40.714C27.7411 41.0884 26.715 41.3977 25.6726 41.6093C25.4608 41.6581 25.2654 41.6907 25.0699 41.7233C24.8744 41.7558 24.679 41.7884 24.4835 41.8209C24.2881 41.8535 24.0926 41.8698 23.9134 41.9023C23.718 41.9186 23.5388 41.9349 23.3596 41.9512L22.2358 42H21.9914L20.7861 41.9674L19.5645 41.8535C19.5645 41.8535 19.3528 41.8209 19.2225 41.8047C18.7175 41.7395 18.4244 41.6907 17.9194 41.5767C17.3982 41.4791 16.6164 41.2674 16.6164 41.2674L15.9649 41.0395L15.7857 40.9581C16.2418 41.1372 16.8607 41.3163 17.4471 41.3977C18.0497 41.4954 18.7013 41.5442 19.3854 41.5442C20.0695 41.5605 20.8024 41.5116 21.5517 41.4465C22.3172 41.3651 23.099 41.2349 23.9134 41.0721C25.7866 40.6814 27.6597 40.0465 29.4188 39.2651C31.1942 38.4837 32.8556 37.5396 34.3378 36.4814C35.82 35.4396 37.1068 34.2838 38.1655 33.0954C38.5239 32.6884 38.8333 32.314 39.1265 31.8582C39.1102 31.8256 39.0939 31.8582 39.0939 31.8582Z",fill:"black"}),t.jsx("path",{d:"M28.2924 2.99992L29.6117 3.48829L30.9148 4.09061L31.3709 4.3348C31.7292 4.53014 32.055 4.75805 32.3156 5.00223C32.5925 5.2627 32.8042 5.53944 32.9671 5.86502C33.13 6.1906 33.2277 6.54874 33.2766 6.92315C33.3254 7.31385 33.2928 7.7371 33.2114 8.17663C32.9671 9.365 32.283 10.651 31.2243 11.9371C30.1492 13.2557 28.6996 14.5905 26.9731 15.844C25.2302 17.1138 23.2268 18.3022 21.0931 19.3277C18.943 20.3533 16.679 21.1998 14.3987 21.7858C12.3627 22.3068 10.5221 22.5835 8.90958 22.6161C7.32964 22.6486 5.99401 22.4696 4.93529 22.0789C3.90914 21.7045 3.1436 21.1347 2.70382 20.4184C2.28033 19.7184 2.15003 18.8556 2.34548 17.8626L2.44321 17.4394L2.81784 16.0394L3.29019 14.6882L3.77884 13.5487L4.21861 12.6208L4.13717 12.7999C4.15346 12.7673 4.12089 12.8324 4.12089 12.8324C3.69739 13.7603 3.61595 14.5743 3.8277 15.2417C4.05573 15.9254 4.59324 16.4789 5.40764 16.837C6.23834 17.2115 7.36221 17.3905 8.71413 17.3742C10.0823 17.358 11.6948 17.1138 13.5028 16.6254C15.3108 16.137 17.1188 15.4533 18.829 14.6394C20.5393 13.8254 22.1355 12.8813 23.5363 11.8882C24.9208 10.8952 26.1098 9.85337 26.9894 8.81151C27.8689 7.78594 28.4553 6.77664 28.6996 5.84874C28.8136 5.37665 28.8299 4.93712 28.7648 4.54642C28.6833 4.15573 28.5204 3.81387 28.2761 3.52085C28.0318 3.22783 27.706 2.98364 27.3151 2.78829C27.0545 2.65806 26.7613 2.54411 26.4356 2.44644L25.9469 2.3162C26.1587 2.34876 26.2727 2.36504 26.4356 2.41388C26.4356 2.41388 26.9079 2.52783 27.2174 2.60923C27.6409 2.77202 28.2924 2.99992 28.2924 2.99992Z",fill:"black"}),t.jsx("path",{d:"M37.0586 8.89429L38.0359 10.1315L38.9318 11.4501L39.3227 12.1175C39.4367 12.3292 39.5507 12.5408 39.6159 12.785C39.6973 13.0129 39.7624 13.2571 39.8113 13.5012C39.8602 13.7454 39.8765 14.0222 39.8927 14.2826C39.8927 14.5594 39.8765 14.8361 39.8439 15.1291C39.6484 16.6431 38.8992 18.2547 37.6939 19.8989C36.456 21.5593 34.762 23.2361 32.726 24.7988C30.6574 26.3779 28.2631 27.843 25.6895 29.0802C23.0997 30.3174 20.347 31.3104 17.5944 31.9616C15.6235 32.4174 13.7992 32.6779 12.1541 32.743C10.5253 32.8081 9.07569 32.6779 7.8378 32.3848C6.61619 32.0918 5.60633 31.6523 4.8245 31.0662C4.05896 30.4965 3.50517 29.7802 3.19569 28.9663L2.88622 28.0709L2.46273 26.5407L2.16954 24.9942L2.10439 24.5547L2.02295 23.6919C2.13697 24.5221 2.47902 25.2384 3.0491 25.10247C3.68433 26.5244 4.61275 27.0453 5.7855 27.3872C6.97453 27.7453 8.42417 27.9081 10.0856 27.843C11.7795 27.7942 13.6852 27.5174 15.7538 27.0128C18.3599 26.3779 20.9497 25.4174 23.3929 24.2616C25.8361 23.0896 28.1165 21.7221 30.071 20.257C32.0093 18.7919 33.6381 17.2454 34.8272 15.7152C35.9999 14.2012 36.7329 12.7198 36.9609 11.3361C37.026 10.9454 37.0423 10.5873 37.0261 10.2292C37.0098 9.88731 36.9446 9.56173 36.8469 9.25243C36.7492 8.94313 36.6188 8.66638 36.4397 8.38964C36.3419 8.22685 36.2116 8.08034 36.0813 7.91755L36.8957 8.78034L37.0586 8.89429Z",fill:"black"}),t.jsx("path",{d:"M41.879 20.3726C41.993 21.6261 42.0419 22.3424 41.8302 23.5796C41.5207 25.4842 41.0157 26.6075 39.957 28.1703C38.8657 29.7493 37.3509 31.3284 35.5267 32.7772C33.6861 34.2423 31.5361 35.5935 29.1906 36.7004C26.8614 37.8237 24.3693 38.7028 21.861 39.24C20.5579 39.5167 19.32 39.6958 18.1636 39.7772C17.0071 39.8586 15.9321 39.8423 14.9548 39.7446C13.9775 39.6469 13.098 39.4516 12.2998 39.1911C11.518 38.9307 10.8339 38.5888 10.2638 38.1818L9.05852 37.2376L8.04866 36.326C8.04866 36.326 7.36456 35.6586 6.95736 35.1865C6.66417 34.8609 6.25697 34.3074 6.25697 34.3074C6.72932 34.8446 7.29941 35.3005 8.01608 35.6749C8.86306 36.1144 9.85664 36.4563 11.0131 36.6516C12.1858 36.8632 13.5052 36.9283 14.9548 36.8632C16.4207 36.7981 18.017 36.5702 19.7109 36.1958C22.431 35.5772 25.1512 34.6167 27.6921 33.3958C30.233 32.1749 32.5785 30.7261 34.5982 29.147C36.5854 27.5842 38.2468 25.9075 39.4358 24.2145C40.6085 22.5703 41.3252 20.9098 41.4881 19.3633C41.5044 19.2005 41.5207 19.0378 41.5207 18.875C41.5207 18.7122 41.5044 18.5494 41.4881 18.4029C41.4718 18.2401 41.6998 19.1029 41.6998 19.1029C41.6998 19.1029 41.8302 19.8843 41.879 20.3726Z",fill:"black"})]}),eo=()=>t.jsxs("svg",{width:"60",height:"32",viewBox:"0 0 60 32",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M31.4994 6.03711C43.8718 7.1674 43.9551 24.7821 31.5738 26H20.9753V6.03711H31.4994ZM32.5488 10.2725L26.2124 21.1731C26.1782 21.3201 27.0276 21.8143 27.1488 21.7378C27.2143 21.6969 27.5036 21.1753 27.5802 21.0499C29.616 17.7103 31.4183 14.2207 33.4615 10.8833C33.4905 10.7029 32.7273 10.3304 32.5488 10.2717V10.2725Z",fill:"black"}),t.jsx("path",{d:"M4.53648 16.0553L19.9339 25.9636H0V6H20.0083L4.53648 16.0553Z",fill:"black"}),t.jsx("path",{d:"M58.6861 25.9636H38.7522L48.6827 6.07349L58.6861 25.9636Z",fill:"black"})]}),to=()=>t.jsxs("svg",{width:"150",height:"160",viewBox:"0 0 150 160",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("path",{d:"M12.104 126.529V0H138.896V160H89.5742L44.4361 35.3724L12.104 126.529Z",fill:"black"}),t.jsx("path",{d:"M44.4361 154.929C21.1063 155.055 21.7402 136.799 25.6708 120.697C28.0799 110.808 37.2089 81.9017 48.3666 89.6355C56.8617 96.8621 60.2851 109.414 63.4549 119.937C68.7802 139.588 66.2444 155.182 44.4361 154.929Z",fill:"black"})]});l.registerPlugin(a);const io=()=>{const i=e.useRef(null);return e.useRef([]),t.jsxs(ro,{ref:i,className:"award-pin",children:[t.jsx(no,{className:"award-bg"}),t.jsxs(mo,{style:{position:"relative",overflow:"hidden",marginBottom:"auto",margin:"0 0 var(--gap48) 0",width:"100%"},children:[t.jsxs(ao,{className:"t-award-info",style:{position:"relative"},children:[t.jsx(mo,{children:"31"}),t.jsx(fo,{children:t.jsx(Kr,{})})]}),t.jsxs(ao,{className:"t-award-info",children:[t.jsx(mo,{children:"23"}),t.jsx(fo,{children:t.jsx(Zr,{})})]}),t.jsxs(ao,{className:"t-award-info",children:[t.jsx(mo,{children:"15"}),t.jsx(fo,{children:t.jsx(Jr,{})})]}),t.jsxs(ao,{className:"t-award-info",children:[t.jsx(mo,{children:"14"}),t.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:10,alignItems:"center"},children:[t.jsxs("div",{style:{display:"flex",flexDirection:"row",alignItems:"center",gap:4},children:[t.jsx(fo,{className:"small",children:t.jsx(Qr,{})}),t.jsx(fo,{className:"small",children:t.jsx(to,{})})]}),t.jsx(fo,{className:"small",style:{width:"2vw",height:"1.25vw"},children:t.jsx(eo,{})})]})]})]}),t.jsxs(so,{children:[t.jsx(oo,{className:"t-award",style:{position:"relative"},children:t.jsxs(lo,{children:[t.jsxs(co,{children:[t.jsx(uo,{className:"award-year t-award-year",children:"2020 - 21"}),t.jsxs(ho,{className:"award-item t-award-item",children:[t.jsx(po,{children:"Episode"}),t.jsx(po,{children:"Cafe Delaluz"}),t.jsx(po,{children:"Plus X"}),t.jsx(po,{children:"Plus X Website"}),t.jsx(po,{children:"ANORMAL"}),t.jsx(po,{children:"Krafton"}),t.jsx(po,{children:"ETIQA"}),t.jsx(po,{children:"Acemaker"}),t.jsx(po,{children:"BYN"}),t.jsx(po,{children:"BlackYak"}),t.jsx(po,{children:"G9"}),t.jsx(po,{children:"E Mart"}),t.jsx(po,{children:"Kakao Page"})]})]}),t.jsxs(co,{children:[t.jsx(uo,{children:"2022 – 23"}),t.jsxs(ho,{children:[t.jsx(po,{children:"COM2US"}),t.jsx(po,{children:"Archiveat"}),t.jsx(po,{children:"URG"}),t.jsx(po,{children:"Konny"}),t.jsx(po,{children:"Cleanlab"}),t.jsx(po,{children:"Plus X VR"}),t.jsx(po,{children:"Samsung Fire"}),t.jsx(po,{children:"Dual Frame"}),t.jsx(po,{children:"UT"}),t.jsx(po,{children:"Deeponde"}),t.jsx(po,{children:"iTOO"}),t.jsx(po,{children:"wyd"})]})]}),t.jsxs(co,{children:[t.jsx(uo,{children:"2024 – 25"}),t.jsxs(ho,{children:[t.jsx(po,{children:"Kolon Mall"}),t.jsx(po,{children:"Cashnote"}),t.jsx(po,{children:"SLL"})]})]})]})}),t.jsx(oo,{className:"t-award",children:t.jsxs(lo,{children:[t.jsxs(co,{children:[t.jsx(uo,{className:"award-year t-award-year",children:"2020 - 21"}),t.jsxs(ho,{className:"award-item t-award-item",children:[t.jsx(po,{children:"UT"}),t.jsx(po,{children:"URG"}),t.jsx(po,{children:"Plus X VR"}),t.jsx(po,{children:"MUSINSA VR"}),t.jsx(po,{children:"SKT Sphere"}),t.jsx(po,{children:"KT Genie TV"}),t.jsx(po,{children:"Samsung Fire"}),t.jsx(po,{children:"ZERO"}),t.jsx(po,{children:"Leferi"}),t.jsx(po,{children:"Plus X Website"}),t.jsx(po,{children:"SYSTEM"})]})]}),t.jsxs(co,{children:[t.jsx(uo,{children:" "}),t.jsxs(ho,{children:[t.jsx(po,{children:"ANDMARQ"}),t.jsx(po,{children:"Apartmentary"}),t.jsx(po,{children:"ETIQA"}),t.jsx(po,{children:"BYN"}),t.jsx(po,{children:"BlackYak"}),t.jsx(po,{children:"Krafton"}),t.jsx(po,{children:"Kakao Page"}),t.jsx(po,{children:"Plus X"}),t.jsx(po,{children:"Cafe Delaluz"}),t.jsx(po,{children:"Episode"})]})]}),t.jsxs(co,{children:[t.jsx(uo,{children:"2024 – 25"}),t.jsxs(ho,{children:[t.jsx(po,{children:"Kolon Mall"}),t.jsx(po,{children:"H Fashion"})]})]})]})}),t.jsx(oo,{className:"t-award",children:t.jsxs(lo,{children:[t.jsxs(co,{children:[t.jsx(uo,{className:"award-year t-award-year",children:"2020 - 22"}),t.jsxs(ho,{className:"award-item t-award-item",children:[t.jsx(po,{children:"URG"}),t.jsx(po,{children:"Cleanlab"}),t.jsx(po,{children:"wyd"}),t.jsx(po,{children:"Deeponde"}),t.jsx(po,{children:"ETIQA"}),t.jsx(po,{children:"Object By 3"})]})]}),t.jsxs(co,{children:[t.jsx(uo,{children:"2023"}),t.jsxs(ho,{children:[t.jsx(po,{children:"COM2US"}),t.jsx(po,{children:"UT"}),t.jsx(po,{children:"Archiveat"}),t.jsx(po,{children:"Cashnote"}),t.jsx(po,{children:"Konny"})]})]}),t.jsxs(co,{children:[t.jsx(uo,{children:"2024"}),t.jsx(ho,{children:t.jsx(po,{children:"SLL"})})]})]})}),t.jsx(oo,{className:"t-award",children:t.jsxs(lo,{children:[t.jsxs(co,{children:[t.jsx(uo,{className:"award-year t-award-year",children:"reddot"}),t.jsxs(ho,{className:"award-item t-award-item",children:[t.jsx(po,{children:"ANDMARQ"}),t.jsx(po,{children:"wyd"}),t.jsx(po,{children:"iTOO"}),t.jsx(po,{children:"Apartmentary"}),t.jsx(po,{children:"Cleanlab"}),t.jsx(po,{children:"UT"}),t.jsx(po,{children:"Konny"})]})]}),t.jsxs(co,{children:[t.jsx(uo,{children:"gda"}),t.jsxs(ho,{children:[t.jsx(po,{children:"Episode"}),t.jsx(po,{children:"ANDMARQ"}),t.jsx(po,{children:"SYSTEM"}),t.jsx(po,{children:"Krafton"})]})]}),t.jsxs(co,{children:[t.jsx(uo,{children:"kda"}),t.jsxs(ho,{children:[t.jsx(po,{children:"UT"}),t.jsx(po,{children:"Konny"})]})]})]})})]})]})},no=h.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 80%;
  margin: auto;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.8) 33%, rgba(255, 255, 255, 0.8) 66%, rgba(255, 255, 255, 0) 100%);
  opacity: 0;
  transition: opacity 0.6s var(--power3InOut);
`,ro=h.div`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  min-height: max-content;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  z-index: 10;
  margin: auto;
  pointer-events: none;
  opacity: 1;

  &.hideall {
    opacity: 0;
    transition: opacity 0.6s var(--power3InOut);
  }
  @media (max-width: 1024px) {
    &:has(.show) {
      .award-bg {
        opacity: 1;
        transition: opacity 0.6s var(--power3InOut);
      }
    }
  }
`,oo=h.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  margin: 0;
  display: flex;
  justify-content: center;
  flex-direction: column;
  gap: clamp(40px, 8vmin, 80px);
`,so=h.div`
  position: relative;
  width: 100%;
  // flex: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: max-content;

  gap: var(--gap80);
  @media (min-width: 1024px) {
    min-width: 420px;
  }
`,ao=h.div`
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  transform: translateY(110%);

  will-change: opacity, transform;
  // backface-visibility: hidden;
  // opacity: 0;
`,lo=h.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--gap16);
  width: 100%;

  will-change: opacity, transform;
  backface-visibility: hidden;
  opacity: 0;
  transform: translateY(150px);
  transition:
    opacity 0.4s var(--expoInOut),
    transform 0s var(--expoOut) 0,
    7s;

  .show & {
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity 0.6s var(--power3InOut) 0.15s,
      transform 0.6s var(--power3Out) 0.15s;
  }
  @media (max-width: 1024px) {
    gap: 8px;
  }
`,co=h.div`
  display: flex;
  flex-direction: column;
  gap: var(--gap24);
`,uo=h.div`
  ${F.Caption_Small}
  color: var(--text-color-black);
  letter-spacing: 0.5px !important;
  @media (max-width: 1024px) {
    font-size: 12px !important;
  }
`,ho=h.div`
  display: flex;
  flex-direction: column;
  gap: var(--gap8);
`,po=h.div`
  ${F.Caption_Small}
  color: var(--text-color-black);
  white-space: nowrap;
  width: 140px;
  font-weight: 450 !important;
  text-transform: capitalize !important;
  letter-spacing: 0.5px !important;
  @media (max-width: 1024px) {
    width: max-content;
    font-size: 12px !important;
  }
`,mo=h.div`
  ${F.Hero}
  color: var(--color-black);
`,fo=h.div`
  display: flex;
  align-items: flex-start;
  justify-content: fle-start;
  width: 4vw;
  height: 4vw;
  max-width: 76px;
  max-height: 76px;
  min-width: 30px;
  min-height: 30px;

  &.small {
    width: 2.3vw;
    height: 2.3vw;
    max-width: 44px;
    max-height: 44px;
    min-width: 24px;
    min-height: 24px;
  }
  svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;l.registerPlugin(a);const go=e.forwardRef(({symbolRef:i,isCoverCompleted:n},r)=>{const{isMobileOrTablet:o}=D(),c=e.useRef(null),d=e.useRef([]),u=e.useRef(!1),h=e.useRef(null),[p,m]=e.useState({x:0,y:0}),[f,g]=e.useState(!1),x=e.useRef(-1),b=e.useRef(-1);return s(()=>{const e=()=>{if(!c.current)return void setTimeout(e,200);if(!document.querySelector(".award-pin"))return void setTimeout(e,200);const t=o?document.querySelector("#smooth-wrapper")||document.body:void 0;if(o&&!document.querySelector("#smooth-wrapper"))return void setTimeout(e,300);d.current.forEach(e=>e.kill()),d.current=[];const n=()=>{var e;null==(e=document.querySelector(".award-pin"))||e.classList.add("hideall"),l.delayedCall(.3,()=>{document.querySelectorAll(".t-award-info").forEach(e=>{e.classList.remove("show"),e.dataset.state="",e.dataset.direction=""}),document.querySelectorAll(".t-award").forEach(e=>{e.classList.remove("show"),e.dataset.state="",e.dataset.direction=""})})},r=c.current.querySelectorAll(".award-block"),s=r.length,u=(e,t)=>{var i,n;(1===x&&"down"===t||x===s-1&&"up"===t)&&(null==(i=document.querySelector(".award-pin"))||i.classList.add("hideall")),null==(n=document.querySelector(".award-pin"))||n.classList.remove("hideall"),document.querySelectorAll(".t-award").forEach((i,n)=>{i.classList[n===e?"add":"remove"]("show"),i.dataset.direction=n===e?t:""}),document.querySelectorAll(".t-award-info").forEach((i,n)=>{n===e?(i.dataset.state="current",i.dataset.direction=t):n===x.current&&-1!==x.current&&n!==e?(i.dataset.state="prev",i.dataset.direction=t):(i.dataset.state="",i.dataset.direction="")}),b.current=x.current,x.current=e};a.create({trigger:'[data-section="awardManifesto"]',start:"top bottom",endTrigger:'[data-section="newAward"]',end:`+=${.8*document.querySelector('[data-section="awardManifesto"]').clientHeight}px`,id:"hide-point-2",immediateRender:!1,invalidateOnRefresh:!0,refreshOnResize:!0,...t&&{scroller:t},onEnterBack:()=>{n()},onLeave:()=>{var e,t,i,n,r;null==(e=a.getById("footer-0"))||e.refresh(),null==(t=a.getById("footer-1"))||t.refresh(),null==(i=a.getById("footer-2"))||i.refresh(),null==(n=a.getById("footer-3"))||n.refresh(),null==(r=a.getById("footer-4"))||r.refresh()}});const p=[];class m{constructor(e,t,i){this.testBox=e,this.index=t,this.parentIndex=i,this.randomMultiplier=Math.random()-.5,this.widthRandomMultiplier=.25*Math.random(),this.ovalWidth=window.innerWidth/3.1+this.randomMultiplier*window.innerWidth*.7/10,this.ovalWidthOrigin=this.ovalWidth,this.ovalHeight=window.innerHeight/2+this.testBox.clientHeight,this.ovalHeightExtend=0,this.ovalPositionMove=0,this.prevScrollY=0,this.bounceVal=0,this.bounceValTarget=0,this.bounceMultipleHeight=0,this.bounceMax=0,this.init()}init(){const e=this.testBox.querySelector("img");e?e.complete?this.setHeightAndPosition():e.onload=()=>{this.setHeightAndPosition()}:this.setHeightAndPosition()}scrollTrigger(){const e=new IntersectionObserver(t=>{t.forEach(t=>{t.isIntersecting&&(this.testBox.classList.add("animate"),e.unobserve(t.target))})},{root:null,rootMargin:"0px",threshold:.5});e.observe(this.testBox)}setHeightAndPosition(){l.set(this.testBox,{width:16*(.8+this.widthRandomMultiplier)+"vw",onComplete:()=>{this.testBox.dataset.height=this.testBox.clientHeight,this.ovalHeight=window.innerHeight/2+this.testBox.clientHeight}}),this.startPosition=.5*window.innerWidth-this.testBox.clientWidth/2,l.set(this.testBox,{x:this.startPosition}),this.dir=this.index%2*2-1,this.bind||(this.bind=!0,this.scrollTrigger())}recalculateOnResize(){this.ovalWidth=window.innerWidth/3.1+this.randomMultiplier*window.innerWidth*.7/10,this.ovalWidthOrigin=this.ovalWidth,this.startPosition=.5*window.innerWidth-this.testBox.clientWidth/2,this.ovalHeight=window.innerHeight/2+this.testBox.clientHeight}update(e){const t=window.innerHeight-this.testBox.getBoundingClientRect().top-this.testBox.clientHeight/2;this.bounceValTarget=Math.min(Math.abs(t-this.prevScrollY)*this.bounceMultipleHeight,this.bounceMax),this.bounceVal+=.1*(this.bounceValTarget-this.bounceVal),this.ovalWidth=this.ovalWidthOrigin+this.bounceVal;const i=.5*window.innerHeight-this.ovalPositionMove-this.testBox.getBoundingClientRect().top-this.testBox.clientHeight/2,n=this.ovalWidth*Math.sqrt(1-i*i/((this.ovalHeight+this.ovalHeightExtend)*(this.ovalHeight+this.ovalHeightExtend)))*this.dir,r=this.startPosition+n;this.prevScrollY=t,l.set(this.testBox,{x:r})}}r.forEach((e,r)=>{const c=e.querySelectorAll(".award-image-wrap"),h=a.create({trigger:e,start:"top 49%",end:"bottom 50%",id:`award-block-${r}`,immediateRender:!1,invalidateOnRefresh:!0,refreshOnResize:!0,...t&&{scroller:t},onEnterBack:()=>{i.current.updateFog()},onEnter:()=>{i.current.updateFog(),document.body.classList.add("hide-pin-7"),"dark"===document.body.dataset.theme&&(document.body.dataset.theme="light"),x.current!==r&&u(r,"down")},onToggle:e=>{const t=1===e.direction?"up":"down";e.isActive?(u(r,t),"dark"===document.body.dataset.theme&&(document.body.dataset.theme="light")):0==r&&"down"===t&&n()},onLeave:()=>{r===s-1&&(n(),i.current.resetFog())},onLeaveBack:()=>{0===r&&i.current.resetFog(),document.body.classList.remove("hide-pin-7")}});if(o)c.forEach((e,t)=>{let i=Math.random()*(.25*window.innerWidth);t%2==1&&(i=window.innerWidth-(.3*window.innerWidth-16)-Math.random()*(.25*window.innerWidth)),e.style.transform=`translateX(${i}px)`;const n=new IntersectionObserver(t=>{t.forEach(t=>{t.isIntersecting&&(e.classList.add("animate"),n.unobserve(e))})},{root:null,rootMargin:"0px 0px 0% 0px",threshold:.4});n.observe(e)});else{const i=[];c.forEach((e,t)=>{i.push(new m(e,t+r*c.length,r))}),p.push(...i);const n=()=>{i.forEach(e=>{e.update()})},o=a.create({trigger:e,start:"top bottom",end:`bottom+=${2*window.innerHeight}px top`,id:`scroll-animation-${r}`,immediateRender:!1,invalidateOnRefresh:!0,refreshOnResize:!0,...t&&{scroller:t},onRefresh:()=>{},onEnter:()=>{var e,t,i,r,o;null==(e=a.getById("footer-0"))||e.refresh(),null==(t=a.getById("footer-1"))||t.refresh(),null==(i=a.getById("footer-2"))||i.refresh(),null==(r=a.getById("footer-3"))||r.refresh(),null==(o=a.getById("footer-4"))||o.refresh(),l.ticker.add(n)},onEnterBack:()=>{l.ticker.add(n)},onLeave:()=>{l.ticker.remove(n)},onLeaveBack:()=>{l.ticker.remove(n)}});o.refresh(),d.current.push(o)}d.current.push(h)});const f=()=>{0!==p.length&&p.forEach(e=>{e.recalculateOnResize()})};return o||(h.current=f,window.addEventListener("resize",f)),()=>{o||window.removeEventListener("resize",f),d.current.forEach(e=>e.kill()),d.current=[]}};if(u.current)return()=>{d.current.forEach(e=>e.kill()),d.current=[]};const t=setInterval(()=>{if(u.current)clearInterval(t);else if(!u.current)try{e(),u.current=!0,clearInterval(t)}catch(i){}},100);return()=>{clearInterval(t),h.current&&window.removeEventListener("resize",h.current),d.current.forEach(e=>e.kill()),d.current=[],u.current=!1}},{scope:c,dependencies:[n,o]}),t.jsx(xo,{ref:c,className:"award-pin-container",children:Array.from({length:4}).map((e,i)=>t.jsx(bo,{className:"award-block",children:t.jsx(wo,{children:Array.from({length:5}).map((e,n)=>t.jsx(yo,{className:"award-image-wrap",children:t.jsx(vo,{src:`/assets/award/award_${i+1}_${n+1}.png`,alt:"award"})},`award-image-wrap-${i}-${n}`))})},`award-block-${i}`))})}),xo=h.div`
  display: flex;
  flex-direction: column;
  position: relative;
  will-change: transform;
  transform-style: preserve-3d;
  perspective: 1000px;

  transition: transform 0.1s ease-out;

  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;

  transform-origin: center center;
`,bo=h.div`
  position: relative;
  width: 100%;
  margin-bottom: var(--gap24);
`,wo=h.div`
  position: relative;
  width: 100%;
  padding: 0 var(--grid-gap);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--gap24);
  @media (max-width: 1024px) {
    padding: 30px 0 30px;
    gap: var(--gap60);
  }
`,vo=h.img`
  position: relative;

  width: 100%;
  object-fit: cover;
  border-radius: 12px;
  pointer-events: auto;

  will-change: transform;
  @media (max-width: 1024px) {
    border-radius: 4px;
    overflow: hidden;
  }
`,yo=h.div`
  position: relative;
  width: 100%;
  border-radius: 4px;
  img {
    transform-origin: center bottom;
    transform: scale(0.3);
    will-change: transform;
    transition: transform 1.2s var(--expoOut);
    backface-visibility: hidden;
  }
  &.animate {
    img {
      transform: scale(1);
    }
  }
  .device-mobile & {
    width: calc(30vw - var(--grid-gap)) !important;

    display: flex;
    justify-content: flex-start;
    margin: 0;
  }
`,_o=h.div`
  width: 100vw;
  padding: var(--gap240) 32px var(--gap300);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100dvh;
  @media (max-width: 1024px) {
    padding: var(--gap180) var(--grid-gap);
  }
  .device-mobile & {
    padding: var(--gap180) var(--grid-gap);
  }
`,jo=h.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  ${F.Header_Medium}
  color: var(--text-color-black);
  z-index: 2;
  overflow: hidden;
  width: 100%;
`,ko=h.div`
  transform: translateY(100%);
  transition: transform 1.2s var(--expoOut);
  will-change: transform;
  backface-visibility: hidden;
  &.animate {
    transform: translateY(0);
  }
`,Eo=h.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  text-align: center;
  z-index: 3;
  transform: translateY(100%);
`,Co=e.forwardRef(({symbolRef:i,symbolContainerRef:n,pcLine:r,mobileLine:o,triggerId:s,textColor:a="var(--text-color-black)",hasStaggerAnimation:l=!1},c)=>{e.useRef();const d=e.useRef(),u=e.useRef();return t.jsxs(_o,{className:"manifesto-container",children:[t.jsx(Eo,{className:l?"is-pc":"stagger-animation is-pc",ref:u,children:r.map((e,i)=>t.jsx(jo,{className:"main-title",children:t.jsx(ko,{className:"sub-title",style:{color:a},children:e})},s+"pc"+i))}),t.jsx(Eo,{className:l?"is-mobile":"stagger-animation is-mobile",ref:d,children:o.map((e,i)=>t.jsx(jo,{className:"main-title",children:t.jsx(ko,{className:"sub-title",style:{color:a},children:e})},s+"mobile"+i))})]})});l.registerPlugin(a);const Ro=e.forwardRef((i,n)=>{const r=e.useRef(null),o=e.useRef(null);return e.useEffect(()=>{const e=new MutationObserver(e=>{e.forEach(e=>{if("attributes"===e.type&&"data-current-project"===e.attributeName){const e=document.body.dataset.currentProject,t=document.body.dataset.projectType;if("category"!==t&&e){if("project"===t&&e){const t=`/assets/portfolio/${e}`;o.current&&!o.current.src.endsWith(e)&&(o.current.src=t)}}else o.current&&(o.current.src="")}})});return e.observe(document.body,{attributes:!0,attributeFilter:["data-current-project","data-project-type"]}),()=>e.disconnect()},[]),e.useImperativeHandle(n,()=>({set(e){if(!o.current||!e)return;const t=`${e}`;if(o.current.src.endsWith(e))return;(new Image).src=t,o.current.src=t},remove(){o.current.src=""},hide(){var e;null==(e=r.current)||e.classList.remove("show")}})),t.jsx(So,{ref:r,className:"project-list-pin-image",children:t.jsx(To,{children:t.jsx(Oo,{ref:o,className:"project-preview-image",src:"",alt:"portfolio-thumbnail",style:{minHeight:"max-content"}})})})}),So=h.div`
  position: fixed;
  left: 40%;
  top: 0;
  bottom: 0;
  margin: auto;
  height: max-content;
  z-index: 1000;
  overflow: hidden;

  align-items: center;
  justify-content: center;
  pointer-events: none;
  width: clamp(var(--grid-2), 42vw, 60rem);

  display: none;
  padding-bottom: 69%;

  transform: translate(calc(-50%), 0);
  transform-origin: left center;
  overflow: hidden;
  backface-visibility: hidden;
  opacity: 0;
  &.show {
    opacity: 1 !important;
    visibility: visible !important;
    transition: opacity 0.8s var(--expoOut);
  }
  @media (max-width: 1024px) {
    .device-desktop & {
      left: 50%;
      transform: translate(calc(0% - 1vw), 0) scale(0.8);
    }
    .device-mobile & {
      position: fixed !important;
      top: 0 !important;
      left: auto;
      right: 16px;
      height: 100% !important;
      bottom: 0;
      margin: auto;
      transform: translate(0, 0) !important;
      transition: opacity 0.6s var(--expoOut);
      opacity: 0;
    }
  }
`,Oo=h.img`
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto;
  left: 0;
  width: 100%;
  height: 99%;
  object-fit: contain;
  will-change: auto;
  min-height: unset !important;
  transform: scale(1.03);
  border-radius: 8px;
  overflow: hidden;
`,To=h.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  margin: auto;
  width: 100%;
  height: max-content;
  padding-bottom: 58%;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: auto;
  overflow: hidden;
  backface-visibility: hidden;
  border-radius: 8px;
  overflow: hidden;
`;l.registerPlugin(d,a);const Ao=r.lazy(()=>S(()=>import("./ScrollContent-DPvp7E5w.js"),__vite__mapDeps([0,1,2,3,4,5]))),Lo=r.lazy(()=>S(()=>import("./BxOpener-C-1sEdiN.js"),__vite__mapDeps([6,1,2,4,5])));r.lazy(()=>S(()=>import("./BxManifesto-LC2kjhSz.js"),__vite__mapDeps([7,1,4,2,5]))),r.lazy(()=>S(()=>import("./Background-BMTZx5LC.js"),__vite__mapDeps([8,1])));const No=r.lazy(()=>S(()=>import("./BxScrollContent-Cyz0W071.js"),__vite__mapDeps([9,1,3,4,2,5]))),zo=r.lazy(()=>S(()=>import("./BxScrollContent2-BrIo-hDc.js"),__vite__mapDeps([10,1,11,4,2,5]))),Po=r.lazy(()=>S(()=>import("./SectionPinnerEnd-BTDbjzlt.js"),__vite__mapDeps([12,1,4,2,5]))),Io=r.lazy(()=>S(()=>import("./UxOpener-CMLFjK6j.js"),__vite__mapDeps([13,1,2,4,5])));r.lazy(()=>S(()=>import("./UxManifesto-BMj5hNwc.js"),__vite__mapDeps([14,1,2,4,5])));const Bo=r.lazy(()=>S(()=>import("./UxScrollContent-DAjyFlD_.js"),__vite__mapDeps([15,1,11,4,2,5]))),Mo=r.lazy(()=>S(()=>import("./SectionFullEnd-uWt72Dv5.js"),__vite__mapDeps([16,1,2,4,5]))),Do=r.lazy(()=>S(()=>import("./ShareOpener-2BsMz8Fp.js"),__vite__mapDeps([17,1,2,4,5])));r.lazy(()=>S(()=>import("./ShareItem-DdEf1AoB.js"),__vite__mapDeps([18,1,2,4,19,20,5])));const Ho=r.lazy(()=>S(()=>import("./ShareScrollContent-BmiuQWTd.js"),__vite__mapDeps([21,1,3,4,2,5]))),Fo=r.lazy(()=>S(()=>import("./ShareScrollContent2-Cc7smnU8.js"),__vite__mapDeps([22,1,11,4,2,5])));r.lazy(()=>S(()=>import("./ShareMenifesto-CqkENsVC.js"),__vite__mapDeps([23,1,4,2,5]))),r.lazy(()=>S(()=>import("./Award-Pud2aKJh.js"),__vite__mapDeps([24,1,2,4,5])));const Vo=r.lazy(()=>S(()=>import("./Footer-BEzq9NAu.js"),__vite__mapDeps([25,1,2,4,5]))),Uo=r.lazy(()=>S(()=>import("./ProjectList-D1nTCRRx.js"),__vite__mapDeps([26,1,2,4,5]))),$o=r.lazy(()=>S(()=>import("./ProjectOpener-dzpilpOv.js"),__vite__mapDeps([27,1,2,4,5]))),Wo=r.lazy(()=>S(()=>import("./ProjectManifesto-DjRbsrzh.js"),__vite__mapDeps([19,1,4,20,2,5])));r.lazy(()=>S(()=>import("./AwardProjectManager-XR6mxsZn.js"),__vite__mapDeps([28,1,4,2,5])));const qo=r.lazy(()=>S(()=>import("./AwardOpener-DAq4ChoI.js"),__vite__mapDeps([29,1,2,4,5])));r.lazy(()=>S(()=>import("./KolonManifesto-lRT0mHvs.js"),__vite__mapDeps([30,1,2,4,5]))),r.lazy(()=>S(()=>import("./EqlManifesto-CBVrsGlC.js"),__vite__mapDeps([31,1,2,4,5]))),r.lazy(()=>S(()=>import("./GenAi-Bdq3FVuM.js"),__vite__mapDeps([32,1,4,2,5]))),r.lazy(()=>S(()=>import("./ShareXManifesto-C1rTp8En.js"),__vite__mapDeps([33,1,2,4,5])));const Xo=r.lazy(()=>S(()=>import("./AwardManifesto-z-w8AuYg.js"),__vite__mapDeps([34,1,2,4,20,5])));r.lazy(()=>S(()=>import("./ShareXPin-VxgyxJc_.js"),__vite__mapDeps([35,1,2,4,5]))),r.lazy(()=>S(()=>import("./Logo-Cya_9J8z.js"),__vite__mapDeps([36,1,4,2,5])));const Go=r.lazy(()=>S(()=>import("./AwardClosure-kmzRfC4I.js"),__vite__mapDeps([37,1,4,2,5]))),Yo=r.lazy(()=>S(()=>import("./Partner-C4-4KPQj.js"),__vite__mapDeps([38,1,2,4]))),Ko=r.lazy(()=>S(()=>import("./Dorco-DCClOQBl.js"),__vite__mapDeps([39,1,4,2,5])));r.lazy(()=>S(()=>import("./HFashion-CIpxBtGM.js"),__vite__mapDeps([40,1,4,2,5])));const Zo=r.lazy(()=>S(()=>import("./UxScrollContent2-CAiEhot6.js"),__vite__mapDeps([41,1,3,4,2,5]))),Jo=r.lazy(()=>S(()=>import("./SVGUnit-DkqjgZZC.js"),__vite__mapDeps([42,1,4,2,5]))),Qo=r.lazy(()=>S(()=>import("./SVGUnitBX-CmVHjcPO.js"),__vite__mapDeps([43,1,4,2,5]))),es=r.lazy(()=>S(()=>import("./SVGUnitUX-DcJixeIB.js"),__vite__mapDeps([44,1,4,2,5])));function ts(){const[i,n]=e.useState("cover"),[r,o]=e.useState(!1),[s,c]=e.useState(!0),u=e.useRef(),h=e.useRef(),p=e.useRef(),m=e.useRef(),f=e.useRef(),g=e.useRef(),x=e.useRef(),b=e.useRef(),{lockScroll:w,unlockScroll:v,resetScroll:y}=V(x.current),_=e.useRef(),j=e.useRef(!1),k=e.useRef(!1),E=e.useRef(!1),C=e.useRef(null),R=e.useRef(!1),{isMobile:S,isDesktop:O,isSafari:A,deviceType:L,isTouch:N,isMobileOrTablet:z}=D({enableBodyClass:!0,enableResize:!0});T({debug:!1,symbolRef:u});const{initTriggers:P}=function(t,i,n){return e.useEffect(()=>{if(!n)return;const e=t.current,r=(t=0,i=0,n=0,r=e.group1)=>{if(l.killTweensOf(r.position,"x,y"),"group_2"===r.name){const e=0==t?t:t<0?`-${r.symbolDist}`:r.symbolDist;l.set(r.position,{x:e,y:i})}else l.set(r.position,{x:t,y:i})},o=t=>{e.modeBlack(t)},s=t=>{e.modeWhite(t)},c=(t="large",i=null)=>{document.body.dataset.size="none","small"==t?window.innerWidth<1025?e.updatePartScale({group:e.group1,duration:0,length:28,thick:2.4,kill:!0}):e.updatePartScale({group:e.group1,duration:0,length:40,thick:3,kill:!0}):window.innerWidth<1025?e.updatePartScale({group:e.group2,duration:0,length:80,thick:5,kill:!0}):e.updatePartScale({group:e.group2,duration:0,length:150,thick:6.5,kill:!0})},d=(t,i,n=document.body.dataset.theme,r)=>{let o="large"==document.body.dataset.size?.5:.6;e.hideObject(t,.8),a.isInViewport(document.querySelector('[data-section="projectList"]'))&&(a.isInViewport(document.querySelector('[data-section="projectList"]'))&&document.querySelector('[data-section="awardOpener"]')&&a.isInViewport('[data-section="awardOpener"]')?e.resetMode("light",o):e.resetMode("dark",o)),document.body.dataset.size?document.body.dataset.size:document.body.dataset.size="none",document.body.dataset.size="none"},u=(t,i)=>{"small"!=document.body.dataset.size&&("large"==document.body.dataset.size&&e.hideObject(e.group2),1==e.group2.material.visible&&e.hideObject(e.group2),c("small"),document.body.dataset.size="small",e.showObject(e.group1),l.delayedCall(.01,()=>{t&&t(),i?"dark"==i?o():s():"dark"==document.body.dataset.theme?o():s()}))},h=(t,i,n=.3)=>{"large"!=document.body.dataset.size&&("small"==document.body.dataset.size&&e.hideObject(e.group1),1==e.group1.material.visible&&e.hideObject(e.group1),c("large"),l.delayedCall(.01,()=>{e.showObject(e.group2)}),document.body.dataset.size="large",l.delayedCall(.01,()=>{t&&t(),i?"dark"==i?o():s():"dark"==document.body.dataset.theme?o():s()}))};let p=[];return(()=>{if(!(null==t?void 0:t.current)||!(null==i?void 0:i.current))return;p.forEach(e=>{e&&e.kill()}),p=[];const n=[{id:"small-0",selector:'[data-section="heroVideo"]',start:"80% center",endSelector:'[data-section="intro"] [data-start]',end:window.innerWidth>1024?"bottom 10%":"bottom 30%",anim:t=>{"small"!=document.body.dataset.size&&(u(()=>{r(0,0,0,e.group1)},"dark"),"back"==t&&d(e.group2),window.innerWidth>1024?r(-27,-10,0,e.group2):r(-10,-10,0,e.group2))},leave:()=>{d(e.group1)},leaveBack:()=>{d(e.group1)}},{id:"large-1",selector:'[data-section="introManifesto"]',start:"top 60%",end:"top bottom",endSelector:'[data-section="historyOpener"]',anim:t=>{h(()=>{window.innerWidth>1024?r(-27,-10,0,e.group2):r(-10,-10,0,e.group2)})},leave:()=>{d(e.group2)},leaveBack:()=>{d(e.group2)}},{id:"small-2",selector:'[data-section="image"]',start:"top top",end:"top center",endSelector:'[data-section="bxScrollContent2"] .last-item',anim:t=>{"small"!=document.body.dataset.size&&u(()=>{r(0,0,0,e.group1)},document.body.dataset.theme)},leave:()=>{var t,i;null==(t=a.getById("trigger-counting-animation-0"))||t.refresh(),null==(i=a.getById("trigger-counting-animation-1"))||i.refresh(),d(e.group1)},leaveBack:()=>{d(e.group1)}},{id:"large-2",selector:'[data-section="newIntroManifesto"',start:"top bottom",endSelector:'[data-section="sectionPinnerEnd"] .title-start',end:"top-=15% top",anim:t=>{h(()=>{window.innerWidth>1024?r(-27,10,0,e.group2):r(-10,10,0,e.group2)}),"back"==t&&e.hideObject(e.group1,0)},leave:()=>{d(e.group2)},leaveBack:()=>{d(e.group2)}},{id:"large-3",selector:'[data-section="newIntroManifesto2"] .badge-wrap',start:"top center",end:"bottom bottom",endSelector:'[data-section="kolon"] .sticky-image-container',anim:t=>{e.hideObject(e.group1,0),e.hideObject(e.group2,0),"back"==t&&(e.modeWhite(0),document.body.dataset.theme="light"),h(()=>{window.innerWidth>1024?r(27,-10,0,e.group2):r(10,0,0,e.group2)},"light",.1)},leave:()=>{a.isInViewport(document.querySelector('[data-section="projectList"]')),d(e.group2)},leaveBack:()=>{d(e.group2)}},{id:"small-3-1",selector:'[data-section="shareOpener"]',start:"top top",end:"center bottom",anim:t=>{u(()=>{r(0,0,0,e.group1)},"dark"),"back"==t||(document.body.dataset.theme="dark",document.body.dataset.transition="false",l.delayedCall(.3,()=>{document.body.removeAttribute("data-transition")}))},leave:()=>{d(e.group2)},leaveBack:()=>{d(e.group2)}},{id:"small-2-1",selector:'[data-section="uxOpener"]',start:"center top",endSelector:'[data-section="uxScrollContent"] .last-item',end:"top center",anim:t=>{"small"!=document.body.dataset.size&&(u(()=>{r(0,0,0,e.group1)},"light"),"back"==t&&d(e.group2))},leave:()=>{d(e.group1)},leaveBack:()=>{d(e.group1)}},{id:"small-3",selector:'[data-section="shareOpener"]',start:"top top",endSelector:'[data-section="shareScrollContent2"] .last-item',end:"top center",anim:t=>{"small"!=document.body.dataset.size&&u(()=>{e.hideObject(e.group2,0),r(0,0,0,e.group1)},document.body.dataset.theme)},leave:()=>{d(e.group1)},leaveBack:()=>{d(e.group1)}},{id:"large-4",selector:'[data-section="newIntroManifesto3"] [data-start]',start:"top center",end:"bottom center",endSelector:'[data-section="shareSectionFull"] [data-end]',anim:()=>{h(()=>{e.setMode(e.group2,"black"),window.innerWidth,r(0,-15,0,e.group2)},"dark")},leave:()=>{d(e.group2)},leaveBack:()=>{d(e.group2)}},{id:"project-sections",selector:'[data-section="projectList"]',endSelector:'[data-section="projectList"] .project-list-end-trigger',start:window.innerWidth>1024?"top top":"top bottom",end:"bottom top",anim:t=>{document.body.dataset.theme="dark",e.modeBlack()},leave:()=>{document.body.dataset.theme="light",e.modeWhite()},leaveBack:()=>{}},{id:"small-award-5",selector:'[data-section="awardOpener"]',start:"top top",end:"bottom bottom",anim:t=>{document.body.dataset.theme="light",document.body.dataset.transition="false",l.delayedCall(.3,()=>{document.body.removeAttribute("data-transition"),16777215==e.group1.material.color.getHex()&&e.modeWhite()})},leave:()=>{},leaveBack:()=>{}},{id:"project-sections-2",selector:'[data-section="projectOpener"]',start:"top top",end:"bottom top",anim:t=>{document.body.classList.add("is-pinned-image"),document.body.dataset.theme="dark",e.modeBlack(),document.body.dataset.transition="false",l.delayedCall(.3,()=>{document.body.removeAttribute("data-transition")})},leave:()=>{document.body.classList.remove("is-pinned-image")},leaveBack:()=>{document.body.classList.remove("is-pinned-image")}},{id:"small-4",selector:'[data-section="projectOpener"]',start:"top 25%",endSelector:'[data-section="awardClosure"]',end:"bottom bottom",anim:t=>{"small"!=document.body.dataset.size&&u(()=>{r(0,0,0,e.group1)},document.body.dataset.theme)},leave:()=>{d(e.group1)},leaveBack:()=>{d(e.group1)}}];for(let e=0;e<n.length;e++){const t=n[e],i=a.create({trigger:t.selector,start:t.start,end:t.end,...t.endSelector&&{endTrigger:t.endSelector},id:t.id,invalidateOnRefresh:!0,immediateRender:!1,onEnter:()=>{t.anim()},onEnterBack:()=>{t.anim("back")},onLeave:()=>{var e;null==(e=null==t?void 0:t.leave)||e.call(t)},onLeaveBack:()=>{var e;null==(e=null==t?void 0:t.leaveBack)||e.call(t)},onRefresh:e=>{},onToggle:e=>{if(e.isActive){const i=-1==e.direction?"back":"forward";t.anim(i)}}});p.push(i)}})(),()=>{p.forEach((e,t)=>{e&&e.kill()}),p=[]}},[t,i,n]),{refresh:e=>{if(e){const t=triggers.find(t=>t.vars.id===e);t&&t.refresh()}else triggers.forEach(e=>{e&&e.refresh()})},kill:e=>{if(e){const t=triggers.findIndex(t=>t.vars.id===e);-1!==t&&(triggers[t].kill(),triggers.splice(t,1))}else triggers.forEach(e=>{e&&e.kill()}),triggers=[]},getTriggers:()=>[...triggers]}}(u,h,E.current);e.useEffect(()=>{E.current&&0==R.current&&(R.current=!0,P())},[E,R]),e.useEffect(()=>{a.defaults({invalidateOnRefresh:!0,immediateRender:!1,scroller:_.current})},[]),e.useEffect(()=>{const e=()=>{a.refresh()};return window.addEventListener("load",e),()=>window.removeEventListener("load",e)},[]),e.useEffect(()=>{const e=()=>"ontouchstart"in window||navigator.maxTouchPoints>0||window.matchMedia("(pointer: coarse)").matches;let t=e();const i=()=>{const i=e();document.querySelector(".footer-cover")&&(document.querySelector(".footer-cover").style.height=`${document.querySelector(".footer-container").getBoundingClientRect().height}px`),!z&&u.current&&u.current.group2&&u.current.group2._resize&&u.current.group2._resize(),i!==t&&location.reload()};return window.addEventListener("resize",i),()=>{window.removeEventListener("resize",i)}},[]),e.useEffect(()=>{let e;const t=()=>{clearTimeout(e),e=setTimeout(()=>{a.refresh(),x.current&&x.current.refresh(),window.refreshDataSectionTriggers&&window.refreshDataSectionTriggers()},100)};return window.addEventListener("resize",t),()=>{window.removeEventListener("resize",t),clearTimeout(e)}},[]),e.useEffect(()=>(y(0),()=>{}),[]),e.useLayoutEffect(()=>{if(document.body.dataset.device=L,document.body.dataset.browser=A?"safari":"other",document.body.dataset.touch=N?"true":"false",O){const e=2;x.current=d.create({wrapper:"#smooth-wrapper",content:"#smooth-content",smooth:e,effects:!1,smoothTouch:!1,normalizeScroll:!0,ignoreMobileResize:!0,onUpdate:e=>{const t=e.scrollTop();e.getVelocity(),u.current&&u.current.group1&&u.current.group2&&(u.current.group1.info.scrollTop=t,u.current.group2.info.scrollTop=t)}}),x.current.paused(!0),a.defaults({scroller:x.current.wrapper(),refreshPriority:1}),window.ScrollSmoother=x.current,a.refresh(!0)}else{a.defaults({refreshPriority:1,scroller:_.current,ignoreMobileResize:!0});const e=e=>{if(!r)return;const t=e.target.scrollTop;u.current&&u.current.group1&&u.current.group2&&(u.current.group1.info.scrollTop=t,u.current.group2.info.scrollTop=t)},t=document.getElementById("smooth-wrapper");t?(t.addEventListener("scroll",e,{passive:!0}),_.current.mobileScrollHandler=e,_.current.smoothWrapper=t):(window.addEventListener("scroll",e,{passive:!0}),_.current.mobileScrollHandler=e)}return()=>{var e;x.current&&(x.current.kill(),a.removeEventListener("refresh",()=>{var e;return null==(e=x.current)?void 0:e.refresh()})),(null==(e=_.current)?void 0:e.mobileScrollHandler)&&(_.current.smoothWrapper?_.current.smoothWrapper.removeEventListener("scroll",_.current.mobileScrollHandler):window.removeEventListener("scroll",_.current.mobileScrollHandler),_.current.mobileScrollHandler=null,_.current.smoothWrapper=null)}},[L,A,N,O,r]);return t.jsxs(t.Fragment,{children:[t.jsx("div",{id:"smooth-wrapper",ref:_,children:t.jsxs("div",{id:"smooth-content",className:"App",ref:b,style:{position:"relative",zIndex:4,flexDirection:"column",gap:"180px"},children:[t.jsx("div",{"data-section":"cover",children:t.jsx(U,{ref:p,symbolRef:u,symbolContainerRef:h,onOutroComplete:()=>{m.current&&m.current.executeIntroAnimation&&!j.current&&(j.current=!0,document.body.classList.remove("is-loading"),m.current.executeIntroAnimation())}})}),t.jsx("div",{"data-section":"hero",style:{zIndex:9,position:"relative",opacity:0,pointerEvents:"none"},children:t.jsx(ue,{ref:m,symbolRef:u,symbolContainerRef:h,unlockScroll:v,onIntroComplete:()=>{o(!0)}})}),t.jsx("div",{className:"is-spacer-1"}),t.jsxs("div",{className:"bg-dark",children:[t.jsx("div",{"data-section":"heroVideo",children:t.jsx(pe,{})}),t.jsx("div",{"data-section":"intro",children:t.jsx(Te,{ref:f,symbolRef:u,symbolContainerRef:h,isCoverCompleted:E.current})}),t.jsx("div",{style:{height:"70dvh"}}),t.jsx("div",{"data-section":"introManifesto","data-st":"large",children:t.jsx(Ae,{symbolRef:u,symbolContainerRef:h,isCoverCompleted:E.current})}),t.jsx("div",{"data-section":"introClosure",children:t.jsx(Ie,{symbolRef:u,symbolContainerRef:h,isCoverCompleted:E.current})})]}),t.jsxs("div",{className:"bg-light",children:[t.jsx("div",{"data-section":"historyOpener",children:t.jsx(Ye,{ref:g,symbolRef:u,symbolContainerRef:h,isCoverCompleted:E.current})}),t.jsx("div",{"data-section":"image",children:t.jsx(Tr,{src:"/assets/image-apple.jpg",srcMobile:"/assets/image-apple.jpg",aspectRatio:"4/2",sectionName:"image",moveY:20,style:{borderRadius:"0px"}})}),t.jsx("div",{"data-section":"scrollContent",children:t.jsx(Ao,{symbolRef:u,symbolContainerRef:h})})]}),t.jsxs("div",{className:"bg-dark",children:[t.jsx("div",{"data-section":"bxOpener",children:t.jsx(Lo,{symbolRef:u,symbolContainerRef:h})}),t.jsx("div",{"data-section":"imageDorco",children:t.jsx(Ko,{})}),t.jsx("div",{"data-section":"bxScrollContent",children:t.jsx(No,{symbolRef:u,symbolContainerRef:h})}),t.jsx("div",{"data-section":"svgUnitBX",children:t.jsx(Qo,{isCoverCompleted:E.current})}),t.jsx("div",{"data-section":"bxScrollContent2",children:t.jsx(zo,{symbolRef:u,symbolContainerRef:h})}),t.jsx("div",{className:"is-spacer-2",style:{height:"45dvh"}}),t.jsx("div",{"data-section":"newIntroManifesto","data-st":"large",children:t.jsx(Vr,{symbolRef:u,symbolContainerRef:h,isCoverCompleted:E.current})}),t.jsx("div",{"data-section":"sectionPinnerEnd",children:t.jsx(Po,{})})]}),t.jsx("div",{"data-section":"uxOpener",style:{position:"relative",zIndex:2},children:t.jsx(Io,{symbolRef:u,symbolContainerRef:h})}),t.jsxs("div",{className:"bg-light has-bg",style:{zIndex:2,marginTop:"-100dvh"},children:[t.jsx("div",{className:"is-spacer-ux",style:{height:"100dvh",pointerEvents:"none"}}),t.jsx("div",{"data-section":"uxScrollContent2",children:t.jsx(Zo,{symbolRef:u,symbolContainerRef:h,sectionName:"uxScrollContent2"})}),t.jsx("div",{"data-section":"svgUnitUX",children:t.jsx(es,{isCoverCompleted:E.current})}),t.jsx("div",{"data-section":"uxScrollContent",children:t.jsx(Bo,{symbolRef:u,symbolContainerRef:h,sectionName:"uxScrollContent"})}),t.jsx("div",{"data-section":"newIntroManifesto2","data-st":"large",children:t.jsx(Ur,{})}),t.jsx("div",{"data-section":"sectionFullEnd",children:t.jsx(Mo,{symbolRef:u,symbolContainerRef:h})}),t.jsxs("div",{"data-section":"kolon",children:[t.jsx(zr,{src:"/assets/bx/kolon.png",srcMobile:"/assets/bx/kolon-mo.png",aspectRatio:"1920/1700",mobileAspectRatio:"752/1626",full:!0,linecolor:"var(--text-color-white)",sectionName:"kolon",noScroll:!0,style:{borderRadius:0}}),t.jsx("div",{className:"is-spacer-3",style:{height:"80dvh"}})]})]}),t.jsx("div",{"data-section":"shareOpener",style:{position:"relative",marginTop:"-80dvh",zIndex:3},children:t.jsx(Do,{symbolRef:u,symbolContainerRef:h})}),t.jsxs("div",{className:"bg-dark",children:[t.jsx("div",{className:"share-space",style:{height:"50dvh"}}),t.jsx("div",{"data-section":"shareScrollContent",children:t.jsx(Ho,{symbolRef:u,symbolContainerRef:h})}),t.jsx("div",{"data-section":"shareItem",style:{marginTop:-4},children:t.jsx(Jo,{isCoverCompleted:E.current})}),t.jsx("div",{"data-section":"shareScrollContent2",children:t.jsx(Fo,{symbolRef:u,symbolContainerRef:h})}),t.jsx("div",{"data-section":"newIntroManifesto3","data-st":"large",children:t.jsx($r,{})}),t.jsx("div",{"data-section":"shareSectionFull",children:t.jsx(Yr,{})}),t.jsx("div",{"data-section":"imageOsulloc",children:t.jsx(H,{start:"100% bottom",end:.99*window.innerHeight,pin:!0,pinType:"transform",id:"imageOsulloc-0",children:t.jsx(zr,{src:"/assets/sharex/share_FullImage_2_pc.jpg",srcMobile:"/assets/sharex/share_FullImage_2_mo.jpg",aspectRatio:"1920/1078",mobileAspectRatio:"604/965",full:!0,sectionName:"imageOsulloc",noScroll:!0})})})]}),t.jsxs("div",{className:"bg-dark",children:[t.jsx("div",{"data-section":"projectOpener",style:{zIndex:2},children:t.jsx($o,{symbolRef:u,symbolContainerRef:h})}),t.jsx("div",{"data-section":"ProjectManifesto",children:t.jsx(Wo,{symbolRef:u,symbolContainerRef:h})}),t.jsx("div",{"data-section":"projectList",style:{position:"relative",zIndex:1},children:t.jsx(Uo,{symbolRef:u,previewRef:C})})]}),t.jsxs("div",{className:"bg-light light-last",children:[t.jsx("div",{"data-section":"awardOpener",style:{position:"relative",zIndex:2},children:t.jsx(qo,{symbolRef:u,symbolContainerRef:h})}),t.jsx("div",{"data-section":"awardManifesto",style:{position:"relative",zIndex:2},children:t.jsx(Xo,{})}),t.jsx("div",{className:"is-pc",style:{height:"20dvh"}}),t.jsx("div",{"data-section":"newAward",children:t.jsx(go,{symbolRef:u,isCoverCompleted:E.current})}),t.jsx("div",{className:"is-spacer",style:{height:"30dvh"}}),t.jsx("div",{"data-section":"awardClosure",children:t.jsx(Go,{isCoverCompleted:E.current})}),t.jsx("div",{"data-section":"partner",style:{position:"relative",zIndex:2,backgroundColor:"var(--text-color-white)"},children:t.jsx(Yo,{})}),t.jsx("div",{className:"footer-cover",style:{height:S?"90dvh":"120dvh",backgroundColor:"var(--text-color-black)",position:"relative",zIndex:-1,pointerEvents:"none"},children:t.jsx("div",{"data-section":"footer",children:t.jsx(Vo,{symbolRef:u,symbolContainerRef:h})})})]})]})}),t.jsx("div",{style:{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",pointerEvents:"none",opacity:1,zIndex:-1,willChange:"transform",backfaceVisibility:"hidden",transform:"translateZ(0)",pointerEvents:"none",userSelect:"none"},ref:h,children:t.jsx(Or,{ref:u,onReady:()=>{E.current=!0,y(0),w(),setTimeout(()=>{a.refresh(),k.current||p.current&&p.current.executeIntroAnimation&&(k.current=!0,p.current.executeIntroAnimation())},500)}})}),t.jsx("div",{"data-manifesto":"bxScrollContent2",className:"manifesto-hidden",style:{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:-1,visibility:"hidden",opacity:0,pointerEvents:"none"},children:t.jsx(Co,{symbolRef:u,symbolContainerRef:h,mobileLine:["It aligns values,","emotions, and ","interactions into","a cohesive whole."],pcLine:["It aligns values,","emotions, and interactions","into a cohesive whole."],triggerId:"bxManifesto-1",className:"bx-manifesto",textColor:"var(--text-color-white)",hasStaggerAnimation:!1})}),t.jsx("div",{"data-manifesto":"uxScrollContent",className:"manifesto-hidden",style:{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:-1,visibility:"hidden",opacity:0,pointerEvents:"none"},children:t.jsx(Co,{symbolRef:u,symbolContainerRef:h,pcLine:["They shape not just looks,","but how it works and feels."],mobileLine:["Narrative and ","system come","before anything ","seen."],hasStaggerAnimation:!1,triggerId:"kolonManifesto-1",className:"kolon-manifesto"})}),t.jsx("div",{"data-manifesto":"shareScrollContent2",className:"manifesto-hidden",style:{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:-1,visibility:"hidden",opacity:0,pointerEvents:"none"},children:t.jsx(Co,{symbolRef:u,symbolContainerRef:h,mobileLine:["Design moves","when knowledge","moves."],pcLine:["Design moves","when knowledge moves."],triggerId:"shareScrollContent2",className:"share-manifesto",textColor:"var(--text-color-white)",hasStaggerAnimation:!1})}),t.jsx("div",{"data-section":"newAward2",children:t.jsx(io,{})}),t.jsx(Ro,{ref:C})]})}history.scrollRestoration&&(history.scrollRestoration="manual"),window.history.scrollRestoration="manual",window.scrollTo(0,0),document.documentElement.scrollTop=0,document.body.scrollTop=0,o.createRoot(document.getElementById("root")).render(t.jsx(ts,{}));export{te as B,Kr as I,Co as M,Fe as S,ke as a,V as b,Zr as c,Jr as d,Qr as e,eo as f,z as g,to as h,F as t,D as u};
