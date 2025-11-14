export default function scrub() {

    //let isMobile = window.innerWidth <= 990;
    const vh = window.innerHeight;
    const canvas = document.getElementById('hero-lightpass');
    
    function setCanvasSize() {
        const dpr = window.devicePixelRatio || 1;
        
        // Get window dimensions but enforce minimum width
        let canvasWidth = Math.max(window.innerWidth, 1200); // Minimum width of 900px
        let canvasHeight = window.innerHeight;
        
        // Set internal canvas dimensions (accounting for DPR for sharpness)
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        
        // Set display size via CSS
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;
        
        // Scale the context to account for the DPR
        const context = canvas.getContext('2d');
        context.scale(dpr, dpr);
    }
    
    
    setCanvasSize();



    const images = [];
    //const frameCount = 299; // footer
    const frameCount = 420;
    //const airpods = { frame: 1 }; // Footer
    const airpods = { frame: 160 };

    const basePath = canvas.getAttribute('img-path');
    
    const currentFrame = (index) => {
        //const imagePath = isMobile ? 'Ethnical_S2_' : 'Ethnical_S2_'; // footer
        const imagePath = 'S1_';
        return `${basePath}${imagePath}${index.toString().padStart(5, '0')}.webp`;
    };
    
    for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        images.push(img);
    }
    
    gsap.to(airpods, {
        frame: frameCount - 1,
        snap: "frame",
        ease: "none",
        scrollTrigger: {
            trigger: ".scrubContainer",
            endTrigger: '.scrubMarker1',
            start: "top top",
            end: 'top top',
            scrub: true,
            //markers: true
        },
        onUpdate: render,
    });
    
    images[0].onload = () => {
        setTimeout(render, 0);

        gsap.to('.brindScrubIn', {
            opacity: 1,
            duration: 1,
            delay:0.4,
            ease: "none"
        });
        gsap.from('.brindScrubIn canvas', {
            scale: 1.1,
            duration: 1.5,
            delay:0.4,
            ease: "expo.inOut",
        });
    };
    
    function render() {
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.getElementById('hero-lightpass');
        const context = canvas.getContext('2d');
        
        // Clear using the CSS dimensions
        context.clearRect(0, 0, canvas.width/dpr, canvas.height/dpr);
      
        let img = images[Math.round(airpods.frame)];
        
        let imgRatio = img.width / img.height;
        let canvasRatio = (canvas.width/dpr) / (canvas.height/dpr);
      
        let drawWidth, drawHeight, offsetX, offsetY;
      
        if (canvasRatio > imgRatio) {
            // Canvas is wider than the image (relative to their heights)
            drawHeight = canvas.height/dpr;
            drawWidth = drawHeight * imgRatio;
            offsetX = ((canvas.width/dpr) - drawWidth) / 2; // Center horizontally
            offsetY = 0; // Top aligned
        } else {
            // Canvas is taller than the image (relative to their widths)
            drawWidth = canvas.width/dpr;
            drawHeight = drawWidth / imgRatio;
            offsetX = ((canvas.width/dpr) - drawWidth) / 2; // Center horizontally here too
            offsetY = 0; // Top aligned - this is the change from your original code
        }
        
        context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }
    
      
      
    
    window.addEventListener("resize", () => {
        setCanvasSize();
        render();
    });

    render();


    // Start ethical live moving up
    var tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scrubContainer",
            start: "top top",
            end: vh + "top",
            scrub: true,
            //markers: true
        }
    });
    tl.to(".pathAnim1 path", {
        duration: 0.6,
        opacity: 0,
        yPercent: -200,
        ease: "power1.out"
    }, 0);
    tl.to(".pathAnim2 path", {
        duration: 0.6,
        opacity: 0,
        yPercent: -200,
        ease: "power1.out"
    }, 0.07);
    tl.to(".pathAnim3 path", {
        duration: 0.6,
        opacity: 0,
        yPercent: -200,
        ease: "power1.out"
    }, 0.14);
    tl.to(".pathAnim4 path", {
        duration: 0.6,
        opacity: 0,
        yPercent: -200,
        ease: "power1.out"
    }, 0.21);
    tl.to(".pathAnim5 path", {
        duration: 0.6,
        opacity: 0,
        yPercent: -200,
        ease: "power1.out"
    }, 0.28);

    // Gummies out
    var tl2 = gsap.timeline({
        scrollTrigger: {
            trigger: ".scrubContainer",
            endTrigger: '.scrubMarker1',
            start: "top top",
            end: "top top",
            scrub: true,
            //markers: true
        }
    });
    // tl2.to("[stagger-item] img", {
    //     duration: 0.6,
    //     opacity: 0,
    //     yPercent: -200,
    //     scale: 0,
    //     stagger: {
    //         amount: 0.5, 
    //         //from: 'random'
    //     },
    //     ease: "power1.out"
    // }, 0);

    // Green bg reveals
    gsap.to("[reveal-bg]", {
        scrollTrigger: {
            trigger: ".scrubMarker1",
            endTrigger: '.scrubMarker2',
            start: "top top",
            end: "top top",
            scrub: true,
            //markers: true
        },
        opacity: 1
    });

    // Text goes out
    gsap.to("[text-ph-out]", {
        scrollTrigger: {
            trigger: ".scrubMarker1",
            start: "top 80%",
            end: "top top",
            //scrub: true,
            toggleActions: "play none none reverse",
            //markers: true
        },
        opacity: 0,
        scale:0.5,
        //filter: 'blur(10px)',
        duration: 0.4,
        ease: "power2.inOut"
    });


    // Toggle class on scroll to dim the bottle
    ScrollTrigger.create({
        trigger: ".scrubMarker2",
        start: "bottom bottom",
        onEnter: () => {
            document.querySelector(".fade-outer").classList.add("active");
        },
        onLeaveBack: () => {
            document.querySelector(".fade-outer").classList.remove("active");
        },
        //markers: true
    });


    // Chars in after the bottle dims
    if ($('[scrub-chars]').length) {
        $('[scrub-chars]').each(function () {
            let element = $(this).find('.single-char-inner');
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: '.scrubMarker2',
                    endTrigger: '.scrubMarker3',
                    start: 'bottom bottom',
                    end: 'bottom 50%',
                    scrub: 1,
                    //markers:true,
                }
            });
            tl.fromTo(element, 
                { 
                    opacity: 0,
                    rotate: 0.001,
                    //filter: 'blur(10px)',
                }, 
                { 
                    opacity: 1,
                    //filter: 'blur(0px)',
                    stagger: 0.06,
                    duration: 1,
                    ease: "none", 
                }
            )
            .from('.image-revealer', 
                { 
                    duration: 2,
                    width: 0,
                    ease: "none" 
                }
            )
            .to(element, 
            { 
                opacity: 1,  // Keeps the opacity at 1
                duration: 2, // Adds a pause period
                delay: 2,    // Delay the fade-out for 2 seconds (adjust this duration)
                ease: "none"
            })
            .to('[scrub-chars]', 
                { 
                    duration: 2,
                    opacity: 0,
                    scale:0.5,
                    ease: "none" 
            })
            .to('.scrubHero', 
                { 
                    duration: 2,
                    opacity: 0,
                    scale:0.8,
                    rotate:-20,
                    ease: "none" 
            }, '<')
            
            
        });
    }



    // Remove the solid green BG
    gsap.to("[remove-bg]", {
        scrollTrigger: {
            trigger: ".scrubMarker3",
            start: "top center",
            end: "top top",
            scrub: true,
            //markers: true
        },
        opacity: 0,
        ease: "none"
    });

    // Bring in the massive text
    gsap.from("[animat-in-d1]", {
        scrollTrigger: {
            trigger: ".scrubMarker3",
            start: "top center",
            end: "top -50%",
            scrub: true,
            //markers: true
        },
        opacity: 0,
        scale:5,
        ease: "none"
    });
    
    
    gsap.to("[animat-out-d1]", {
        scrollTrigger: {
            trigger: ".testimonialCardsTrigger",
            start: "30% top",
            end: "50% top",
            scrub: true,
            //markers: true
        },
        opacity: 0,
        ease: "none"
    });

    // Top part of heading rotating in
    gsap.from("[anim-top-heading]", {
        scrollTrigger: {
            trigger: ".scrubMarker3",
            start: "top top",
            end: "top -100%",
            scrub: true,
            //markers: true
        },
        opacity: 0,
        yPercent: -50,
        rotateX:70,
        transformOrigin: "bottom",
        ease: "none"
    });

    // Bottom part of heading rotating in
    gsap.from("[anim-bottom-heading]", {
        scrollTrigger: {
            trigger: ".scrubMarker3",
            start: "top top",
            end: "top -100%",
            scrub: true,
            //markers: true
        },
        opacity: 0,
        yPercent: 50,
        rotateX:-70,
        transformOrigin: "top",
        ease: "none"
    });


}
