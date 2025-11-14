export default function scrubFooter() {
   const canvas = document.getElementById("hero-lightpass-3");
  const context = canvas.getContext("2d");
  let isMobile = window.innerWidth <= 990;
  const startFrame = 49;
  const endFrame   = 470;       // <-- last existing frame
  const frameCount = endFrame + 1;
  const footerScrub = { frame: startFrame };
  const basePath = canvas.getAttribute("img-path");

   function setCanvasSize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  setCanvasSize();

  const images = new Array(frameCount - startFrame);

  // helper to build each URL
  const currentFrame = idx => {
    const prefix = isMobile ? "S2_" : "S2_";
    return `${basePath}${prefix}${idx.toString().padStart(5, "0")}.webp`;
  };

  // preload only the real frames
  for (let i = startFrame; i <= endFrame; i++) {
    const img = new Image();
    img.src = currentFrame(i);

    img.onload = () => {
      // optional: track loaded count and start your scrollTrigger
    };
    img.onerror = () => {
      console.warn("Failed to load ", img.src);
    };

    images[i - startFrame] = img;
  }

  // your GSAP scrub
  gsap.to(footerScrub, {
    frame: images.length - 1,
    snap: "frame",
    ease: "none",
    scrollTrigger: {
      trigger: ".scrubContainerFooter",
      endTrigger: ".scrubContainerFooterEnd",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
    },
    onUpdate: render
  });

  function render() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const idx = Math.round(footerScrub.frame);
    const img = images[idx];

    // guard against unloaded/broken images
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const imgRatio    = img.width / img.height;
    const canvasRatio = canvas.width / canvas.height;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      drawHeight = canvas.height;
      drawWidth  = imgRatio * drawHeight;
      offsetX    = (canvas.width - drawWidth) / 2;
      offsetY    = 0;
    } else {
      drawWidth  = canvas.width;
      drawHeight = drawWidth / imgRatio;
      offsetX    = 0;
      offsetY    = 0;
    }

    context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    console.log(`Rendering frame: ${startFrame + idx}`);
  }

  window.addEventListener("resize", () => {
    isMobile = window.innerWidth <= 990;
    setCanvasSize();
    render();
  });

    // Grass in
    gsap.from("[grass-in]", {
        scrollTrigger: {
            trigger: ".scrubContainerFooter",
            endTrigger: ".scrubMarkerFooter1",
            start: "top top",
            end: "top top",
            scrub: true,
            //markers: true
        },
        yPercent:100
    });
    

    ScrollTrigger.matchMedia({
        '(min-width: 992px)': function() {
            
            // Add to cart in + out with timeline
            const tlCart = gsap.timeline({
                scrollTrigger: {
                    trigger: ".scrubMarkerFooter1",
                    endTrigger: ".scrubMarkerFooter5",
                    start: "top top",
                    end: "top top",
                    scrub: true,
                    // markers: true,
                    // toggleActions: "play none none reverse",
                },
            });
            tlCart.from('[animate-add-to-cart]', {
                //opacity:0,
                rotate:40,
                xPercent: 120,
                scale: 0.8,
                transformOrigin: 'bottom left',
            }).to('[animate-add-to-cart]', {
                //opacity:0,
                xPercent: 0,
                scale: 1,
                duration:1,
            }).to('[animate-add-to-cart]', {
                opacity:0,
                transformOrigin: 'bottom left',
                yPercent: -100,
                //rotate:-40,
                scale: 0.8,
            });





            // Gummies text in
            const tl = gsap.timeline({
                scrollTrigger: {
                trigger: ".scrubContainerFooter",
                endTrigger: ".scrubMarkerFooter4",
                start: "top top",
                end: "top top",
                scrub: true,
                // markers: true,
                // toggleActions: "play none none reverse",
                },
            });
            tl.from('[animate-gummy-chars] .single-char-inner', {
                opacity: 0,
                //filter: 'blur(10px)',
                stagger: 0.04,
                duration: 0.8,
                transformOrigin: '50% 50%',
            }).to('[animate-gummy-chars] .single-char-inner', {
                opacity: 1,
                stagger: 0.04,
                duration: 2,
            }).to('[animate-gummy-chars] .single-char-inner', {
                opacity: 0,
                //filter: 'blur(10px)',
                stagger: 0.04,
                duration: 0.8,
            });
            

            // Pointer events none on container
            gsap.to("[scrub-footer-holder]", {
                scrollTrigger: {
                trigger: ".scrubMarkerFooter4",
                endTrigger: ".scrubMarkerFooter5",
                start: "top top",
                end: "top top",
                //scrub: true,
                //markers: true,
                onEnter: () => {
                    document.querySelector("[scrub-footer-holder]").classList.add("pe-none");
                },
                onLeaveBack: () => {
                    document.querySelector("[scrub-footer-holder]").classList.remove("pe-none");
                },
                },
            });
            
            // Anim footer out with class
            const elements = document.querySelectorAll("[anim-footer-out]");
            gsap.to(elements, {
                scrollTrigger: {
                    trigger: ".scrubMarkerFooter4",
                    endTrigger: ".scrubMarkerFooter5",
                    start: "top -30%",
                    end: "top top",
                    //scrub: true,
                    //markers: true,
                    onEnter: () => {
                        elements.forEach((el) => el.classList.add("move-out"));
                    },
                    onLeaveBack: () => {
                        elements.forEach((el) => el.classList.remove("move-out"));
                    },
                },
                //opacity: 0,
            });
            
            
            // Move bottle down
            gsap.to('#hero-lightpass-3', {
                scrollTrigger: {
                    trigger: ".scrubMarkerFooter4",
                    endTrigger: ".scrubMarkerFooter5",
                    start: "top top",
                    end: "top top",
                    scrub: true,
                    // markers: true,
                },
                yPercent: 30,
                x: 0,
            });

            
            // Move grass out
            gsap.to('[grass-out]', {
                scrollTrigger: {
                    trigger: ".scrubMarkerFooter4",
                    endTrigger: ".scrubMarkerFooter5",
                    start: "top top",
                    end: "top top",
                    scrub: true,
                    // markers: true,
                },
                yPercent: 100,
            });

            // Stagger footer elements in
            gsap.from('[anim-stagger]', {
                scrollTrigger: {
                    trigger: ".scrubMarkerFooter5",
                    //endTrigger: ".scrubMarkerFooter5",
                    start: "top center",
                    //end: "top top",
                    toggleActions: "play none none reverse",
                    //scrub: true,
                    //markers: true,
                },
                yPercent: 80,
                opacity:0,
                duration:0.6,
                stagger:0.03,
            });
            
            
        }
    });

      

 




}
