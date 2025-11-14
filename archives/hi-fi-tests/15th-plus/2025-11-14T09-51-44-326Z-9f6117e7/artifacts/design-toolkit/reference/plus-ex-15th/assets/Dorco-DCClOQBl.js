import{r as e,j as t}from"./vendor-react-BpTY7yiE.js";import{d as o}from"./vendor-styled-DIClZvTp.js";import{u as r,g as i,S as a}from"./vendor-gsap-Dy24hvDL.js";import"./index-BLHSmbu2.js";import"./vendor-three-vk0p53NZ.js";i.registerPlugin(a,r);const s=({src:o,aspectRatio:s="1920/1080",style:c,full:g=!1,sectionName:p,backgroundColor:d="transparent",noScrub:u=!1,lineColor:m="#000"})=>{const f=e.useRef(null),h=e.useRef(null),x=e.useRef(null);return r(()=>{i.set(h.current,{scale:1.2});i.timeline({scrollTrigger:{trigger:f.current,start:"top 100%",end:"+="+.7*h.current.clientHeight,id:`${p}-image`}}).to(h.current,{scale:1}),a.create({trigger:f.current,start:"top 100%",end:()=>"+="+.7*h.current.clientHeight,once:!0,id:`${p}-3`,onEnter:()=>{i.to(x.current,{opacity:1,duration:1,ease:"expo.out"})},onEnterBack:()=>{}})},{scope:f}),t.jsx(t.Fragment,{children:t.jsxs(l,{$aspectRatio:"1859/952",$full:g,ref:f,style:{...c,"--lineColor":m},children:[t.jsx(n,{ref:x,style:{background:"linear-gradient(180deg, black, rgba(255,255,255,0))"}}),t.jsx("img",{src:"/assets/bx/bx_Dorco_FullImage.jpg",alt:"",loading:"lazy",className:"is-pc",ref:h,style:{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"cover",willChange:"transform",zIndex:1}}),t.jsx("img",{src:"/assets/bx/bx_Dorco_FullImage_mo.jpg",alt:"",loading:"lazy",ref:h,className:"is-mobile",style:{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"cover",willChange:"transform",zIndex:1}})]})})};o.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: var(--gap8);
  padding: 16px 0 0 16px;
  margin-bottom: var(--gap180);
  margin-top: var(--gap360);
`;const n=o.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  opacity: 0;
`,l=o.div`
  position: relative;
  width: 100%;
  margin: 0 auto;
  width: 100vw;
  aspect-ratio: ${e=>e.$aspectRatio};

  overflow: hidden;

  &::before {
    position: absolute;
    content: '';
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 4px;
    background-color: var(--lineColor);
  }

  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform-origin: 50% 100%;
  }
  @media (max-width: 1024px) {
    aspect-ratio: 564/1218;
  }
`;export{s as default};
