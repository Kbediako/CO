import{r as t,j as e}from"./vendor-react-BpTY7yiE.js";import{d as i}from"./vendor-styled-DIClZvTp.js";import{u as r,S as a,g as n}from"./vendor-gsap-Dy24hvDL.js";import{a as o,B as l,t as s,u as d}from"./index-BLHSmbu2.js";n.registerPlugin(a);const m=i.div`
  position: relative;
  display: flex;
  flex-direction: ${t=>"row"===t.$layout?"row":"column"};
  ${t=>"row"===t.$layout?"flex-wrap: wrap; justify-content: space-between;":""}
  gap: 16px;
  padding: ${t=>`${t.$paddingTop||"var(--gap200)"}px 0 ${t.$paddingBottom||"var(--gap400)"}px`};

  @media (max-width: 1024px) {
    gap: var(--gap180);
  }
`,c=i.div`
  ${s.Header_Large}
  width: var(--grid-6);
  color: ${t=>"dark"===t.theme?"var(--text-color-white)":"var(--text-color-black)"};
  margin-left: var(--grid-1);
  z-index: 2;
  &.has-badge {
    [direction] {
      margin-top: var(--gap40) !important;
    }
  }

  @media (max-width: 1024px) {
    position: relative !important;
    width: 100% !important;
    padding: 0 8px !important;
    text-align: center;
    box-sizing: border-box;
    margin-left: 0 !important;
    margin-right: 0 !important;
    left: 0 !important;
    align-items: center !important;
  }
`,p=i.div`
  ${s.Caption_Small}
`,g=i.div`
  display: flex;
  flex-direction: column;
  gap: var(--gap40);
  margin-top: 24px;
  ${s.Body_Large}
  font-weight: 450;
  color: ${t=>"dark"===t.theme?"var(--text-color-white)":"var(--text-color-black)"};
  z-index: 2;
  @media (max-width: 1024px) {
    margin-left: 0;
    padding-left: 0 !important;
  }
`,f=i.img`
  will-change: transform;
  transition: transform 1s var(--expoOut);
  backface-visibility: hidden;
  border-radius: 12px;
  transform: scale(2);
  &.bottom.center {
    transform-origin: center 100% !important;
  }
  @media (max-width: 1024px) {
    transform: scale(0.3) !important;
    transform-origin: center bottom !important;
    &.animate {
      transform: scale(1) !important;
    }
  }
`,h=i.div`
  position: absolute;
  width: 100%;
  height: 100%;
  will-change: width, height;
  overflow: hidden;
  aspect-ratio: var(--aspectRatio);

  // 이사님 확인 필요
  border-radius: 12px;
  &[data-animation-complete='true'] {
    width: 100% !important;
    height: 100% !important;
  }
`,u=i.div`
  position: absolute;
  top: 0;
  right: 0;
  width: var(--grid-5);
  height: 100%;

  // padding: 16px var(--grid-1) 0 calc(var(--grid-1) + 32px);
  padding-left: var(--grid-gap);
  margin-right: 16px;
  transform: translate(calc(100vw - 100%), 0);
  display: flex;
  flex-direction: row;
  align-items: center;
  ${s.Header_Large}
  color: ${t=>"dark"===t.theme?"var(--text-color-white)":"var(--text-color-black)"};

  @media (min-width: 1025px) {
    white-space: nowrap;
  }
`,x=i.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  z-index: 3;
  margin-top: -18px;
  padding-left: 0;

  @media (max-width: 1024px) {
    margin-top: 0 !important;
    margin-bottom: 0 !important;

    width: ${t=>t.$mobileWidth?`calc(var(--grid-${t.$mobileWidth}) + 16px)`:"auto"} !important;
    min-width: ${t=>t.$mobileWidth?`calc(var(--grid-${t.$mobileWidth}) + 16px)`:"auto"} !important;
  }
