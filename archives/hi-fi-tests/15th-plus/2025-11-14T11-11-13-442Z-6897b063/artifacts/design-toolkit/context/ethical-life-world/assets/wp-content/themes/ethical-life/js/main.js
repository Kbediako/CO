import { lazyload } from './modules/lazyload.js';
import { onPageJs } from './modules/onPageJs.js?v=37';
import { initLoader, pageTransitionLeave, pageTransitionEnter } from './modules/pageTransitionModule.js?v=37';
import { initSmoothScroll, scrollControl } from './modules/scrollModule.js';
import { nav } from './modules/nav.js';
import { buttonHovers } from './modules/buttons.js';

// Register gsap plugins
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, Flip, Observer);


// Add "doc-loaded" class when everything is loaded

// Global variables
let transitionOffset = 600;

CustomEase.create("ease-in-css", ".25, 1, 0.1 ,1");

// GSAP Custom Eases


function delay(n) {
    n = n || 2000;
    return new Promise((done) => {
        setTimeout(() => {
            done();
        }, n);
    });
}

function initCheckWindowHeight() {
    // https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh-in-px', `${vh}px`);
}

function initSplitText() {
     // Select all elements that need to be split into lines
     let splitTextLines = document.querySelectorAll('[text-split-lines]');
     splitTextLines.forEach((element) => {
         let splitInstance = new SplitText(element, { type: "lines", linesClass: "single-line-inner" });
 
         splitInstance.lines.forEach((line) => {
             let wrapper = document.createElement("div");
             wrapper.classList.add("single-line");
             line.parentNode.insertBefore(wrapper, line);
             wrapper.appendChild(line);
         });
    });

    var splitTextWords = new SplitText("[text-split-words]",{
        type: "words",
        wordsClass: "single-word"
    });
    $('[text-split-words] .single-word').wrapInner('<div class="single-word-inner">');

    var splitTextChars = new SplitText("[text-split-chars]",{
        type: "words, chars",
        wordsClass: "single-word",
        charsClass: "single-char"
    });
    $('[text-split-chars] .single-char').wrapInner('<div class="single-char-inner">');

    
    gsap.utils.toArray('[data-move-x]').forEach((el) => {
        const moveX = el.getAttribute('data-move-x') || 0;
        const moveY = el.getAttribute('data-move-y') || 0;
        const rotate = el.getAttribute('data-rotate') || 0;
      
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom -30%",
                scrub: true,
                ease: "none",
                //markers: true,
            },
            x: moveX,
            y: moveY,
            rotation: rotate,
        });
    });
      
      
}

function navToggle() {
    $('.menu-opener, .nav-overlay').click(function(){
        $('nav').toggleClass('menu-opened');
        $('body').toggleClass('body-menu-opened');
        // Toggle this data attribute data-lenis-prevent on .nav-primary
        $('.nav-primary').each(function() {
            if ($(this).attr('data-lenis-prevent')) {
                $(this).removeAttr('data-lenis-prevent');
            } else {
                $(this).attr('data-lenis-prevent', '');
            }
        });
    });

    $(".nav-primary > li.menu-item-has-children > a").click(function(e) {
        $(this).toggleClass('open');
        $(this).parent().toggleClass("open");
    })

    $(".nav-primary > li.menu-item-has-children > a, .no-link > a").click(function(e) {
        e.preventDefault();
        e.stopPropagation();
    })

    $('.no-touchevents .nav-primary .menu-item-has-children').mouseover(function() {
        $(this).addClass('menu-hovered');
        //$(this).siblings().addClass('pe-none');
        $('body').addClass('menu-open');
        $('body').addClass('nav-invert-hover');
    });
    $('.no-touchevents .nav-primary .menu-item-has-children').mouseleave(function() {
        $(this).removeClass('menu-hovered');
        $('body').removeClass('menu-open');
        $('body').removeClass('nav-invert-hover');

        setTimeout(() => {
            //$(this).siblings().removeClass('pe-none');
        }, 50);
    });

    $('.touchevents .nav-primary .menu-item-has-children').mouseover(function() {
        $(this).addClass('menu-hovered');
        $('body').addClass('menu-open');
        $('body').addClass('nav-invert-hover');
    });
    $('.touchevents .nav-primary .menu-item-has-children').mouseleave(function() {
        $(this).removeClass('menu-hovered');
        $('body').removeClass('menu-open');
        $('body').removeClass('nav-invert-hover');
    });
    
    // Language switcher
        /* Open Login */
    $('.no-touchevents .nav-lang').mouseover(function() {
        $(this).addClass('login-hovered');
    });
    /* Close Login */
    $('.no-touchevents .nav-lang').mouseleave(function() {
        $(this).removeClass('login-hovered');
    });


    $('.touchevents .nav-lang').bind('click', function() {
        $(this).toggleClass('login-hovered');
    });
    /* Close Login */
    $('.touchevents .nav-lang').mouseleave(function() {
        $(this).removeClass('login-hovered');
    });
}
navToggle();

