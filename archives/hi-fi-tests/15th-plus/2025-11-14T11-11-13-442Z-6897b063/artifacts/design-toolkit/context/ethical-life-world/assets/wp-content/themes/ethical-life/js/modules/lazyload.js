export function lazyload() {
    function logElementEvent(eventName, element) {
    console.log(Date.now(), eventName, element.getAttribute("data-src"));
    }

    var callback_loaded = function (element) {
        logElementEvent("👍 LOADED", element);
          // Add the 'lazy-container-loaded' class to the grandparent element
        if (element.parentElement && element.parentElement.parentElement) {
            element.parentElement.parentElement.classList.add('lazy-container-loaded');
        }
    };

    var lazyLoadInstance = new LazyLoad({
        //container: document.getElementById("smooth-wrapper"),
        threshold: 500,
        callback_loaded: callback_loaded,
    });
    lazyLoadInstance.update();
}