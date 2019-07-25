import {getPromiseWithTimeout} from "./Utility";

class CircuitBreaker {
    state = {
        OPEN: 0,
        HALF_OPEN: 1,
        CLOSE: 2
    }

    defaultConfig = 
            {
                initialDelay: 100, 
                intervalWindow: 10, 
                thresholdCount: 10, 
                maxDelay: 60,
                promiseTimeout: 5 
            }

    baseFactor = 2;
    circuitState = this.state.CLOSE;
    thresholdInterval = undefined;
    backOffTimeoutHandler = undefined;
    errorsInInterval = 0;
    attempt = 0;
    lastCallTimeStamp = undefined;
    subsequentRequestMaxTimeDiff = 2 * 60 * 60 * 1000;
    

    constructor() {}

    get circuitState() {
        return this.circuitState;
    }

    set circuitState(state) {
        this.circuitState = state;
    }

    run (
        operation,
        config
    ) {
        config = config || this.defaultConfig;
        let currentRequestTime = Date.now();
        if (this.lastCallTimeStamp && (currentRequestTime - this.lastCallTimeStamp > subsequentRequestMaxTimeDiff)) {
            reset();
        }
        this.lastCallTimeStamp = Date.now();
        switch (this.circuitState) {
            case this.state.CLOSE :
            if (config && !this.thresholdInterval) {
                this.thresholdInterval = this.startOperationHealthTicker(config.intervalWindow, config.thresholdCount);
            }
            return this.executeOperation(operation, config);
            break;

            case this.state.HALF_OPEN:
            if (this.isHalfOpenRequestPending) {
                return Promise.reject("rejected: API down");
            }
             return this.executeOperation(operation, config);
            break;

            case this.state.OPEN:
            this.errorsInInterval++;
            return Promise.reject("rejected: API down");
        }
    }

    executeOperation (operation, config) {
        if (this.circuitState === this.state.HALF_OPEN) {
            this.isHalfOpenRequestPending = true;
        }

        return getPromiseWithTimeout(operation, this.config.promiseTimeout, "time_out").then((response) => {
            if (circuitState === this.state.HALF_OPEN) {
                reset();
            }
            return response;
        }).catch(error => {
           this.handleOnOperationError();
           throw error;
        });
    }

    handleOnOperationError() {
        this.errorsInInterval++;
        if (this.circuitState === this.state.CLOSE && this.errorsInInterval >= this.config.thresholdCount) {
            this.circuitState = this.state.OPEN;
        }
        if (this.circuitState === this.state.HALF_OPEN) {
            this.attempt++;
            this.circuitState = this.state.OPEN;
        }

        this.backOffTimeoutHandler = this.startBackOffTimer();
    }

    startOperationHealthTicker (
        interval
    ) {
        return setInterval(() => {
            this.errorsInInterval = 0;
        }, interval);
    }

    startBackOffTimer () {
        if (this.config.exponentialBackoff) {
            let timer = Math.min(this.config.initialDelay * Math.pow(baseFactor, attempt - 1), this.config.maxDelay);
            return setTimeout(() => {
                this.circuitState = this.state.HALF_OPEN;
            },
            timer);
        }
    }

    reset () {
        this.circuitState = this.state.CLOSE;
        this.attempt = 0;
        this.errorsInInterval = 0;
        clearTimeout(this.backOffTimeoutHandler);
        this.isHalfOpenRequestPending = false;
    }
}


//const singletonInstance = new CircuitBreaker();
//Object.freeze(singletonInstance);
export default CircuitBreaker;