function initScrollTriggerParallaxScroll() {
    // ScrollTrigger.matchMedia({
    //    "(min-width: 1025px)": function() {
 
          if(document.querySelector('[data-parallax-container]')) {
             $('[data-parallax-container]').each(function () {
                
                let tl;
                let triggerElement = $(this);
                let targetElement = $(this).find('[data-parallax-target]');
                let startValue = $(this).attr('data-parallax-start') || "0% 100%";
                let endValue = $(this).attr('data-parallax-end') || "100% 0%";


                
                tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: triggerElement,
                        start: startValue,
                        end: endValue,
                        scrub: true,
                        //markers: true
                    }
                });
                tl.set(targetElement, {
                   rotate: 0.001,
                   force3D: true
                });
                tl.fromTo(targetElement, {
                   yPercent: -10,
                }, {
                   yPercent: 10,
                   ease: "none",
                });
             });
          }
          if(document.querySelector('[data-parallax-container-2]')) {
             $('[data-parallax-container-2]').each(function () {
                
                let tl;
                let triggerElement = $(this);
                let targetElement = $(this).find('[data-parallax-target-2]');
                let startValue = $(this).attr('data-parallax-start') || "0% 100%";
                let endValue = $(this).attr('data-parallax-end') || "100% 0%";


                
                tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: triggerElement,
                        start: startValue,
                        end: endValue,
                        scrub: true,
                        //markers: true
                    }
                });
                tl.set(targetElement, {
                   rotate: 0.001,
                   force3D: true
                });
                tl.fromTo(targetElement, {
                   yPercent: 40,
                }, {
                   yPercent: -40,
                   ease: "none",
                });
             });
          }
    //    }
    // });
}

function playVideoInview() {
    let allVideoDivs = gsap.utils.toArray('.playpauze');
    allVideoDivs.forEach((videoDiv, i) => {
        let videoElem = videoDiv.querySelector('video');
        ScrollTrigger.create({
            trigger: videoDiv,
            //markers: {startColor: "red", endColor: "white", fontSize: "18px", fontWeight: "bold", indent: 20},
            start: '0% 100%',
            end: '100% 0%',
            onEnter: () => {
                videoElem && videoElem.play();
            },
            onEnterBack: () => {
                videoElem && videoElem.play()
            },
            onLeave: () => {
                videoElem && videoElem.pause()
            },
            onLeaveBack: () => {
                videoElem && videoElem.pause()
            }
        });
    });
}

function videoMouseovers (){
    // Add event listeners for video autoplay on hover
    const videos = document.querySelectorAll('.autoPlayContainer');
    videos.forEach(link => {
        const video = link.querySelector('video.autoPlay');
        if (video) {
            link.addEventListener('mouseenter', () => {
                video.play();
            });
            link.addEventListener('mouseleave', () => {
                video.pause();
            });
        }
    });
}


function anims() {
    if (!window.matchMedia("(pointer: coarse)").matches) {  
        const scrollZoomElements = document.querySelectorAll("[scroll-zoom]");
        let animationFrameId = null;
        let lastX = 0, lastY = 0;
        const sensitivity = 2; // Minimum movement threshold

        const handleMouseMove = (event) => {
            if (animationFrameId) return;

            animationFrameId = requestAnimationFrame(() => {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const distanceX = event.clientX - centerX;
                const distanceY = event.clientY - centerY;

                // Only animate if movement exceeds sensitivity threshold
                if (Math.abs(distanceX - lastX) < sensitivity && Math.abs(distanceY - lastY) < sensitivity) {
                    animationFrameId = null;
                    return;
                }

                lastX = distanceX;
                lastY = distanceY;

                scrollZoomElements.forEach((el) => {
                    const depth = parseFloat(el.getAttribute("scroll-zoom-depth")) || 1;
                    gsap.to(el, {
                        x: (distanceX / centerX) * -20 * depth,
                        y: (distanceY / centerY) * -30 * depth,
                        ease: "power2.out",
                        duration: 4,
                    });
                });

                animationFrameId = null;
            });
        };

        window.addEventListener("mousemove", handleMouseMove, { passive: true });

        // Reset positions and remove event listener when leaving
        barba.hooks.leave(() => {
            window.removeEventListener("mousemove", handleMouseMove);
            scrollZoomElements.forEach((el) => {
                gsap.to(el, {
                    x: 0,
                    y: 0,
                    ease: "power2.out",
                    duration: 1.5,
                });
            });
        });
    }

   



    gsap.to('.scrollerIndicator', {
        scaleX: 1,
        ease: "none",
        force3D: false,
        scrollTrigger: {
            trigger: ".mainTrigger",
            start: "top top",
            end: 'bottom bottom',
            scrub: 1,
            //markers: true
        },
    });
}

