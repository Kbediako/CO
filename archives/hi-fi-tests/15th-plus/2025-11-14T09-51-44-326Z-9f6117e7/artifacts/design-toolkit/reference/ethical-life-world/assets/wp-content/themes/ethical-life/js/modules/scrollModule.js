let scroll;

export function initSmoothScroll(container) {
    // Lenis: https://github.com/studio-freight/lenis
    scroll = new Lenis({
        lerp: 0.08,
        duration: 1.3,
    });
    
    function raf(time) {
        scroll.raf(time);
        ScrollTrigger.update(); // Ensures ScrollTrigger syncs properly
        requestAnimationFrame(raf);
    }
    
    requestAnimationFrame(raf);
    gsap.ticker.lagSmoothing(0);
    
    

    // Check Scroll Direction
    const viewportHeight = window.innerHeight;
    const thresholdPercentage = viewportHeight * 0.1;
    
    var lastScrollTop = 0
    var threshold = thresholdPercentage;
    var thresholdTop = thresholdPercentage;

    function startCheckScroll() {
        scroll.on('scroll', (e) => {
            var nowScrollTop = e.targetScroll;
            if (Math.abs(lastScrollTop - nowScrollTop) >= threshold) {
                // Check Scroll Direction
                if (nowScrollTop > lastScrollTop) {
                    $("[data-scrolling-direction]").attr('data-scrolling-direction', 'down');
                } else {
                    $("[data-scrolling-direction]").attr('data-scrolling-direction', 'up');
                }
                lastScrollTop = nowScrollTop;
                // Check if Scroll Started
                if (nowScrollTop > thresholdTop) {
                    $("[data-scrolling-started]").attr('data-scrolling-started', 'true');
                } else {
                    $("[data-scrolling-started]").attr('data-scrolling-started', 'false');
                }
            }
        });
    }
    startCheckScroll();

    // Reset instance
    barba.hooks.after(() => {
        startCheckScroll();
    });
    
    // Reset on leave to down and false
    barba.hooks.beforeLeave(() => {
        $('[data-scrolling-direction]').attr('data-scrolling-direction', 'down');
        $('[data-scrolling-started]').attr('data-scrolling-started', 'false');
    });

    // Scroll to Anchor
    $("[data-anchor-target]").click(function () {
        let targetScrollToAnchorLenis = $(this).attr('data-anchor-target');
        scroll.scrollTo(targetScrollToAnchorLenis, {
            offset: 0,
            duration: 1.47,
            easing: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
        });
    });

}

// Export to use in main.js 
// scrollControl.start(); scrollControl.stop(); scrollControl.destroy();
// Usefull for lightboxes to disable and reanable scroll
export const scrollControl = {
    start: function() {
        //console.log("Scroll started");
        scroll.start();
    },
    stop: function() {
        //console.log("Scroll stopped");
        scroll.stop();
    },
    destroy: function() {
        //console.log("Scroll destroyed");
        scroll.destroy();
    }
};