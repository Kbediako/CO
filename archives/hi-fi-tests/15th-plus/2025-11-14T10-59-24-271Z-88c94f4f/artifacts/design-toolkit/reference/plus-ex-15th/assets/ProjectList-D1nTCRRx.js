import{j as e,r as t}from"./vendor-react-BpTY7yiE.js";import{u as i,S as a,g as r}from"./vendor-gsap-Dy24hvDL.js";import{d as o}from"./vendor-styled-DIClZvTp.js";import{t as n,u as c}from"./index-BLHSmbu2.js";import"./vendor-three-vk0p53NZ.js";const l=({project:t,className:i,isAward:a})=>e.jsxs(s,{className:i+(a?" award":""),"data-src":t.image,children:[e.jsx(d,{className:"project-title",children:t.title}),e.jsxs(p,{children:[!a&&e.jsx(m,{children:t.clientName}),e.jsx(g,{children:t.date})]})]}),s=o.div`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 13px 16px;
  z-index: 10;
  &::before {
    // position: absolute;
    // content: '';
    // top: 0;
    // left: 0;
    // width: 100%;
    // height: 100%;
    // background-color: var(--text-color-white);

    // display: block;
    // z-index: 0;
    // transform-origin: 0 50%;
    // opacity: 0;
    // transition: opacity 0.1s var(--expoOut);
    // will-change: opacity;
  }

  &.award {
    &::before {
      background-color: var(--text-color-black);
    }
  }

  &[data-state='now'] {
    &::before {
      opacity: 1;
      transition: opacity 0.5s var(--expoOut);
    }
  }

  // &[data-state='next'] {
  //   opacity: 1;
  // }
  &[data-state='now'] {
    opacity: 1;
  }
  // &[data-state='prev'] {
  //   opacity: 1;
  // }
  &[data-state='next'] {
    opacity: 0.4;
  }
  &[data-state='prev'] {
    opacity: 0.4;
  }
  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 8px 16px;
  }
`,d=o.div`
  position: relative;
  z-index: 1;
  ${n.Body_Medium}
  color: #bbb;
  text-transform: unset;
  width: var(--grid-3);
  [data-state='now'] & {
    color: var(--text-color-white);
  }
  @media (max-width: 1024px) {
    ${n.Caption_Medium}
    [data-state='now'] & {
      color: var(--text-color-white);
      transition: color 0.2s var(--expoOut);
    }
  }
  .award & {
    color: var(--text-color-black);
    [data-state='now'] & {
      color: var(--text-color-white) !important;
    }
    @media (max-width: 1024px) {
      [data-state='now'] & {
        color: var(--text-color-white);
        transition: color 0.2s var(--expoOut);
      }
    }
  }
`,p=o.div`
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: var(--grid-4);
  padding-left: 16px;
  @media (max-width: 1024px) {
    padding-left: 0;
    width: 100%;
  }
`,m=o.div`
  flex: 3;
  ${n.Body_Medium}
  color: var(--text-trirary-black-is-ready);
  [data-state='now'] & {
    color: var(--text-color-white);
  }
  @media (max-width: 1024px) {
    ${n.Caption_Medium}
    [data-state='now'] & {
      color: #bababa;
    }
  }
`,g=o.div`
  min-width: 100px;
  flex: 1;
  ${n.Body_Medium}
  color: var(--text-secondary-black);
  text-align: right;
  .award & {
    ${n.Body_Medium}
  }
  @media (max-width: 1024px) {
    ${n.Caption_Medium}
  }
  color: var(--text-trirary-black-is-ready);
  [data-state='now'] & {
    color: var(--text-color-white);
    @media (max-width: 1024px) {
      color: #bababa;
    }
  }
  @media (max-width: 1024px) {
    order: -1;
    min-width: 30px;
    margin-right: 8px;
    flex: unset;
    text-align: left;
  }
`;o.div`
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 1000;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  width: clamp(var(--grid-2), 30vw, 60rem);
  opacity: 0;
  aspect-ratio: 800 / 600;
  transform: translate(calc(-100% - 1vw), calc(-50% + 30px)) scale(0.6);
  overflow: hidden;

  transition: margin-top 1s var(--expoOut);
  will-change: auto;
  [data-state='prev'] & {
    margin-top: 50px;
  }
  [data-state='next'] & {
    margin-top: -50px;
  }
  [data-state='now'] & {
    opacity: 1;
    margin-top: 0;
    transition: margin-top 1s var(--expoOut);
  }

  .award & {
    left: 0;
    transform: translate(0, -50%);
  }
`,o.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
`;const u=[{category:"E-Commerce",projects:[{id:1,title:"H Fashion",clientName:"H FASHION by HANSOME",date:"2024",image:"project_Hfashion.jpg"},{id:2,title:"LGE",clientName:"LG Electronics",date:"2024",image:"project_Lge.jpg"},{id:3,title:"EQL®",clientName:"HANSOME",date:"2023",image:"project_Eql.jpg"},{id:4,title:"Kolon Mall®",clientName:"Kolon Industries, Inc.",date:"2023",image:"project_KolonMall.jpg"},{id:5,title:"Lazynight®",clientName:"MUSINSA",date:"2022",image:"project_LazyNight.jpg"},{id:6,title:"MUSINSA®",clientName:"MUSINSA",date:"2022",image:"project_Musinsa.jpg"},{id:7,title:"iTOO",clientName:"LOTTE Homeshopping",date:"2021",image:"project_iTOO.jpg"},{id:8,title:"Styleshare",clientName:"Styleshare",date:"2021",image:"project_StyleShare.jpg"},{id:9,title:"T Universe",clientName:"SK Telecom",date:"2021",image:"project_TUniverse.jpg"},{id:10,title:"Wyd",clientName:"wyd Co.",date:"2020",image:"project_Wyd.jpg"}]},{category:"Fashion",projects:[{id:13,title:"-5KG JEANS",clientName:"-5KG JEANS",date:"2021",image:"project_5KgJeans.jpg"},{id:14,title:"SYSTEM",clientName:"HANSOME",date:"2020",image:"project_System.jpg"}]},{category:"Cosmetic",projects:[{id:15,title:"Beauty of Joseon",clientName:"GOODAI Global Inc.",date:"2024",image:"project_BeautyOfJoseon.jpg"},{id:16,title:"URG",clientName:"URG Corporation",date:"2021",image:"project_Urg.jpg"},{id:17,title:"Kineff",clientName:"Ami Cosmetics",date:"2020",image:"project_Kineff.jpg"},{id:18,title:"Fossula",clientName:"Ami Cosmetics",date:"2020",image:"project_Fossula.jpg"},{id:19,title:"Neker",clientName:"Ami Cosmetics",date:"2020",image:"project_Neker.jpg"},{id:20,title:"Leferi",clientName:"Leferi Co.",date:"2020",image:"project_leferi.jpg"}]},{category:"Finance & Insurance",projects:[{id:21,title:"Pawparazzi™",clientName:"Self-initiated",date:"2024",image:"project_Pawparazzi.jpg"},{id:22,title:"NICE GROUP",clientName:"NICE GROUP",date:"2023",image:"project_NiceGroup.jpg"},{id:23,title:"Cashnote",clientName:"Cashnote",date:"2023",image:"project_Cashnote.jpg"},{id:24,title:"Samsung Fire & Marine",clientName:"Samsung Fire & Marine",date:"2023",image:"project_SamsungFireMarines.jpg"}]},{category:"Lifestyle & Care",projects:[{id:25,title:"ZERO™",clientName:"SK Biopharmaceuticals",date:"2023",image:"project_Zero.jpg"},{id:26,title:"Konny®",clientName:"Konny by Erin",date:"2022",image:"project_Konny.jpg"},{id:27,title:"Archiveat",clientName:"Public Kitchen",date:"2022",image:"project_Archiveat.jpg"},{id:28,title:"Apartmentary",clientName:"Apartmentary Co.",date:"2022",image:"project_Apartmentary.jpg"},{id:29,title:"Cleanlab",clientName:"Cleanlab",date:"2021",image:"project_CleanLab.jpg"}]},{category:"Entertainment & Broadcast",projects:[{id:30,title:"Channel A",clientName:"Channel A",date:"2024",image:"project_ChannelA.jpg"},{id:31,title:"Iskra",clientName:"Iskra",date:"2023",image:"project_Iskra.jpg"},{id:32,title:"SLL",clientName:"SLL Joongang",date:"2023",image:"project_Sll.jpg"},{id:33,title:"COM2US",clientName:"COM2US Holdings",date:"2021",image:"project_Com2us.jpg"},{id:34,title:"GirlsPlanet999",clientName:"NC Universe",date:"2021",image:"project_GirlsPlanet.jpg"},{id:35,title:"Honor of Kings",clientName:"Tencent Games",date:"2021",image:"project_HonorOfKings.jpg"}]},{category:"Productivity",projects:[{id:36,title:"CASE 1",clientName:"WE THE CORE",date:"2023",image:"project_Case1.jpg"},{id:37,title:"Adobe Korea",clientName:"Adobe Korea",date:"2023",image:"project_AdobeKorea.jpg"}]},{category:"Spatial",projects:[{id:38,title:"PARS®",clientName:"Duomo&Co.",date:"2025",image:"project_Pars.jpg"},{id:39,title:"Lightroom® Seoul",clientName:"Lightroom",date:"2024",image:"project_LightRoom.jpg"},{id:40,title:"R Trunk Show",clientName:"RAWROW",date:"2024",image:"project_Rawrow.jpg"},{id:41,title:"FIND YOUR TASTE",clientName:"OSULLOC",date:"2024",image:"project_Osulloc.jpg"},{id:42,title:"Apple Myeongdong",clientName:"Apple Inc",date:"2023",image:"project_Apple.jpg"}]},{category:"Product",projects:[{id:43,title:"Dual Frame®",clientName:"Self-Initiated",date:"2021",image:"project_DualFrame.jpg"}]},{category:"Metaverse",projects:[{id:44,title:"Deeponde® Showroom",clientName:"Deeponde",date:"2022",image:"project_DeepondeShowroom.jpg"},{id:45,title:"MUSINSA® Virtual Showroom",clientName:"MUSINSA",date:"2022",image:"project_MusinsaShowroom.jpg"},{id:46,title:"Plus X® Showroom",clientName:"Self-Initiated",date:"2021",image:"project_PlusXShowroom.jpg"}]},{category:"Technology",projects:[{id:47,title:"DORCO®",clientName:"DORCO Co, LTD.",date:"2024",image:"project_Dorco.jpg"},{id:48,title:"UNIX®",clientName:"UNIX Electronics",date:"2024",image:"project_Unix.jpg",className:"is-last-project"}]}];r.registerPlugin(a,i);const j=({symbolRef:o,previewRef:n})=>{const s=t.useRef(null),d=t.useRef(),p=t.useRef();t.useRef(null),t.useRef(null);const m=t.useRef(null),{isMobileOrTablet:g}=c({enableBodyClass:!0,enableResize:!0});return t.useEffect(()=>{const e=()=>{const e=m.current;if(e&&!e.isActive){const e=document.querySelector(".project-list-pin-image");e&&e.classList.contains("show")&&e.classList.remove("show")}},t=g?document.querySelector("#smooth-wrapper"):window;return t&&t.addEventListener("scroll",e,{passive:!0}),()=>{t&&t.removeEventListener("scroll",e)}},[g]),t.useEffect(()=>{const e=setTimeout(()=>{if(s.current){const e=s.current.querySelectorAll(".project-list");e.forEach(e=>{e.dataset.state="next"});const t=Array.from(e).find(e=>!e.classList.contains("project-list-category"));t&&(t.dataset.state="now",t.dataset.src&&n.current&&n.current.set(`/assets/portfolio/${t.dataset.src}`));const i=document.querySelector(".project-list-pin-image");i&&i.classList.remove("show")}},100);return()=>clearTimeout(e)},[g]),i(()=>{const e=g?document.querySelector("#smooth-wrapper"):void 0,t=s.current.querySelectorAll(".project-list");let i=0;const c=()=>{const t=Date.now();if(t-i<16)return;i=t;const a=r.utils.toArray(".project-list",s.current);if(a.length<=0)return;let o;if(g&&e){const t=e.getBoundingClientRect();o=t.height/2}else o=window.innerHeight/2;const c=a.map(t=>{const i=t.getBoundingClientRect();let a;if(g&&e){const t=e.getBoundingClientRect();a=i.top-t.top+i.height/2}else a=i.top+i.height/2;return Math.abs(a-o)}),l=c.indexOf(Math.min(...c)),d=a[l];Array.from(a).find(e=>"now"===e.dataset.state)===d||a.forEach((e,t)=>{var i,a,r,o;if(t===l)if(e.dataset.state="now",d.classList.contains("project-list-category"))document.body.dataset.currentProject="",document.body.dataset.projectType="category",(null==(i=document.querySelector(".project-list-pin-image"))?void 0:i.classList.contains("show"))&&(null==(a=document.querySelector(".project-list-pin-image"))||a.classList.remove("show")),n.current&&n.current.remove();else{if(document.body.dataset.currentProject=d.dataset.src||"",document.body.dataset.projectType="project",!n.current)return;if(d.dataset.src){const e=`/assets/portfolio/${d.dataset.src}`;n.current.set(e)}(null==(r=document.querySelector(".project-list-pin-image"))?void 0:r.classList.contains("show"))||null==(o=document.querySelector(".project-list-pin-image"))||o.classList.add("show")}else e.dataset.state=t<l?"prev":"next"})},l=s.current.querySelector(".project-list-start-trigger"),d=s.current.querySelector(".project-list-end-trigger");if(!l||!d)return void setTimeout(()=>{const e=s.current.querySelector(".project-list-start-trigger"),t=s.current.querySelector(".project-list-end-trigger");e&&t&&setTimeout(()=>{s.current.querySelectorAll(".project-list").length>0&&c()},50)},50);let u;return u=a.create({trigger:l,start:"top bottom",endTrigger:d,end:"80% center",id:"project-list-scroll",...e&&{scroller:e},immediateRender:!1,invalidateOnRefresh:!0,refreshOnResize:!0,onEnter:e=>{var t,i,r,o,c,l,d,p,m,g,u,j,h,y,f,x;if(e.refresh(),window.innerWidth<1025&&(null==(t=a.getById("bg-tracker-light-2"))||t.refresh(),null==(i=a.getById("bg-tracker-dark-2"))||i.refresh(),null==(r=a.getById("trigger-to-white"))||r.refresh()),"true"!==document.body.dataset.rt&&(document.body.dataset.rt="true",null==(o=a.getById("project-sections"))||o.refresh(),null==(c=a.getById("scroll-animation-0"))||c.refresh(),null==(l=a.getById("scroll-animation-1"))||l.refresh(),null==(d=a.getById("scroll-animation-2"))||d.refresh(),null==(p=a.getById("scroll-animation-3"))||p.refresh(),null==(m=a.getById("award-block-0"))||m.refresh(),null==(g=a.getById("award-block-1"))||g.refresh(),null==(u=a.getById("award-block-2"))||u.refresh(),null==(j=a.getById("award-block-3"))||j.refresh(),null==(h=a.getById("awardOpener-scrub-trigger"))||h.refresh(),null==(y=a.getById("trigger-counting-animation-0"))||y.refresh(),null==(f=a.getById("trigger-counting-animation-1"))||f.refresh(),document.querySelector(".footer-cover").style.height=`${document.querySelector(".footer-container").getBoundingClientRect().height}px`,null==(x=a.getById("footer-0"))||x.refresh()),window.innerWidth<1025&&a.isInViewport(document.querySelector('[data-section="ProjectManifesto"] .is-mobile .main-title:nth-of-type(6)'),1))return;if(n.current){const e=s.current.querySelectorAll(".project-list"),t=Array.from(e).find(e=>"now"===e.dataset.state&&!e.classList.contains("project-list-category"));t&&t.dataset.src&&n.current.set(`/assets/portfolio/${t.dataset.src}`)}const w=document.querySelector(".project-list-pin-image");w&&w.classList.add("show")},onEnterBack:()=>{var e;null==(e=document.querySelector(".project-list-pin-image"))||e.classList.add("show")},onLeave:()=>{t[t.length-1]&&(t[t.length-1].dataset.state="next");const e=document.querySelector(".project-list-pin-image");e&&e.classList.remove("show"),document.body.dataset.theme},onLeaveBack:()=>{const e=document.querySelector(".project-list-pin-image");e&&e.classList.remove("show")},onUpdate:()=>{c()}}),window.innerWidth>1024&&(a.create({trigger:p.current,start:"90% bottom",id:"test",end:`+=${2*window.innerHeight}px`,...e&&{scroller:e},onEnter:()=>{o.current},onLeaveBack:()=>{o.current}}),a.create({trigger:p.current,start:"bottom bottom",end:`+=${2*window.innerHeight}px`,pinSpacing:!1,toggleClass:{targets:document.body,className:"project-pinned"},...e&&{scroller:e},onEnter:()=>{},onLeave:()=>{}})),m.current&&(m.current.kill(),m.current=null),m.current=u,()=>{m.current&&(m.current.kill(),m.current=null)}},{scope:s}),e.jsx("div",{ref:p,className:"project-list-pin",children:e.jsx(h,{ref:s,children:e.jsxs("div",{ref:d,style:{paddingBottom:"10dvh"},className:"pin-inner",children:[e.jsx("div",{className:"project-list-start-trigger"}),u.map((t,i)=>e.jsxs(y,{children:[e.jsx(f,{className:"project-list project-list-category",children:t.category}),e.jsx(x,{}),t.projects.map(t=>e.jsx(l,{project:t,className:`project-list ${t.className?t.className:""}`},t.id))]},i)),e.jsx("div",{className:"project-list-end-trigger"})]})})})};o.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100dvh;
  z-index: 2;
  border: 1px solid pink;
  .device-mobile & {
    position: fixed !important;
  }
`;const h=o.div`
  position: relative;
  display: flex;
  flex-direction: column;
  // gap: 40px;
  padding-bottom: 70dvh;
  padding-top: 20dvh;
  z-index: 2;

  @media (max-width: 1024px) {
    padding-bottom: 50dvh;
  }
`,y=o.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
`,f=o.div`
  ${n.Header_Small}
  color: var(--text-color-white);
  width: var(--grid-4);
  margin-left: auto;
  height: 54.4px;
  display: flex;
  align-items: center;
  text-transform: uppercase;

  @media (max-width: 1024px) {
    width: 50%;
    margin-left: auto;
    padding: 0 8px;
    height: 53px;
    ${n.Caption_Medium_Bold}
  }
`;o.div`
  position: absolute;
  top: 2px;
  left: 0;
  width: 100%;
  background-color: var(--text-color-white);
  will-change: auto;
  height: 54.4px;
  display: none !important;

  z-index: -1;

  transform: translateY(4px);
  &[data-state='enter'] {
    opacity: 1;
    transition: opacity 0.2s var(--expoOut);
  }
  &[data-state='hidden'] {
    opacity: 0 !important;
    transition: opacity 0.2s var(--expoOut);
  }
  @media (max-width: 1024px) {
    height: 52px !important;
    transform: translateY(-1px);
    // display: none !important;
  }
`;const x=o.div`
  width: 100%;
  height: 1px;
  background-color: var(--text-trirary-black-is-ready);
`;export{j as default};
