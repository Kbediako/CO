import{r as e,j as t}from"./vendor-react-BpTY7yiE.js";import{u as o,S as r,g as i}from"./vendor-gsap-Dy24hvDL.js";import{d as a}from"./vendor-styled-DIClZvTp.js";import{u as s,t as n}from"./index-BLHSmbu2.js";import"./vendor-three-vk0p53NZ.js";i.registerPlugin(r,o);const l=e.forwardRef(({symbolRef:a,symbolContainerRef:n,onOutroComplete:l},w)=>{const C=e.useRef(null),y=e.useRef(null),{isMobileOrTablet:b}=s();return o(()=>{const e=b?document.querySelector("#smooth-wrapper")||document.body:void 0;document.querySelector(".footer-cover").style.height=`${document.querySelector(".footer-container").getBoundingClientRect().height}px`;let t=window.innerWidth>1024?"top+=121px bottom":"top+=200px bottom";document.querySelector(".footer-container").clientHeight,r.create({trigger:".footer-cover",start:t,end:"bottom bottom",refreshOnResize:!b,...e&&{scroller:e,pinType:b?"fixed":"transform"},invalidateOnRefresh:!0,id:"footer-0",immediateRender:!1,onEnter:()=>{document.querySelector(".footer-cover")&&(document.querySelector(".footer-cover").style.height=`${document.querySelector(".footer-container").getBoundingClientRect().height}px`)},onToggle:e=>{e.isActive?document.body.classList.add("test-active-2"):document.body.classList.remove("test-active-2")},onLeaveBack:()=>{document.body.classList.remove("test-active-2")}});let o=(window.innerWidth,"top bottom"),s=window.innerWidth>1024?"top+=300px bottom":"top+=200px bottom";i.timeline({scrollTrigger:{trigger:".footer-cover",start:o,end:s,scrub:2,...e&&{scroller:e,pinType:"fixed"},id:"footer-1",immediateRender:!1,refreshPriority:1,invalidateOnRefresh:!0,onLeaveBack:()=>{}}}).to(".row-wrap",{translateY:0},"<"),r.create({trigger:".footer-cover",start:b?"top 78%":"top 60%",id:"footer-2",refreshOnResize:!b,...e&&{scroller:e,pinType:"fixed"},onEnter:()=>{h()},onLeave:()=>{document.body.classList.remove("test-active"),document.body.classList.remove("test-active-2")},onLeaveBack:()=>{document.body.classList.remove("test-active"),document.body.classList.remove("test-active-2")}}),r.create({trigger:".footer-cover",start:"top bottom",id:"footer-3",refreshOnResize:!b,...e&&{scroller:e,pinType:"fixed"},onLeave:()=>{p(),document.body.classList.remove("anchor-active")},onLeaveBack:()=>{p()}}),r.create({trigger:".footer-cover",start:"top bottom",end:"+="+2.1*window.innerHeight,id:"footer-4",refreshOnResize:!b,pinSpacing:!1,...e&&{scroller:e,pinType:"fixed"},pin:'[data-section="footer"]',invalidateOnRefresh:!0,immediateRender:!1,refreshPriority:10,toggleClass:"test-active",onToggle:e=>{e.isActive&&document.body.classList.add("anchor-active")},onLeaveBack:()=>{document.body.classList.remove("anchor-active"),document.body.dataset.theme="light",a.current.resetMode("light",0)}});const n=C.current.querySelector(".svg-container--plus"),l=C.current.querySelector(".svg-container--x"),c=C.current.querySelectorAll(".svg-container--plus .line"),d=C.current.querySelectorAll(".svg-container--x .line");r.refresh();const p=()=>{i.killTweensOf(n,"y"),i.killTweensOf(l,"y"),i.killTweensOf(c,"scaleY"),i.killTweensOf(d,"scaleY"),i.killTweensOf(c,"scaleX"),i.killTweensOf(d,"scaleX"),n.removeAttribute("style"),l.removeAttribute("style"),c.forEach(e=>e.removeAttribute("style")),d.forEach(e=>e.removeAttribute("style"));i.set(n,{y:"15%"}),i.set(l,{y:"15%"}),i.set(c[0],{scaleY:0}),i.set(c[1],{scaleX:0}),i.set(d[0],{scaleY:0}),i.set(d[1],{scaleX:0})},h=()=>{i.to(n,{y:0,duration:1,ease:"expo.out",delay:0}),i.to(l,{y:0,duration:1,ease:"expo.out",delay:0}),i.to(c[0],{scaleY:1,duration:1.1,ease:"expo.out",delay:0}),i.to(c[1],{scaleX:1,duration:1.1,ease:"expo.out",delay:0}),i.to(d[0],{scaleY:1,duration:1.1,ease:"expo.out",delay:0}),i.to(d[1],{scaleX:1,duration:1.1,ease:"expo.out",delay:0})}}),t.jsx(g,{ref:C,className:"footer-container",children:t.jsxs(c,{children:[t.jsx("div",{ref:y,className:"footer-logo",style:{position:"absolute",top:0,left:0,width:"100%",height:"100%",zIndex:0,padding:"64px var(--gap32) 120px",boxSizing:"border-box"},children:t.jsxs("div",{className:"logo--plusx ",style:{position:"relative",width:"auto",maxHeight:"100%",aspectRatio:"2/1",margin:"0 auto",top:"50%",transform:"translateY(-50%)"},children:[t.jsxs(x,{className:"svg-container svg-container--plus",children:[t.jsx(f,{className:"line plus-1"}),t.jsx(f,{className:"line plus-2"})]}),t.jsx(x,{className:"svg-container svg-container--x",children:t.jsxs(u,{children:[t.jsx(f,{className:"line x-1"}),t.jsx(f,{className:"line x-2"})]})})]})}),t.jsxs(d,{className:"footer-info-container",children:[t.jsx(m,{className:"row-container",children:t.jsx(p,{children:"Plus X © 2010-2025"})}),t.jsx(v,{children:t.jsxs(m,{className:"row-container row-wrap",style:{gap:"9px"},children:[t.jsx(h,{href:"https://plus-ex.com",target:"_blank",style:{padding:"0 5px"},"data-gtm-id":"footerWebsite",children:"Website"}),t.jsx(h,{href:"https://brunch.co.kr/@plusx",target:"_blank",style:{padding:"0 5px"},"data-gtm-id":"footerArticles",children:"Articles"}),t.jsx(h,{href:"https://virtual.plus-ex.com/",target:"_blank",style:{padding:"0 5px"},"data-gtm-id":"footerShowroom",children:"Showroom"}),t.jsx(h,{href:"https://sharex.fastcampus.co.kr/",target:"_blank",style:{padding:"0 5px"},"data-gtm-id":"footerSharex",children:"Share X"})]})}),t.jsx(v,{children:t.jsxs(m,{className:"row-container row-wrap contact-row",style:{gap:"var(--gap32)"},children:[t.jsx(h,{target:"_blank",href:"tel:+82-2-518-7717","data-gtm-id":"footerPhone",children:"+82-2-518-7717"}),t.jsx(h,{target:"_blacnk",href:"mailto:contact@plus-ex.com","data-gtm-id":"footerEmail",children:"contact@plus-ex.com"})]})}),t.jsx(v,{children:t.jsxs(m,{className:"row-container row-wrap sns-row",style:{gap:"var(--gap32)"},children:[t.jsx(h,{href:"https://kr.linkedin.com/company/plus-ex",target:"_blank","data-gtm-id":"footerLinkedin",children:t.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",children:[t.jsx("g",{clipPath:"url(#clip0_1500_12495)",children:t.jsx("path",{d:"M22.2234 0H1.77187C0.792187 0 0 0.773438 0 1.72969V22.2656C0 23.2219 0.792187 24 1.77187 24H22.2234C23.2031 24 24 23.2219 24 22.2703V1.72969C24 0.773438 23.2031 0 22.2234 0ZM7.12031 20.4516H3.55781V8.99531H7.12031V20.4516ZM5.33906 7.43438C4.19531 7.43438 3.27188 6.51094 3.27188 5.37187C3.27188 4.23281 4.19531 3.30937 5.33906 3.30937C6.47813 3.30937 7.40156 4.23281 7.40156 5.37187C7.40156 6.50625 6.47813 7.43438 5.33906 7.43438ZM20.4516 20.4516H16.8937V14.8828C16.8937 13.5562 16.8703 11.8453 15.0422 11.8453C13.1906 11.8453 12.9094 13.2937 12.9094 14.7891V20.4516H9.35625V8.99531H12.7687V10.5609H12.8156C13.2891 9.66094 14.4516 8.70938 16.1813 8.70938C19.7859 8.70938 20.4516 11.0813 20.4516 14.1656V20.4516Z",fill:"#808080"})}),t.jsx("defs",{children:t.jsx("clipPath",{id:"clip0_1500_12495",children:t.jsx("rect",{width:"24",height:"24",fill:"white"})})})]})}),t.jsx(h,{href:"https://www.facebook.com/plus.experience/",target:"_blank","data-gtm-id":"footerFacebook",children:t.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",children:[t.jsx("g",{clipPath:"url(#clip0_1500_12496)",children:t.jsx("path",{d:"M12 0C5.37264 0 0 5.37264 0 12C0 17.6275 3.87456 22.3498 9.10128 23.6467V15.6672H6.62688V12H9.10128V10.4198C9.10128 6.33552 10.9498 4.4424 14.9597 4.4424C15.72 4.4424 17.0318 4.59168 17.5685 4.74048V8.06448C17.2853 8.03472 16.7933 8.01984 16.1822 8.01984C14.2147 8.01984 13.4544 8.76528 13.4544 10.703V12H17.3741L16.7006 15.6672H13.4544V23.9122C19.3963 23.1946 24.0005 18.1354 24.0005 12C24 5.37264 18.6274 0 12 0Z",fill:"#808080"})}),t.jsx("defs",{children:t.jsx("clipPath",{id:"clip0_1500_12496",children:t.jsx("rect",{width:"24",height:"24",fill:"white"})})})]})}),t.jsx(h,{href:"https://www.instagram.com/plusx_creative/",target:"_blank","data-gtm-id":"footerInstagram",children:t.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",children:[t.jsxs("g",{clipPath:"url(#clip0_1500_12497)",children:[t.jsx("path",{d:"M12 2.16094C15.2063 2.16094 15.5859 2.175 16.8469 2.23125C18.0188 2.28281 18.6516 2.47969 19.0734 2.64375C19.6313 2.85938 20.0344 3.12188 20.4516 3.53906C20.8734 3.96094 21.1313 4.35938 21.3469 4.91719C21.5109 5.33906 21.7078 5.97656 21.7594 7.14375C21.8156 8.40937 21.8297 8.78906 21.8297 11.9906C21.8297 15.1969 21.8156 15.5766 21.7594 16.8375C21.7078 18.0094 21.5109 18.6422 21.3469 19.0641C21.1313 19.6219 20.8687 20.025 20.4516 20.4422C20.0297 20.8641 19.6313 21.1219 19.0734 21.3375C18.6516 21.5016 18.0141 21.6984 16.8469 21.75C15.5813 21.8062 15.2016 21.8203 12 21.8203C8.79375 21.8203 8.41406 21.8062 7.15313 21.75C5.98125 21.6984 5.34844 21.5016 4.92656 21.3375C4.36875 21.1219 3.96563 20.8594 3.54844 20.4422C3.12656 20.0203 2.86875 19.6219 2.65313 19.0641C2.48906 18.6422 2.29219 18.0047 2.24063 16.8375C2.18438 15.5719 2.17031 15.1922 2.17031 11.9906C2.17031 8.78438 2.18438 8.40469 2.24063 7.14375C2.29219 5.97187 2.48906 5.33906 2.65313 4.91719C2.86875 4.35938 3.13125 3.95625 3.54844 3.53906C3.97031 3.11719 4.36875 2.85938 4.92656 2.64375C5.34844 2.47969 5.98594 2.28281 7.15313 2.23125C8.41406 2.175 8.79375 2.16094 12 2.16094ZM12 0C8.74219 0 8.33438 0.0140625 7.05469 0.0703125C5.77969 0.126563 4.90313 0.332812 4.14375 0.628125C3.35156 0.9375 2.68125 1.34531 2.01563 2.01562C1.34531 2.68125 0.9375 3.35156 0.628125 4.13906C0.332812 4.90313 0.126563 5.775 0.0703125 7.05C0.0140625 8.33437 0 8.74219 0 12C0 15.2578 0.0140625 15.6656 0.0703125 16.9453C0.126563 18.2203 0.332812 19.0969 0.628125 19.8563C0.9375 20.6484 1.34531 21.3188 2.01563 21.9844C2.68125 22.65 3.35156 23.0625 4.13906 23.3672C4.90313 23.6625 5.775 23.8687 7.05 23.925C8.32969 23.9812 8.7375 23.9953 11.9953 23.9953C15.2531 23.9953 15.6609 23.9812 16.9406 23.925C18.2156 23.8687 19.0922 23.6625 19.8516 23.3672C20.6391 23.0625 21.3094 22.65 21.975 21.9844C22.6406 21.3188 23.0531 20.6484 23.3578 19.8609C23.6531 19.0969 23.8594 18.225 23.9156 16.95C23.9719 15.6703 23.9859 15.2625 23.9859 12.0047C23.9859 8.74688 23.9719 8.33906 23.9156 7.05938C23.8594 5.78438 23.6531 4.90781 23.3578 4.14844C23.0625 3.35156 22.6547 2.68125 21.9844 2.01562C21.3188 1.35 20.6484 0.9375 19.8609 0.632812C19.0969 0.3375 18.225 0.13125 16.95 0.075C15.6656 0.0140625 15.2578 0 12 0Z",fill:"#808080"}),t.jsx("path",{d:"M12 5.83594C8.59688 5.83594 5.83594 8.59688 5.83594 12C5.83594 15.4031 8.59688 18.1641 12 18.1641C15.4031 18.1641 18.1641 15.4031 18.1641 12C18.1641 8.59688 15.4031 5.83594 12 5.83594ZM12 15.9984C9.79219 15.9984 8.00156 14.2078 8.00156 12C8.00156 9.79219 9.79219 8.00156 12 8.00156C14.2078 8.00156 15.9984 9.79219 15.9984 12C15.9984 14.2078 14.2078 15.9984 12 15.9984Z",fill:"#808080"}),t.jsx("path",{d:"M19.8469 5.59531C19.8469 6.39219 19.2 7.03438 18.4078 7.03438C17.6109 7.03438 16.9688 6.3875 16.9688 5.59531C16.9688 4.79844 17.6156 4.15625 18.4078 4.15625C19.2 4.15625 19.8469 4.80313 19.8469 5.59531Z",fill:"#808080"})]}),t.jsx("defs",{children:t.jsx("clipPath",{id:"clip0_1500_12497",children:t.jsx("rect",{width:"24",height:"24",fill:"white"})})})]})})]})})]})]})})}),c=a.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  flex-direction: column;
  padding: calc(var(--grid-gap) * 2);
  opacity: 1;
  margin: 0 auto;
  @media (max-width: 1366px) {
    padding: var(--gap32);
    height: max-content;
    flex-direction: column;
    .footer-logo {
      padding: 0 var(--gap32) 40px !important;
    }
  }
  @media screen and (max-width: 1024px) {
    padding: 16px;
    .footer-logo {
      padding: 0 16px 40px !important;
    }
  }
`,d=a.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  @media (max-width: 1366px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 22px;
    padding-bottom: 4px;
  }
`,p=a.div`
  ${n.Caption_Small}
  color: var(--text-color-white);
  font-size: clamp(1.6rem, 1.7vw, 1.8rem);
`,h=a.a`
  ${n.Caption_Small}
  color: var(--text-secondary-black);
  text-decoration: none;
  text-transform: unset;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    // color: var(--text-color-white);
  }

  @media (max-width: 1366px) {
    padding: 4px 0 !important;
    font-size: 1.6rem;
  }
`,m=a.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-bottom: 10px;
  text-transform: uppercase;
  @media (max-width: 1366px) {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    width: 100%;
    padding-bottom: 10px;
    &.sns-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--gap32);
      margin-top: calc(var(--grid-gap) * 2);
      gap: 9px;
      @media screen and (max-width: 1366px) {
        gap: 16px !important;
        margin-top: 0 !important;
      }
    }
    &.contact-row {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px !important;
    }
  }
`,g=a.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  overflow-x: hidden;
  @media screen and (max-width: 1366px) {
    overflow: hidden;
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      transform: translateY(100%);
    }
  }
`,x=a.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 100%;
  will-change: transform;
  svg {
    width: 100%;
    height: 100%;
  }

  &.svg-container--plus {
    left: 0;
  }
  &.svg-container--x {
    right: 0;
    left: auto;
    width: 50%;
    height: 100%;
    top: 0%;
    right: 0%;
    // overflow: hidden;
    transform: rotate(45deg);
  }
  &.show {
    // transition: transform 0.3s ease;
    // transform: translateX(0);
  }

  &.svg-container--x {
    transform: rotate(45deg);
    transform-origin: center center;
  }
`,f=a.div`
  position: absolute;
  width: 100%;
  height: 5px;
  background-color: var(--text-color-white);
  transform-origin: center center;

  &.plus-1 {
    width: 5px;
    height: 100%;
    left: 0;
    right: 0;
    margin: auto;
    bottom: 0;
    top: 0;
    transform: scale(1, 0.1);
    // transform-origin: 100% 100%;
  }
  &.plus-2 {
    left: 0;
    right: 0;
    margin: auto;
    bottom: 0;
    top: 0;
    transform: scale(0.05, 1);
    // transform-origin: 100% 100%;
  }

  &.x-1 {
    width: 5px;
    height: 100%;
    left: 0;
    right: 0;
    margin: auto;
    bottom: 0;
    top: 0;
    transform: scale(1, 0.05);

    // transform-origin: 100% 100%;
  }
  &.x-2 {
    left: 0;
    right: 0;
    margin: auto;
    bottom: 0;
    top: 0;
    transform: scale(0.05, 1);

    // transform-origin: 100% 100%;
  }
`,u=a.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140%;
  height: 140%;
  transform: translate(-50%, -50%);
`,v=a.div`
  position: relative;
  overflow: hidden;

  .row-container {
    transform: translateY(120%);
    // transition: transform 0.3s ease;
    // &.active {
    // transform: translateY(0);
    // }
  }
`;export{l as default};