function wooQuantityButtons() {
  jQuery(document).ready(function ($) {
    $('form.cart .quantity').each(function () {
      let $input = $(this).find('input.qty');

      // Remove any existing buttons and wrappers
      $(this).find('.qty-buttons-wrapper').remove();
      $(this).find('.qty-button').remove();

      // Wrap input in qty-container if not already wrapped
      if (!$input.parent().hasClass('qty-container')) {
        $input.wrap('<div class="qty-container"></div>');
      }

      let $container = $input.parent('.qty-container');

      // Create buttons wrapper
      const $buttonsWrapper = $('<div class="qty-buttons-wrapper"></div>');

      // Create minus and plus buttons
      const $plusBtn = $('<button type="button" class="qty-button plus"><svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.14925 1.77344V11.2174M10.8713 6.49544H1.42725" stroke="#141B34" stroke-width="1.67952" stroke-linecap="round" stroke-linejoin="round"/></svg></button>');
      const $minusBtn = $('<button type="button" class="qty-button minus"><svg width="11" height="3" viewBox="0 0 11 3" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="0.0664062" y1="1.60059" x2="10.6753" y2="1.60059" stroke="black" stroke-width="2"/></svg></button>');

      // Append buttons to wrapper
      $buttonsWrapper.append($plusBtn, $minusBtn);

      // Insert buttons wrapper after input inside container
      $input.after($buttonsWrapper);

      // Attach click handlers
      $minusBtn.on('click', function (e) {
        e.preventDefault();
        let currentVal = parseInt($input.val()) || 0;
        if (currentVal > 1) {
          $input.val(currentVal - 1).trigger('change');
        }
      });

      $plusBtn.on('click', function (e) {
        e.preventDefault();
        let currentVal = parseInt($input.val()) || 0;
        $input.val(currentVal + 1).trigger('change');
      });
    });

    
    function initPurchaseCardInteractions() {
        // Handle card selection
        $('.purchase-card').on('click', function() {
        const value = $(this).data('value');
        
        // Update visual selection
        $('.purchase-card').removeClass('selected');
        $(this).addClass('selected');
        
        // Trigger corresponding radio button
        $(`input[name="attribute_purchase-option"][value="${value}"]`)
            .prop('checked', true)
            .trigger('change');
        });
        
        // Set initial selection based on checked radio
        const $checkedRadio = $('input[name="attribute_purchase-option"]:checked');
        if ($checkedRadio.length) {
        $(`.purchase-card[data-value="${$checkedRadio.val()}"]`).addClass('selected');
        }
        
        // Sync when radio buttons change (from other sources)
        $('input[name="attribute_purchase-option"]').on('change', function() {
        const value = $(this).val();
        $('.purchase-card').removeClass('selected');
        $(`.purchase-card[data-value="${value}"]`).addClass('selected');
        });
    }
    
    // Initialize interactions
    initPurchaseCardInteractions();
    
    // Your existing functionality
    $('input[name="attribute_purchase-option"]').on('change', function() {
        const isSubscription = $(this).val() === 'Monthly subscription';
        
        // Toggle body class
        $('body').toggleClass('subscribe-active', isSubscription);
        
        // Reset quantity to 1
        //$('.input-text.qty.text').val(1);
        
        // Show/hide quantity selector
        $('.quantity').toggle(isSubscription);
    });
    
    // Trigger initial state
    $('input[name="attribute_purchase-option"]:checked').trigger('change');










                
  });
}


