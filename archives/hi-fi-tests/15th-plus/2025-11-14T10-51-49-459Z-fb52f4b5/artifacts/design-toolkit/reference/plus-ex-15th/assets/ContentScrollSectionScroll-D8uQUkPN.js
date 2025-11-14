import{r as t,j as e}from"./vendor-react-BpTY7yiE.js";import{d as i}from"./vendor-styled-DIClZvTp.js";import{g as r,S as n}from"./vendor-gsap-Dy24hvDL.js";import{a,u as o,B as s,t as l,g as c}from"./index-BLHSmbu2.js";r.registerPlugin(n);const d=i.div`
  position: relative;
  display: flex;
  padding: 30dvh 0 !important;
  flex-direction: ${t=>"row"===t.$layout?"row":"column"};
  ${t=>"row"===t.$layout?"flex-wrap: wrap; justify-content: space-between;":""}
  gap: 16px;
  padding: ${t=>`${t.$paddingTop||"var(--gap200)"}px 0 ${t.$paddingBottom||"var(--gap400)"}px`};

  @media (max-width: 1024px) {
    gap: var(--gap140);
  }
`,m=i.div`
  ${l.Header_Large}
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
`,h=i.div`
  ${l.Caption_Small}
`,g=i.div`
  display: flex;
  flex-direction: column;
  gap: var(--gap40);
  margin-top: 24px;
  ${l.Body_Large}
  font-weight: 450;
  color: ${t=>"dark"===t.theme?"var(--text-color-white)":"var(--text-color-black)"};
  z-index: 2;
  @media (max-width: 1024px) {
    margin-left: 0;
    padding-left: 0 !important;
  }
`,p=i.img`
  will-change: transform;
  transition: transform 1.2s var(--expoOut);
  backface-visibility: hidden;
  border-radius: 12px;
  transform: scale(0.3);
  &.bottom.center {
    transform-origin: center 100% !important;
  }
  @media (max-width: 1024px) {
    transform: scale(0.3);
    transform-origin: center bottom !important;
    &.animate {
      transform: scale(1) !important;
      // transition: transform 1.1s var(--expoOut);
    }
  }
`,u=i.div`
  position: absolute;
  width: 100%;
  height: 100%;
  will-change: width, height;
  overflow: visible !important;
  aspect-ratio: var(--aspectRatio);
  transform: translateZ(0);
  backface-visibility: hidden;

  // 이사님 확인 필요
  border-radius: 12px;
  &[data-animation-complete='true'] {
    width: 100% !important;
    height: 100% !important;
  }
`,f=i.div`
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
  ${l.Header_Large}
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
`,v=i.div`
  display: flex;
  flex-direction: ${t=>"row"===t.$layout?"row":"column"};
  ${t=>"row"===t.$layout?"flex-wrap: wrap; justify-content: space-between;":""}
  gap: 16px;
  margin-bottom: ${t=>t.$groupSpacing}px;

  &:last-child {
    margin-bottom: 0;
  }
`;i.div`
  ${l.Body_Large}
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
`,w=i.div`
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
`,y=({width:i,mobileWidth:n,imageSrc:l,aspectRatio:d,aspectRatioMobile:m,badges:v,description:y,alignment:C="left",marginTop:W=0,marginRight:R=0,marginBottom:B=0,badgeAlignment:T="left",theme:H="light",descriptionWidth:O,descriptionPadding:I,descriptionStyle:N,transitionDirection:M="bottom center",layout:L="column",cardIndex:E,sectionName:k,rightDescription:z,tailDescription:P,imageSrcMobile:q,className:_,style:D,lag:V=0,speed:F=1,customDescription:A})=>{const Y=t.useRef(null),U=t.useRef(null),Z=t.useRef(null);a({enableDeviceFiltering:!0,start:"50% bottom"}),a({enableDeviceFiltering:!0,start:"50% bottom"});const G="row"===L?{left:{justifyContent:"flex-start",marginRight:"auto"},right:{justifyContent:"flex-end",marginLeft:"auto"},center:{justifyContent:"center",margin:"0 auto"}}:{left:{marginRight:"auto",marginLeft:R,paddingLeft:"16px"},right:{marginLeft:"auto",marginRight:R},center:{margin:"0 auto"}},{isMobileOrTablet:J}=o({});t.useEffect(()=>{var t;if(!Y.current||!U.current)return;if("true"===Y.current.dataset.animationComplete)return;c();const e=J?document.querySelector(".smooth-wrapper")||null:(null==(t=window.ScrollSmoother)?void 0:t.wrapper())||document.querySelector("#smooth-wrapper")||null,i=new IntersectionObserver(t=>{t.forEach(t=>{var e,n,a,o;if(t.isIntersecting){Y.current.dataset.animationComplete="true";const t=U.current.parentElement;t.offsetWidth;const s=t.offsetHeight;J?null==(n=null==(e=Y.current)?void 0:e.querySelectorAll(".image-inner"))||n.forEach(t=>{r.set(t,{"--height":s}),t.style.setProperty("transition",`transform ${.85+.35*Math.round((s-200)/50)}s var(--expoOut)`,"important"),t.style.transform="scale(1)",t.classList.add("animate")}):null==(o=null==(a=Y.current)?void 0:a.querySelectorAll(".image-inner"))||o.forEach(t=>{t.classList.add("animate")}),i.unobserve(Y.current.querySelector(".frame-trigger"))}})},{root:e,rootMargin:"0px 0px 0% 0px",threshold:(window.innerWidth,.4)});return i.observe(Y.current.querySelector(".frame-trigger")),()=>i.disconnect()},[E,k]);return e.jsxs(x,{ref:Y,className:`content-card-container ${_||""} ${C}`,$mobileWidth:n,style:{position:"relative",width:"16vw","--minWidth":"16vw",marginLeft:"full"===i?"-32px":"0",minWidth:"16vw",padding:"0",marginTop:`${W}px`,marginBottom:`${B}px`,"--aspectRatio":d,paddingLeft:v&&v.length>0&&"left"===C?"16px":"0",...G[C],...D,transformOrigin:"center center !important"},children:[e.jsxs(w,{style:{...{"top right":{justifyContent:"flex-end",alignItems:"flex-start"},"top left":{justifyContent:"flex-start",alignItems:"flex-start"},"top center":{justifyContent:"center",alignItems:"flex-start"},"center center":{justifyContent:"center",alignItems:"center"},"center right":{justifyContent:"flex-end",alignItems:"center"},"center left":{justifyContent:"flex-start",alignItems:"center"},"bottom right":{justifyContent:"flex-end",alignItems:"flex-start"},"bottom left":{justifyContent:"flex-start",alignItems:"flex-end"},"bottom center":{justifyContent:"center",alignItems:"flex-end"}}[M]},className:"frame-trigger",children:[e.jsx("span",{style:{width:"100%",aspectRatio:"var(--aspectRatio)"}}),e.jsx(u,{className:`frame-inner ${M}`,style:{transform:"bottom center"===M&&"translate(0%, 0%)"},ref:U,children:e.jsxs("span",{className:"image-container",style:{position:"absolute",width:"100%",height:"100%",overflow:"visible !important",minWidth:"var(--minWidth)",borderRadius:"12px",maxWidth:"100%",minHeight:"max-content",...{"top right":{top:0,right:0,transformOrigin:"left bottom !important"},"top left":{top:0,left:0,transformOrigin:"bottom left !important"},"top center":{top:0,left:"50%",transform:"translate(-50%, 0)",transformOrigin:"bottom -50% !important"},"center center":{top:"50%",left:"50%",transform:"translate(-50%, -50%)",transformOrigin:"50% 50% !important"},"center right":{top:"50%",right:0,transform:"translate(0, -50%)"},"center left":{top:"50%",left:0,transform:"translate(-50%, -50%)"},"bottom right":{bottom:0,right:0},"bottom left":{bottom:0,left:0,transformOrigin:"right 100%"},"bottom center":{bottom:0,left:"50%",transform:"translate(-50%, 0%)",transformOrigin:"center 0% !important"}}[M],transformOrigin:"center center !important"},children:[e.jsx(p,{ref:Z,src:l,className:`image-inner ${M} ${q&&"is-pc"}`,style:{position:"absolute",top:0,left:0,transformOrigin:"center center !important"}}),q&&e.jsx(p,{ref:Z,src:q,className:`image-inner ${M} is-mobile`,style:{position:"absolute",top:0,left:0,transformOrigin:"center center !important"}})]})}),z&&e.jsx(f,{theme:H,className:"right-description",dangerouslySetInnerHTML:{__html:z.split("\n").join("<br />")}})]}),v&&v.length>0&&e.jsx(b,{className:"badge-container",style:{...{left:{justifyContent:"flex-start"},right:{justifyContent:"flex-end"},center:{justifyContent:"center"}}[T],gap:"8px",marginTop:"16px",padding:"0"},children:v.map((t,i)=>e.jsx(s,{text:t.text,theme:t.theme||("dark"===H?"black":"white"),fill:t.fill||"false",size:t.size||"",enableScrollTrigger:t.enableScrollTrigger||!0},i))}),y&&e.jsxs(g,{className:"main-title",theme:H,style:{width:O||"100%",...N},children:[e.jsx("div",{ref:descriptionRef,children:y.map((t,i)=>e.jsx("span",{className:"sub-title",children:processLineBreaks(t)},`${k}-card-${E}-sub-title-${i}`))}),P&&e.jsx(h,{className:"tail-description",children:P})]}),A&&e.jsx(j,{className:"custom-description",children:A.map((t,i)=>e.jsxs($,{children:[e.jsx(S,{children:t[0]}),e.jsx(j,{children:t[1]})]},i))})]})},$=i.div`
  display: flex;
  flex-direction: column;
  gap: var(--gap16);
  width: var(--grid-4);
  margin-top: var(--gap80);
  &:first-of-type {
    margin-top: 0;
  }
`,j=i.div`
  ${l.Caption_Small}
`,S=i.div`
  ${l.Caption_Small}
`,C=({sectionName:i,theme:l="light",mainTitle:c,mainTitleBadge:h,closingTitle:g,contentCards:p=[],paddingTop:u,paddingBottom:f,mainTitlePadding:x,mainTitleStyle:b,closingTitleStyle:w,closingTitleClass:$,layout:j="column",groupBy:S=null,groupSpacing:C=80,groupWrapperStyle:W={}})=>{t.useRef();const R=t.useRef(),{containerRef:B}=a({enableDeviceFiltering:!0,start:"50% bottom",debug:!0}),{containerRef:T}=a({enableDeviceFiltering:!0,start:"50% bottom",debug:!0}),H=t=>t.split("\n").map((t,i)=>e.jsx(SubTitleInner,{children:e.jsx(SubTitleContent,{className:"sub-title",children:t})},i)),O=(()=>{if(!S)return{ungrouped:p};const t={},e=[];return p.forEach((i,r)=>{const n=i[S];n?(t[n]||(t[n]={cards:[],layout:i.groupLayout||j}),t[n].cards.push({...i,originalIndex:r})):e.push({...i,originalIndex:r})}),{groups:t,ungroupedCards:e}})(),{isMobileOrTablet:I}=o(),N=t.useRef([]);return t.useLayoutEffect(()=>{if(!R.current)return;const t=r.context(()=>{var t;if(I)return;N.current=[];const e=I?document.querySelector("#smooth-wrapper"):null==(t=window.ScrollSmoother)?void 0:t.wrapper();class a{constructor(t,e){this.testBox=t,this.index=e,this.randomMultiplier=Math.random()-.5,this.ovalWidth=window.innerWidth/3.1+this.randomMultiplier*window.innerWidth*.5/10,this.ovalWidthOrigin=this.ovalWidth,this.ovalHeight=window.innerHeight/2+this.testBox.clientHeight,this.ovalHeightExtend=250,this.ovalPositionMove=300,this.prevScrollY=0,this.bounceVal=0,this.bounceValTarget=0,this.bounceMultipleHeight=0,this.bounceMax=400,this.init()}init(){this.index,this.testBox.dataset.height=this.testBox.clientHeight,this.startPosition=.5*window.innerWidth-this.testBox.clientWidth/2,r.set(this.testBox,{x:this.startPosition}),this.dir=this.index%2*2-1}recalculateOnResize(){this.ovalWidth=window.innerWidth/3.1+this.randomMultiplier*window.innerWidth*.5/10,this.ovalWidthOrigin=this.ovalWidth,this.startPosition=.5*window.innerWidth-this.testBox.clientWidth/2,this.ovalHeight=window.innerHeight/2+this.testBox.clientHeight}update(t){const e=window.innerHeight-this.testBox.getBoundingClientRect().top-this.testBox.clientHeight/2;this.bounceValTarget=Math.min(Math.abs(e-this.prevScrollY)*this.bounceMultipleHeight,this.bounceMax),this.bounceVal+=.1*(this.bounceValTarget-this.bounceVal),this.ovalWidth=this.ovalWidthOrigin+this.bounceVal;const i=.5*window.innerHeight-this.ovalPositionMove-this.testBox.getBoundingClientRect().top-this.testBox.clientHeight/2,r=this.ovalWidth*Math.sqrt(1-i*i/((this.ovalHeight+this.ovalHeightExtend)*(this.ovalHeight+this.ovalHeightExtend)))*this.dir,n=this.startPosition+r;this.prevScrollY=e,this.testBox.style.transform=`translate(${n}px, 0)`}}R.current.querySelectorAll(".content-card-container").forEach((t,e)=>{try{N.current.push(new a(t,e))}catch(i){}});const o=()=>{N.current.forEach(t=>{t.recalculateOnResize()})};return I||n.create({trigger:R.current,start:`top-=${1.3*window.innerHeight}px bottom`,end:"200% top",id:`scroll-animation-${i}`,...e&&{scroller:e},immediateRender:!1,invalidateOnRefresh:!0,refreshOnResize:!0,onUpdate:()=>{N.current.forEach(t=>{t.update()})}}),window.addEventListener("resize",o),()=>{window.removeEventListener("resize",o)}},R);return()=>{t.current&&(t.current.revert(),t.current=null)}},[I]),e.jsxs(d,{theme:l,$paddingTop:u,$paddingBottom:f,$layout:j,className:`content-scroll-section ${i} content-scroll-section-scroll`,ref:R,children:[c&&e.jsx(e.Fragment,{children:e.jsxs(m,{className:"content-main-title "+(h?"has-badge":""),ref:B,theme:l,style:{...b},children:[H(c),h&&e.jsx(s,{text:h,theme:"",enableScrollTrigger:!0})]})}),S?e.jsxs(e.Fragment,{children:[Object.entries(O.groups).map(([t,r],n)=>e.jsx(v,{className:`group-container ${t}`,$layout:r.layout,$groupSpacing:C,style:W,children:r.cards.map((t,n)=>e.jsx(y,{...t,cardIndex:t.originalIndex??n,sectionName:i,theme:l,layout:r.layout,style:t.style},`${i}-card-${t.originalIndex??n}`))},`${i}-group-${t}-${n}`)),O.ungroupedCards.map((t,r)=>e.jsx(y,{cardIndex:t.originalIndex??r,sectionName:i,theme:l,layout:j,style:t.style,...t},`${i}-card-${t.originalIndex??r}`))]}):p.map((t,r)=>e.jsx(y,{cardIndex:r,sectionName:i,theme:l,layout:j,style:t.style,...t},`${i}-card-${r}`)),g&&e.jsx(m,{ref:T,theme:l,className:"closing-title",style:{marginTop:"100px",...w},children:H(g)})]})};export{C};
