export function nav(event) {

    gsap.to("body", {
        scrollTrigger: {
        trigger: "main",
            start: "top+=100 top",
            end: 'bottom top-=99999999',
            //markers:{ endColor: "pink",},
            toggleClass: {
                targets: '.nav-holder',
                className: 'nav-moved',
            },
        }
    });

    gsap.to("body", {
        scrollTrigger: {
        trigger: "main",
            //start: () => "+=" + document.querySelector(".header-home-content").offsetHeight*0.9,
            //start: () => "+=" + document.querySelector(".nav-holder").offsetHeight*4,
            start: "top+=10 top",
            end: 'bottom top-=99999999',
            //markers:{ endColor: "pink",},
            toggleClass: {
                targets: '.nav-holder',
                className: 'nav-moved-background',
            },
        }
    });

    
    /* Hide Header Nav on on scroll down */
    ScrollTrigger.create({
        start: "top top",
        end: "max",
        onUpdate: (self) => {
            if (self.direction === -1) {
                // Scroll Up
                $('.nav-holder, .nav-overlay').removeClass('nav-scroll-down').addClass('nav-scroll-up');
            } else {
                // Scroll Down
                $('.nav-holder, .nav-overlay').addClass('nav-scroll-down').removeClass('nav-scroll-up');
            }
        }
    });
    /* END Hide Header Nav on on scroll down */


    // Function to update indicator position based on a target element
    function updateIndicator($target) {
        const $indicator = $target.closest('.nav').find('.my-indicator');
        const pos = $target.position();
        const width = $target.outerWidth();
        //const height = $target.outerHeight();

        $indicator.css({
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            transform: 'scale(1)', // show indicator
            width: `${width}px`,
            position: 'absolute', // ensure indicator is positioned absolutely
        });
    }
  
    // Attach event listeners to each <li>
    $('.nav li').on('mouseenter', function () {
        updateIndicator($(this));
    });

    // Optional: Reset indicator on mouse leave
    $('.nav').on('mouseleave', function () {
        // You can reset to the selected item or hide the indicator
        const $selectedItem = $(this).find('li.is-selected');
        if ($selectedItem.length) {
            updateIndicator($selectedItem);
        } else {
            // Hide indicator if no selected item
            $(this).find('.my-indicator').css({
                transform: 'scale(0)',
            });
        }
    });


    
}