function popups() {
  // Team Cards
  $('[data-popup-card-id]').click(function () {
    var popupCardID = $(this).data('popup-card-id');
    var $popup = $('[data-popup-lightbox-id="' + popupCardID + '"]');

    // If card == open, close it. Else: main action
    if ($popup.attr('data-popup-lightbox-status') == 'active') {
      $popup.attr('data-popup-lightbox-status', 'not-active');
    } else {
      $popup
        .attr('data-popup-lightbox-status', 'active')
        .siblings()
        .attr('data-popup-lightbox-status', 'transition');
      setTimeout(function () {
        $popup.siblings().attr('data-popup-lightbox-status', 'not-active');
      }, 600);
    }

    // Toggle body class and scroll control based on whether any popup is active
    if ($('[data-popup-lightbox-status="active"]').length) {
      $('body').addClass('popup-open');
      scrollControl.stop();
    } else {
      $('body').removeClass('popup-open');
      scrollControl.start();
    }
  });

  // Close popup if clicked outside or close button
  $('[data-popup-lightbox-toggle="close"]').click(function () {
    $('[data-popup-lightbox-id]').attr('data-popup-lightbox-status', 'not-active');
    $('body').removeClass('popup-open');
    scrollControl.start();
  });

  $(document).click(function (event) {
    var target = $(event.target);
    var activePopup = $('[data-popup-lightbox-status="active"]');
    if (
      activePopup.length &&
      !target.closest('.single-popup-lightbox').length &&
      !target.closest('[data-popup-card-id]').length
    ) {
      activePopup.attr('data-popup-lightbox-status', 'not-active');
      $('body').removeClass('popup-open');
      scrollControl.start();
    }
  });
}

function reinitWooCommerce() {
    console.log('Reinitializing WooCommerce...');

    // Clear any outdated cart fragments
    if (window.wc_cart_fragments_params) {
        $(document.body).trigger('wc_fragment_refresh');
    }

    // Reinit core scripts
    if (typeof wc_add_to_cart !== 'undefined') {
        wc_add_to_cart.init();
    }

    if (typeof wc_single_product !== 'undefined') {
        wc_single_product.init();
    }
}


function reinitializeWooCommerceRating() {
  if (typeof wc_single_product_params !== 'undefined') {
    // Find any existing star UI and remove it first to prevent duplicates
    $('.comment-form-rating p.stars').remove();
    
    // Re-trigger the init event to create the star UI
    $('#rating').trigger('init');
    
    // Fix the security field name (important for form submission)
    if ($('#_wp_unfiltered_html_comment_disabled').length) {
      $('#_wp_unfiltered_html_comment_disabled').attr('name', '_wp_unfiltered_html_comment');
    }
    
    // Update the Akismet timestamp
    if ($('[id^="ak_js_"]').length) {
      $('[id^="ak_js_"]').each(function() {
        $(this).val((new Date()).getTime());
      });
    }
  }
}






function pageLeave() {
  setTimeout(() => {
    // document.querySelectorAll('[href*="/cart/"], [href*="/checkout/"]').forEach(function (link) {
    //   link.setAttribute('data-barba-prevent', 'self');
    // });
    // window.addEventListener('beforeunload', (event) => {
    //   triggerPageLeaveAnimation();
    // });
    // Add data-barba-prevent attribute to all links
    document.querySelectorAll('a').forEach(function (link) {
      link.setAttribute('data-barba-prevent', 'self');
    });

    // Trigger animation on page unload (refresh, close tab, external navigation)
    window.addEventListener('beforeunload', (event) => {
      triggerPageLeaveAnimation();
      // Note: animations may not fully run here due to browser restrictions
    });
  }, 1000);
}

function triggerPageLeaveAnimation() {
  $('main').removeClass('pageTransitionEnter');
  $('main').addClass('pageTransitionLeave');

  var tl = gsap.timeline();
  tl.to(
    '.content',
    {
      duration: 0.6,
      filter: 'blur(80px)',
      scaleX: 1.5,
      opacity: 0,
      ease: 'expo.inOut',
      delay: 0,
    },
    0
  );
}

