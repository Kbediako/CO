import { scrollControl } from './scrollModule.js';

// Custom eases here 
// https://gsap.com/docs/v3/Eases/
CustomEase.create("elastic", ".2, 1.33, .25 ,1");

// Transition ease vars for text animations
let transitionEase = "power1.out"; // Fade transition ease

// This gives a delay on the enter animations first time the page loads
// IMPORTANT: Change below to 0.2 when testing so you dont have to wait for the animations while deving.
const DEFAULT_FIRST_LOAD_DELAY = 0.2;

// Flag to track first load
let isFirstLoad = true;
let firstLoadDelay = DEFAULT_FIRST_LOAD_DELAY;

// This is the enter page transtion first load
window.scrollTo(0, 0);

export function initLoader() {
    scrollControl.stop();

    $('.loader, [loader-overlay]').addClass('active');


    if (document.querySelector('[data-barba-namespace="home"]')) {
        
        $('body').addClass('doc-loaded');
        // Check if this is truly the first visit (your existing function)
        function isFirstVisit() {
            if (sessionStorage.getItem('loaderShown')) {
                return false;
            }
            
            const referrer = document.referrer;
            const currentDomain = window.location.hostname;
            
            if (referrer && referrer.includes(currentDomain)) {
                return false;
            }
            
            if (performance.navigation && performance.navigation.type === 1) {
                return false;
            }
            
            if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
                return false;
            }
            
            return true;
        }
        
        // Handle overlay and nav classes based on visit type
        const overlay = document.querySelector('[loader-overlay]');
        const navContainer = document.querySelector('.nav-container');
        
        if (!isFirstVisit()) {
            // Remove loader from DOM if it exists
            $('.loader').remove();
            $('.remove-second-visit').remove();

            
            // SUBSEQUENT VISITS:
            // Keep d-none on overlay (it stays hidden)
            // Remove nav-home from nav container
            if (navContainer && navContainer.classList.contains('nav-home')) {
                navContainer.classList.remove('nav-home');
            }
            
            // Show nav immediately and trigger page transition
            gsap.set('.nav', { opacity: 1 });
            pageTransitionEnter();
            
           

            
            return; // Exit early
        }
        
        // FIRST VISIT:
        // Remove d-none from overlay (so it shows)
        if (overlay && overlay.classList.contains('d-none')) {
            overlay.classList.remove('d-none');
        }
        
        // Keep nav-home class (it's already there from PHP)
        // No action needed for nav-container
        
        // Mark that loader has been shown
        sessionStorage.setItem('loaderShown', 'true');
        console.log('✅ First visit detected - showing loader and keeping nav-home');
        
        // Total number of images to load
        const allFrameCount = 470;
        
        // Get bottle canvas animation setup ready
        const canvas = document.getElementById("hero-lightpass-2");
        const context = canvas.getContext("2d");
        //let isMobile = window.innerWidth <= 990;
    
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
    
        const frameCount = 161;
        const images = [];
        const airpods = { frame: 0 };
    
        const basePath = canvas.getAttribute('img-path');
    
        const currentFrame = (index) => {
            //const imagePath = isMobile ? 'ethical_linear_croped' : 'ethical_linear_croped';
            const imagePath = 'S1_';
            return `${basePath}${imagePath}${index.toString().padStart(5, '0')}.webp`;
        };
        
        for (let i = 0; i < frameCount; i++) {
            const img = new Image();
            img.src = currentFrame(i);
            images.push(img);
        }
        window.addEventListener("resize", () => {
            //isMobile = window.innerWidth <= 990;
            setCanvasSize();
            render();
        });
    
        function render() {
            const dpr = window.devicePixelRatio || 1;
            const canvas = document.getElementById('hero-lightpass-2');
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
        
    
        
        images[0].onload = () => {
            setTimeout(render, 500);
        };
    
        // Animate logo and loader first
        gsap.from(".logo-outer", {
            duration: 1,
            width: '0',
            ease: 'power2.inOut',
        });
        gsap.from(".logo-text path", {
            duration: 0.6,
            opacity: 0,
            stagger: 0.05,
            ease: 'power1.inOut',
            onComplete: () => {
                $(".logo-outer").addClass("logo-animation-complete");
            }
        });
    
        gsap.from(".loading, .counter", {
            duration: 1,
            opacity: 0,
            delay: 0.4,
            stagger: 0.05,
            ease: 'power1.inOut',
        });
    
        // Simple loader state
        const loaderState = {
            imagesLoaded: 0,
            animationTriggered: false,
            loadingComplete: false,
            lastPercent: 0 // Variable to store the last progress percent
        };
    
        // Initialize counter at 0
        updateCounterDisplay(0);
    
        // Start image loading process
        setTimeout(() => {
            console.log('Starting image preload process for all ' + allFrameCount + ' frames');
            
            // Create an array to track all images
            const allImages = [];
            let loadedCount = 0;
            
            // Preload all 525 images and track progress
            for (let i = 0; i < allFrameCount; i++) {
                const img = new Image();
                img.src = currentFrame(i);
                
                // Track load events
                img.onload = img.onerror = (event) => {
                    loadedCount++;
                    
                    // Calculate percentage based on actual loaded images
                    const percent = Math.floor((loadedCount / allFrameCount) * 100);
                    
                    // Log every 5% or so
                    if (percent % 5 === 0 && percent !== loaderState.lastPercent) {
                        //console.log(`Loading progress: ${loadedCount}/${allFrameCount} (${percent}%)`);
                        loaderState.lastPercent = percent;
                    }
                    
                    // Log errors
                    if (event.type === 'error') {
                        console.log('Image failed to load:', img.src);
                    }
                    
                    // Update the counter display
                    updateCounterDisplay(percent);
                    
                    // When all images are loaded
                    if (loadedCount >= allFrameCount) {
                        console.log('✅ All ' + allFrameCount + ' frames loaded successfully');
                        loaderState.loadingComplete = true;
                        // Initialize final transition once everything is loaded
                        loaderInit();
                    }
                };
                
                allImages.push(img);
            }
            
            // Also monitor any other images in the page content
            $('#imagesLoaded').imagesLoaded()
                .always(function(instance) {
                    //console.log('Content images loaded.');
                })
                .done(function(instance) {
                    //console.log('All content images successfully loaded.');
                })
                .fail(function(instance) {
                    console.log('At least one content image failed to load.');
                })
                .progress(function(instance, image) {
                    let total = instance.images.length;
                    let loaded = instance.progressedCount;
                    
                    // Log more details for debugging
                    //console.log('Content image loaded:', image.img.src);
                    //console.log('Content loaded:', loaded, 'Total:', total);
                    if (!image.isLoaded) {
                        console.log('Content image failed to load:', image.img.src);
                    }
                });
                
        }, 500);
    
        // Function to update the counter display
        function updateCounterDisplay(percent) {
            percent = Math.floor(Math.max(0, Math.min(100, percent)));
            
            // Format counter with individual spans for animation
            let formattedPercentWithSpans = percent.toString()
                .padStart(2, '0')
                .split('')
                .map(char => `<span>${char}</span>`)
                .join('');
            
            $('.counter').html(formattedPercentWithSpans);
            document.body.style.setProperty('--loader-counter', `${percent}`);
            
            //console.log('Counter updated:', percent);
            
            // Trigger SVG animation at 40%
            if (percent >= 70 && !loaderState.animationTriggered) {
                loaderState.animationTriggered = true;
                //console.log('Triggering SVG animation at 40%');
                
                gsap.to("[loader-svg-out] img", {
                    duration: 1.5,
                    filter: 'blur(0px)',
                    opacity: 1,
                    stagger: 1,
                    ease: 'power1.out',
                });

                gsap.to("[loader-bottle-outer]", {
                    opacity: 1,
                    duration: 1,
                    ease: 'power1.out'
                });
            }
            
            // Update counter width - use a fresh tween for each update
            gsap.to(".counter-width", {
                width: `${percent * 0.4}vw`, 
                duration: 0.3,
                ease: "power1.out"
            });
        }
    
        // Final animation sequence
        function loaderInit() {
            console.log('✔ Starting loaderInit animation sequence');
            
            function startAnimation() {
                gsap.to(airpods, {
                    frame: frameCount - 1,
                    duration: 1,
                    ease: "power2.inOut",
                    repeat: 0,
                    onUpdate: () => {
                        airpods.frame = Math.min(frameCount - 1, Math.max(0, airpods.frame));
                        render();
                    },
                });
            }
            
            // Start a timeline
            var tl = gsap.timeline();
    
            // First functions to run
            tl.call(function() {
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 300);
                scrollControl.stop();
            });
    
            // Change cursor to wait from the get go. We will remove after the animation
            tl.set("html", {
                cursor: "wait"
            });
    
            /** START CANVAS SCRUB **/
            tl.call(function() {
                console.log('Starting bottle animation');
                startAnimation();
            }, null, 1.6);
    
            tl.to("[loader-bottle]", {
                duration: 2.5,
                scale: 1,
                ease: 'power3.inOut'
            }, 1);
    
            tl.from("[loader-bottle-outer]", {
                //xPercent: -6,
                rotate: 10,
                duration: 1,
                ease: "expo.inOut",
            }, 1.5);
    
            tl.to("[loader-bottle-outer-secondary]", {
                opacity: 0,
                filter: 'blur(20px)',
                scale: 3,
                duration: 1,
                ease: 'power4.out'
            }, 2.4);
    
    
            // Spinning text
            tl.to("[loader-svg-out]", {
                scale: 3,
                opacity: 0,
                duration: 2,
                rotate: 100,
                filter: 'blur(30px)',
                ease: 'expo.inOut'
            }, 1);
    
            tl.to("[counter-out]", {
                scale: 2,
                filter: 'blur(30px)',
                opacity: 0,
                duration: 2,
                ease: 'expo.inOut'
            }, 1);
    
    
    
    
            tl.to("[loader-bg]", {
                opacity: 0,
                duration: 2,
                ease: 'power1.out'
            }, 1.6);
    
    
            tl.to(".nav", {
                opacity: 1,
                ease: 'power3.inOut'
            }, 3);
                
            /** END OF INNER ANIMATION ELEMENTS **/
    
            // This is the end of the loader animation
            const transitionOffset = 3.1;
            tl.to(".loader", {
                opacity: 0,
                duration: 0,
                ease: 'power1.out',
            }, transitionOffset);
    
            // This is the end of the loader animation and changes the cursor to normal
            tl.set("html", {
                cursor: "auto",
            }, transitionOffset);
    
            // And this brings in the first page transition
            tl.call(function() {
                console.log('Loader complete, starting page transition');
                pageTransitionEnter();
                $('.loader').remove();
            }, null, transitionOffset);
        }
    }

    if (!document.querySelector('[data-barba-namespace="home"]')) {

            $('body').addClass('doc-loaded');
            
            var tl = gsap.timeline();

            tl.to("[loader-bg]", {
                opacity: 0,
                duration: 0,
                ease: 'power1.out'
            }, 0);
                    
            /** END OF INNER ANIMATION ELEMENTS **/
            tl.to(".loader", {
                opacity: 0,
                duration: 0.6,
                ease: 'power1.out',
            }, 0.6);
    
            // This is the end of the loader animation and changes the cursor to normal
            tl.set("html", {
                cursor: "auto",
            }, 0.6);
    
            // And this brings in the first page transition
            tl.call(function() {
                console.log('Loader complete, starting page transition');
                pageTransitionEnter();
                //$('.loader').remove();
            }, null, 0.6);
    }
}

