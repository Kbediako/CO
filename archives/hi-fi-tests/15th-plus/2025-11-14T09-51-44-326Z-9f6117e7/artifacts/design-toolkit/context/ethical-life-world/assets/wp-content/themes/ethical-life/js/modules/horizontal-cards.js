export default function horizontalCards() {

    gsap.fromTo('[testimonial-in]', {
        rotation: 30 // Starting angle
    },{
        rotation: -30, // Ending angle
        ease:'power1.inOut', // Non-linear movement
        stagger:0.09, // Delay between the start of each circle
        scrollTrigger:{
            trigger: '.testimonialCardsTrigger', // Listening to pinHeight
            start:'top top',
            end: 'bottom bottom',
            scrub: true, // Animation progresses with scrolling
           // markers:true
            
        }  
    })
    



    const hashtagCharsTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: ".scrubMarkerhash",
            start: "0% top",
            end: "50% top",
            scrub: true,
            //markers: true,
            //toggleActions: "play none none reverse",
        }
    });
    hashtagCharsTimeline.from(
        '[animate-hashtag-chars] .single-char-inner',
        {
            opacity: 0,
            //filter: 'blur(10px)',
            stagger: 0.04,
            duration: 0.8,
            //scale: 1.5,
            //tranformOrigin: 'center center',
        }
    )
    .to(
        '[animate-hashtag-chars]',
        {
            opacity: 0,
            //filter: 'blur(10px)',
            scale: 0.8,
            duration: 0.8
        }
    );
    
    gsap.from("[animate-imagescroller-bg]", {
        scrollTrigger: {
            trigger: ".scrubMarkerhash",
            start: "30% top",
            end: "80% top",
            scrub: true,
            //markers: true,
            //toggleActions: "play none none reverse",
        },
        opacity: 0,
        scale: 1.2,
        duration: 0.8,
        ease: "none",
    });

    
    gsap.from("[animate-heading]", {
        scrollTrigger: {
            trigger: ".scrubMarkerhash",
            start: "40% top",
            end: "80% top",
            scrub: true,
            //markers: true,
            //toggleActions: "play none none reverse",
        },
        yPercent: -5,
        rotateX: -100,
        transformOrigin: 'top center',
        // scale: 1.2,
        stagger: 0.4,
        // opacity: 0,
        // filter: 'blur(15px)',
        //scale: 1.2,
        duration: 0.8,
        ease: "none",
    });

    // let viewportHeight = window.innerHeight;
    // gsap.to(".gummy-grid", {
    //     scrollTrigger: {
    //         trigger: ".gummy-grid",
    //         endTrigger: '.scrubMarker1',
    //         start: "top top",
    //         end: "top -100%",
    //         scrub: true,
    //         markers: true,
    //     },
    //     y: viewportHeight * 0.4, // Use a percentage of the viewport height (e.g., 10%)
    //     transformOrigin: 'top center',
    //     duration: 0.8,
    //     ease: "none",
    // });


      

    
}
