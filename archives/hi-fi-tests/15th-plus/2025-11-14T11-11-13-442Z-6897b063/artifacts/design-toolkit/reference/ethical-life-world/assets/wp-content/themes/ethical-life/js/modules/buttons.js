export function buttonHovers() {
    // Check if device is touch-enabled
    const isTouchDevice = ('ontouchstart' in window) || 
                         (navigator.maxTouchPoints > 0) ||
                         (navigator.msMaxTouchPoints > 0);
    
    // Exit early if it's a touch device
    if (isTouchDevice) return;
    
    const items = document.querySelectorAll('.btnHandler');
    
    items.forEach(item => {
        wrapLettersInSpan(item.querySelector('.hidden'))
        wrapLettersInSpan(item.querySelector('.visible'))

        // Handle mouseenter for the entire button
        item.addEventListener('mouseenter', (e) => {
            // Remove the hover-off class if it exists
            item.classList.remove('btn-hover-off');
            
            if(gsap.isTweening(item.querySelectorAll('.visible span'))) {
                return; // Prevent animation if already animating
            }
            
            item.classList.add('hovered');
            
            // Get mouse position relative to the button
            const rect = item.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            
            // Get all letter spans
            const visibleSpans = item.querySelectorAll('.visible span');
            const totalWidth = rect.width;
            
            // Calculate which letter index to start from based on mouse position
            const relativePosition = mouseX / totalWidth;
            const startIndex = Math.floor(relativePosition * visibleSpans.length);
            
            // Animate from that position
            gsap.to(visibleSpans, {
                yPercent: 100,
                ease: 'back.out(2)',
                duration: 0.6,
                stagger: {
                    each: 0.023,
                    from: startIndex 
                }
            });
            
            gsap.to(item.querySelectorAll('.hidden span'), {
                yPercent: 100,
                ease: 'back.out(2)',
                duration: 0.6,
                stagger: {
                    each: 0.023,
                    from: startIndex
                },
                onComplete: () => {
                    // Reset items
                    gsap.set(item.querySelectorAll('.visible span'), {clearProps: 'all'})
                    gsap.set(item.querySelectorAll('.hidden span'), {clearProps: 'all'})
                }
            });
        });
        
        // Also track mousemove for more dynamic response (optional)
        item.addEventListener('mousemove', (e) => {
            // Only run this if we're not already animating
            if(gsap.isTweening(item.querySelectorAll('.visible span')) || !item.classList.contains('hovered')) {
                return;
            }
        });
        
        // Handle mouseleave animation
        item.addEventListener('mouseleave', e => {
            item.classList.remove('hovered');
            
            // Only add the hover-off class if it's not already there
            if (!item.classList.contains('btn-hover-off')) {
                item.classList.add('btn-hover-off');
                
                // Remove the class after the animation completes (300ms)
                setTimeout(() => {
                    item.classList.remove('btn-hover-off');
                }, 300); // Match this to your animation duration
            }
        });
    });

    // UTIL METHODS
    function wrapLettersInSpan(element) {
        if (!element) return;
        const text = element.textContent;
        element.innerHTML = text
            .split('')
            .map(char => char === ' ' ? '<span>&nbsp;</span>' : `<span class="letter">${char}</span>`)
            .join('');
    }
}