function forms() {
    const inputs = document.querySelectorAll(
        ".comment-form input[type='text'], .comment-form input[type='email'], .comment-form textarea"
    );

    // Add placeholder attribute to all inputs
    inputs.forEach(input => {
        input.setAttribute("placeholder", " ");

        // Check initial state
        if (input.value.trim() !== "") {
            input.classList.add("has-content");
        }

        // Move labels for proper positioning
        const label = input.previousElementSibling;
        if (label && label.tagName === "LABEL") {
            input.parentNode.appendChild(label);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    pageLeave();
});

function initScripts() {
    buttonHovers();
    initSplitText();
    initCheckWindowHeight();
    initScrollTriggerParallaxScroll();
    playVideoInview();
    videoMouseovers();
    nav();
    lazyload();
    anims();
    wooQuantityButtons();

    popups();
    pageLeave ();
    forms();
}



function initPageBarba() {
    history.scrollRestoration = "manual";

    barba.hooks.beforeLeave ((data) => {
        document.querySelector('html').classList.add('transitioning');
        $('body').removeClass('body-menu-opened');
        $('.main-nav').removeClass('menu-opened');
        $('.menu-item-has-children').removeClass('menu-hovered');
        
        $('.nav-holder').removeClass('nav-change');
        $('.nav-holder').removeClass('nav-show');
        $('.nav-holder').removeClass('nav-hide');
        $('.nav-primary > li.menu-item-has-children > a').removeClass('open');
   
        setTimeout(() => {
            $('body').removeClass().addClass('website-loaded');
        },300 );
    
        $('.nav-holder').removeAttr('data-lenis-prevent');
    })

    
    // Scroll to top on enter + Refresh scrolltrigger
    barba.hooks.afterEnter((data) => {
        window.scrollTo(0, 0);
        ScrollTrigger.refresh();

        // reinitWooCommerce();
        // reinitializeWooCommerceRating();
        // jQuery.get("/wp-content/plugins/yith-woocommerce-dynamic-pricing-and-discounts-premium/assets/js/build/frontend.min.js");



        if ( window.location.hash ) {
            setTimeout(function() {
                $('html,body').animate({
                scrollTop: $(window.location.hash).offset().top - 0 
                }, 1000);
            }, 100);
        }

        // $("a").on('click', function(event) {
        //     if (this.hash !== "") {
        //         event.preventDefault();
        
        //         var hash = this.hash;
                
        //         // Check if the lenis.scrollTo() method is available
        //         if (typeof lenis !== "undefined" && typeof lenis.scrollTo === "function") {
        //             lenis.scrollTo(hash, {
        //                 duration:1,
        //                 offset:-0
        //             });
        //         } else {
        //             $('html, body').animate({
        //             scrollTop: $(hash).offset().top - 0
        //             }, 1000, function(){
        //             window.location.hash = hash;
        //             });
        //         }
        //     }
        // });
    });
       
   
    // Init on page specific transition with data attribute data-function="filenameInModulesFolder"
    barba.hooks.beforeEnter((data) => {
        onPageJs(data);
    });
    
    // Functions Before: Like to remove classes from the body
    function initResetDataBefore() {
      
    }

    barba.init({
       
        
        sync: true,
        debug: false,
        timeout: 7000,
        // Prevent Barba from handling WooCommerce form submissions
        prevent: ({ href }) => {
            try {
            // Create a URL object to reliably get the pathname
            const url = new URL(href, window.location.origin);
            const path = url.pathname;

            // Prevent Barba for /cart/ and /checkout/ paths
            return path === '/cart/' || path === '/checkout/';
            } catch (e) {
            // If href is invalid URL, fallback to string check
            return href === '/cart/' || href === '/checkout/';
            }
        },

        transitions: [{
            name: 'default',
            once(data) {
                initSmoothScroll(data.next.container);
                initScripts();
                initLoader();
            },
            async leave(data) {
                
                
                pageTransitionLeave(data.current);
                initResetDataBefore();
                
                await delay(transitionOffset);
                //initResetDataAfter();

                // Important!!!!! below ffs
                data.current.container.remove();
            },
            async enter(data) {
                pageTransitionEnter(data.next.container);
            },
            async beforeEnter(data) {

                const updateItems = $(data.next.html).find('[data-barba-update]');
                $('[data-barba-update]').each(function(index) {
                    const updateItem = $(updateItems[index]).get(0);
                    if (updateItem) {
                        const newClasses = updateItem.classList.value;
                        setTimeout(() => {
                            $(this).attr('class', newClasses);
                        }, 50 );
                    }
                });

                
                ScrollTrigger.getAll().forEach(t => t.kill());
                initSmoothScroll(data.next.container);
                initScripts();

                // Add data attributes to WooCommerce forms to prevent Barba from handling them
                $(data.next.container).find('form.cart, form.checkout, .woocommerce-cart-form, .woocommerce-checkout').attr('data-barba-prevent', 'true');
            },
        }]
    });
}
initPageBarba();