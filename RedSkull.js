 import CircuitBreaker from "../circuit-breaker.js";
 class RedSkull {
    circuiBreakerInstanceMap = new Map();
    constructor () {
        if (!RedSkull.instance) {
        RedSkull.instance = this
        }
        // Initialize object
        return RedSkull.instance
    }

    backoff (operation, operationName, config) {
        if (!operation || !operationName) {
            throw new Error("Invalid args");
        }

        // check if the instance exists
        // if true, check the state and operate accordingly
        // else create a new instance and push it to the map

        let currInstance = this.circuiBreakerInstanceMap.get(operationName);
        if (!currInstance) {
            currInstance = new CircuitBreaker(config);
            this.circuiBreakerInstanceMap.set(operationName, operation);
        }
        return currInstance.run(operation);
    }
}

const instance = new RedSkull();
Object.freeze(instance);
export default instance;