// This is the enter page transition - also enter after first loader
export function pageTransitionEnter(data) {
    $('main').addClass('pageTransitionEnter');

    
    // Change bodu color wthis this attribute data-bg="rgb(0, 50, 50)" in main element.
    let bgColor = document.querySelector('main').getAttribute('data-bg');
    document.body.style.backgroundColor = bgColor;
    
    // Start timeline for below animations
    var tl = gsap.timeline();

    // Reason for this lenis stop is to bring in the page animations first
    tl.call(function() {
        scrollControl.stop();
    });
    
    //Etical life paths
    tl.from(".pathAnim1", {
        duration: 0.6,
        opacity: 0,
        yPercent: 100,
        ease: "back.out(1.3)",
        delay: 0.5
    }, 0);
    tl.from(".pathAnim2", {
        duration: 0.6,
        opacity: 0,
        yPercent: 100,
        ease: "back.out(1.3)",
        delay: 0.5
    }, 0.07);
    tl.from(".pathAnim3", {
        duration: 0.6,
        opacity: 0,
        yPercent: 100,
        ease: "back.out(1.3)",
        delay: 0.5
    }, 0.14);
    tl.from(".pathAnim4", {
        duration: 0.6,
        opacity: 0,
        yPercent: 100,
        ease: "back.out(1.3)",
        delay: 0.5
    }, 0.21);
    tl.from(".pathAnim5", {
        duration: 0.6,
        opacity: 0,
        yPercent: 100,
        ease: "back.out(1.3)",
        delay: 0.5
    }, 0.28);


    // Chars
    if ($('[transition-chars]').length) {
        if(document.querySelector('[transition-chars]')) {
            tl.set("[transition-chars] .single-char-inner", { 
                opacity: 0,
                rotate: 0.001,
                scale: 1.2,
                filter: 'blur(20px)',
            }, 0);
        }
        $('[transition-chars]').each(function () {
            let delay = parseFloat($(this).attr('transition-chars')) || 0.4;
            let element = $(this).find('.single-char-inner');
            tl.to(element, { 
                opacity: 1,
                filter: 'blur(0px)',
                scale: 1,
                stagger: 0.04,
                duration: 0.8,
                ease: transitionEase,
            }, delay + firstLoadDelay);
        });
    }
    

    // Words
    if ($('[transition-words]').length) {
        if(document.querySelector('[transition-words]')) {
            tl.set("[transition-words] .single-word-inner", { 
            yPercent: 120,
            rotate: 6,
            }, 0);
        }
        $('[transition-words]').each(function () {
            let delay = parseFloat($(this).attr('transition-words')) || 0;
            let element = $(this).find('.single-word-inner');
            tl.to(element, { 
                yPercent: 0,
                rotate: 0.001,
                stagger: 0.05,
                duration: 1,
                ease: transitionEase,
            }, delay + firstLoadDelay);
        });
    }
    
    
  
    // Fade
    if ($('[transition-fade]').length) {
        $('[transition-fade]').each(function () {
            let delay = parseFloat($(this).attr('transition-fade')) || 0.4;
            let element = $(this);

            tl.from(element, {
                opacity: 0,
                duration: 0.6,
                ease: transitionEase,
            }, delay + firstLoadDelay);
        });
    }
    
    // Fade out
    if ($('[transition-fade-out]').length) {
        $('[transition-fade-out]').each(function () {
            let delay = parseFloat($(this).attr('transition-fade-out')) || 0.4;
            let element = $(this);

            tl.to(element, {
                opacity: 0,
                duration: 0.6,
                ease: transitionEase,
            }, delay + firstLoadDelay);
        });
    }
    
    // Fade blur
    if ($('[transition-fade-blur]').length) {
        $('[transition-fade-blur]').each(function () {
            let delay = parseFloat($(this).attr('transition-fade-blur')) || 0;
            let element = $(this);

            tl.from(element, {
                opacity: 0,
                filter: 'blur(20px)',
                duration: 0.4,
                ease: transitionEase,
            }, delay + firstLoadDelay);
        });
    }


    if ($('[transition-fade-gummies]').length) {
        // Get all elements at once instead of looping through them individually
        let elements = $('[transition-fade-gummies]');
        
        tl.from(elements, {
            opacity: 0,
            scale: 3,
            filter: 'blur(20px)',
            duration: 0.8,
            delay:0,
            ease: "power3.inOut",
            stagger: {
                amount: 0.5, 
                from: 'random'
            },
        }, 0);
    }
    
    // Fade blur stagger
    if ($('[transition-fade-blur-stagger]').length) {
        $('[transition-fade-blur-stagger]').each(function () {
            let delay = parseFloat($(this).attr('transition-fade')) || 0;
            let element = $(this).find('[stagger-item]');
            tl.from(element, {
                opacity: 0,
                stagger: {
                    amount: 0.5, 
                    from: 'random'
                },
                filter: 'blur(20px)',
                duration: 0.4,
                scale:0,
                ease: transitionEase,
            }, delay + firstLoadDelay);
        });
    }


    tl.call(function() {
        // Now enable lenis again
        console.log('Page transition complete, enabling scroll');
        scrollControl.start();
        ScrollTrigger.refresh();
        $('body').removeClass('first-load');
   

    }, null, "0.4");

    // Change firstLoadDelay after the first load
    firstLoadDelay = isFirstLoad ? 0 : DEFAULT_FIRST_LOAD_DELAY;
    
}

// This is the leave page transition
export function pageTransitionLeave(data) {

    $('main').removeClass('pageTransitionEnter');
    $('main').addClass('pageTransitionLeave');

    scrollControl.stop();
        
    // Start timeline for below animations
    var tl = gsap.timeline();
    tl.to(".content", {
        duration: 0.6,
        filter: 'blur(80px)',
        scaleX: 1.5,
        opacity: 0,
        ease: 'expo.inOut',
        delay: 0
    }, 0);
}