`,y=i.div`
  display: flex;
  flex-direction: ${t=>"row"===t.$layout?"row":"column"};
  ${t=>"row"===t.$layout?"flex-wrap: wrap; justify-content: space-between;":""}
  gap: 16px;
  margin-bottom: ${t=>t.$groupSpacing}px;

  &:last-child {
    margin-bottom: 0;
  }
`;i.div`
  ${s.Body_Large}
  color: ${t=>"dark"===t.theme?"var(--text-color-white)":"var(--text-color-black)"};
  margin-bottom: 32px;
  margin-left: var(--grid-1);
  font-weight: 600;
`;const b=i.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  min-width: max-content;
`,v=i.div`
  position: relative;
  display: flex;
  width: 100%;
  img {
    position: absolute;
    width: 100%;
    height: 100%;
    will-change: transform;
    backface-visibility: hidden;
    object-fit: cover;
  }
`;n.registerPlugin(a);const w=({width:i,mobileWidth:r,imageSrc:a,aspectRatio:s,aspectRatioMobile:m,badges:c,description:y,alignment:w="left",marginTop:S=0,marginRight:R=0,marginBottom:T=0,badgeAlignment:L="left",theme:W="light",descriptionWidth:k,descriptionPadding:B,descriptionStyle:O,transitionDirection:D="bottom center",layout:E="column",cardIndex:F,sectionName:_,rightDescription:M,rightDescriptionStyle:q,tailDescription:z,imageSrcMobile:H,className:P,style:A,lag:Y=0,speed:G=1,customDescription:J})=>{const K=t.useRef(null),Q=t.useRef(null),U=t.useRef(null),{isMobileOrTablet:V}=d();o({enableDeviceFiltering:!0,start:"50% bottom"}),o({enableDeviceFiltering:!0,start:"50% bottom"});const{containerRef:X}=o({enableDeviceFiltering:!0,start:"25% bottom"}),Z=t=>t.split("\n").map((t,i)=>e.jsx(N,{children:e.jsx(I,{className:"sub-title",children:t})},i)),tt="row"===E?{left:{justifyContent:"flex-start",marginRight:"auto"},right:{justifyContent:"flex-end",marginLeft:"auto"},center:{justifyContent:"center",margin:"0 auto"}}:{left:{marginRight:"auto",marginLeft:R,paddingLeft:"16px"},right:{marginLeft:"auto",marginRight:R},center:{margin:"0 auto"}};t.useEffect(()=>{var t;if(!K.current||!Q.current)return;if("true"===K.current.dataset.animationComplete)return;const e=V?document.querySelector(".smooth-wrapper")||null:(null==(t=window.ScrollSmoother)?void 0:t.wrapper())||document.querySelector("#smooth-wrapper")||null;V||(Q.current.style.width="0",Q.current.style.height="0");const i=new IntersectionObserver(t=>{t.forEach(t=>{var e,r;if(t.isIntersecting){if(K.current.dataset.animationComplete="true",V){Q.current.style.opacity=1,null==(r=null==(e=Q.current)?void 0:e.querySelectorAll(".image-inner"))||r.forEach(t=>{const e=t.parentElement.getBoundingClientRect().height;t.style.setProperty("transition",`transform ${.85+.35*Math.round((e-200)/50)}s var(--expoOut)`,"important"),t.style.transform="scale(1)",t.classList.add("animate")})}else{const t=Q.current.parentElement,e=t.offsetWidth,i=t.offsetHeight,r=Q.current;r.style.opacity=1,r.style.width=`${Math.floor(.3*e)}px`,r.style.height=`${Math.floor(.3*i)}px`,n.delayedCall(.02,()=>{r.style.willChange="width, height",r.style.transition="width 1.2s var(--expoOut), height 1.2s var(--expoOut)",r.style.width=`${e}px`,r.style.height=`${i}px`,n.delayedCall(1.21,()=>{r.dataset.animationComplete="true"})}),n.delayedCall(.1,()=>{var t,e;null==(e=null==(t=Q.current)?void 0:t.querySelectorAll(".image-inner"))||e.forEach(t=>{t.classList.add("animate")})})}i.unobserve(K.current.querySelector(".frame-trigger"))}})},{root:e,rootMargin:"0px 0px 0% 0px",threshold:(window.innerWidth,.4)});return i.observe(K.current.querySelector(".frame-trigger")),()=>i.disconnect()},[F,_]);return e.jsxs(x,{ref:K,className:`content-card-container ${P||""}`,$mobileWidth:r,style:{position:"relative",width:"full"===i?"100vw":"string"==typeof i?i:`var(--grid-${i})`,"--minWidth":"full"===i?"100vw":"string"==typeof i?i:`var(--grid-${i})`,marginLeft:"full"===i?"-32px":"0",minWidth:"full"===i?"100vw":"string"==typeof i?i:`var(--grid-${i})`,padding:"0",marginTop:`${S}px`,marginBottom:`${T}px`,"--aspectRatio":s,paddingLeft:c&&c.length>0&&"left"===w?"16px":"0",...tt[w],...A},"data-lag":Y,"data-speed":G,children:[e.jsxs(v,{style:{...{"top right":{justifyContent:"flex-end",alignItems:"flex-start"},"top left":{justifyContent:"flex-start",alignItems:"flex-start"},"top center":{justifyContent:"center",alignItems:"flex-start"},"center center":{justifyContent:"center",alignItems:"center"},"center right":{justifyContent:"flex-end",alignItems:"center"},"center left":{justifyContent:"flex-start",alignItems:"center"},"bottom right":{justifyContent:"flex-end",alignItems:"flex-start"},"bottom left":{justifyContent:"flex-start",alignItems:"flex-end"},"bottom center":{justifyContent:"center",alignItems:"flex-end"}}[D]},className:"frame-trigger",children:[e.jsx("span",{style:{width:"100%",aspectRatio:"var(--aspectRatio)"}}),e.jsx(h,{className:`frame-inner ${D}`,style:{transform:"bottom center"===D&&"translate(0%, 0%)"},ref:Q,children:e.jsxs("span",{className:"image-container",style:{position:"absolute",width:"100%",height:"100%",overflow:"hidden",minWidth:"var(--minWidth)",borderRadius:"12px",maxWidth:"100%",minHeight:"max-content",...{"top right":{top:0,right:0,transformOrigin:"left bottom !important"},"top left":{top:0,left:0,transformOrigin:"bottom left !important"},"top center":{top:0,left:"50%",transform:"translate(-50%, 0)",transformOrigin:"bottom -50% !important"},"center center":{top:"50%",left:"50%",transform:"translate(-50%, -50%)",transformOrigin:"50% 50% !important"},"center right":{top:"50%",right:0,transform:"translate(0, -50%)"},"center left":{top:"50%",left:0,transform:"translate(-50%, -50%)"},"bottom right":{bottom:0,right:0},"bottom left":{bottom:0,left:0,transformOrigin:"right 100%"},"bottom center":{bottom:0,left:"50%",transform:"translate(-50%, 0%)",transformOrigin:"center 0% !important"}}[D]},children:[e.jsx(f,{ref:U,src:a,className:`image-inner ${D} ${H&&"is-pc"}`,style:{position:"absolute",top:0,left:0}}),H&&e.jsx(f,{ref:U,src:H,className:`image-inner ${D} is-mobile`,style:{position:"absolute",top:0,left:0}})]})}),M&&e.jsx(u,{theme:W,className:"right-description",dangerouslySetInnerHTML:{__html:M.split("\n").join("<br />")},style:q})]}),c&&c.length>0&&e.jsx(b,{className:"badge-container",style:{...{left:{justifyContent:"flex-start"},right:{justifyContent:"flex-end"},center:{justifyContent:"center"}}[L],gap:"8px",marginTop:"16px",padding:"0"},children:c.map((t,i)=>e.jsx(l,{text:t.text,theme:t.theme||("dark"===W?"black":"white"),fill:t.fill||"false",size:t.size||"",enableScrollTrigger:t.enableScrollTrigger||!0},i))}),y&&e.jsxs(g,{className:"main-title",theme:W,style:{width:k||"100%",...O},children:[e.jsx("div",{ref:X,children:y.map((t,i)=>e.jsx("span",{className:"sub-title",children:Z(t)},`${_}-card-${F}-sub-title-${i}`))}),z&&e.jsx(p,{className:"tail-description",children:z})]}),J&&e.jsx(j,{className:"custom-description",children:J.map((t,i)=>e.jsxs($,{children:[e.jsx(C,{children:t[0]}),e.jsx(j,{children:t[1]})]},i))})]})},$=i.div`
  display: flex;
  flex-direction: column;
  gap: var(--gap16);
  width: var(--grid-4);
  margin-top: var(--gap80);
  &:first-of-type {
    margin-top: 0;
  }
`,j=i.div`
  ${s.Caption_Small}
`,C=i.div`
  ${s.Caption_Small}
`,S=({sectionName:i,theme:n="light",mainTitle:s,mainTitleBadge:d,closingTitle:p,contentCards:g=[],paddingTop:f,paddingBottom:h,mainTitlePadding:u,mainTitleStyle:x,closingTitleStyle:b,closingTitleClass:v,layout:$="column",groupBy:j=null,groupSpacing:C=80,groupWrapperStyle:S={},symbolRef:R})=>{t.useRef();const T=t.useRef(),{containerRef:L}=o({enableDeviceFiltering:!0,start:"50% bottom",debug:!0}),{containerRef:W}=o({enableDeviceFiltering:!0,start:"50% bottom",debug:!0}),k=t=>t.split("\n").map((t,i)=>e.jsx(N,{children:e.jsx(I,{className:"sub-title",children:t})},i)),B=(()=>{if(!j)return{ungrouped:g};const t={},e=[];return g.forEach((i,r)=>{const a=i[j];a?(t[a]||(t[a]={cards:[],layout:i.groupLayout||$}),t[a].cards.push({...i,originalIndex:r})):e.push({...i,originalIndex:r})}),{groups:t,ungroupedCards:e}})();return r(()=>{a.create({trigger:T.current,start:"top bottom",end:"bottom top",onEnter:()=>{R.current.updateFog()},onEnterBack:()=>{R.current.updateFog()},onLeave:()=>{},onLeaveBack:()=>{}})},{scope:T}),e.jsxs(m,{theme:n,$paddingTop:f,$paddingBottom:h,$layout:$,className:`content-scroll-section ${i}`,ref:T,children:[s&&e.jsx(e.Fragment,{children:e.jsxs(c,{className:"content-main-title "+(d?"has-badge":""),ref:L,theme:n,style:{...x},children:[k(s),d&&e.jsx(l,{text:d,theme:"",enableScrollTrigger:!0})]})}),j?e.jsxs(e.Fragment,{children:[Object.entries(B.groups).map(([t,r],a)=>e.jsx(y,{className:`group-container ${t}`,$layout:r.layout,$groupSpacing:C,style:S,children:r.cards.map((t,a)=>e.jsx(w,{...t,cardIndex:t.originalIndex??a,sectionName:i,theme:n,layout:r.layout,style:t.style},`${i}-card-${t.originalIndex??a}`))},`${i}-group-${t}-${a}`)),B.ungroupedCards.map((t,r)=>e.jsx(w,{cardIndex:t.originalIndex??r,sectionName:i,theme:n,layout:$,style:t.style,...t},`${i}-card-${t.originalIndex??r}`))]}):g.map((t,r)=>e.jsx(w,{cardIndex:r,sectionName:i,theme:n,layout:$,style:t.style,...t},`${i}-card-${r}`)),p&&e.jsx(c,{ref:W,theme:n,className:"closing-title",style:{marginTop:"100px",...b},children:k(p)})]})},N=i.div`
  position: relative;
  overflow: hidden;
`,I=i.div`
  transform: translateY(100%);
`;export{S as C};
