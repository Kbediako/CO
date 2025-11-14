export function onPageJs(data) {

    // Page specific functions
    const createFunctionExecutionTracker = () => {
        const executedFunctions = new Set();
        return (functionName) => {
            if (!executedFunctions.has(functionName)) {
                executedFunctions.add(functionName);
                return true;
            }
            return false;
        };
    };
    const shouldExecuteFunction = createFunctionExecutionTracker();
    const targetElement = data.next.container;
    const elementsWithFunction = targetElement.querySelectorAll('[data-function]');
    elementsWithFunction.forEach(async (element) => {
        const functionName = element.dataset.function;
        const delay = parseInt(element.dataset.functionDelay, 10) || 0;
        if (shouldExecuteFunction(functionName)) {
            try {
                const timestamp = new Date().getTime();
                // Only for testing purposes - remove in production this part ?v=${timestamp}
                const { default: dynamicFunction } = await import(`../modules/${functionName}.js?v=${timestamp}`);
                if (typeof dynamicFunction === 'function') {
                    setTimeout(() => {
                        dynamicFunction();
                    }, delay);
                } else {
                    console.warn(`Module for ${functionName} does not export a function.`);
                }
            } catch (error) {
                console.log(`Module for ${functionName} does not exist.`);
            }
        }
    });

    

}
