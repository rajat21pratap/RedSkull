import {getPromiseWithTimeout} from "./Utility.js";

class CircuitBreaker {
    state = {
        OPEN: 0,
        HALF_OPEN: 1,
        CLOSE: 2
    }
    baseFactor = 2;
    circuitState = this.state.CLOSE;
    thresholdInterval = undefined;
    backOffTimeoutHandler = undefined;
    errorsInInterval = 0;
    attempt = 0;
    lastCallTimeStamp = undefined;
    subsequentRequestMaxTimeDiff = 2 * 60 * 60 * 1000;
    config = {
            initialDelay: 100, 
            intervalWindow: 3 * 60 * 1000, 
            thresholdCount: 5, 
            maxDelay: 60 * 1000,
            promiseTimeout: 5 * 1000,
            exponentialBackoff: true
        };

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
        this.config = config || this.config;
        let currentRequestTime = Date.now();
        if (this.lastCallTimeStamp && (currentRequestTime - this.lastCallTimeStamp > this.subsequentRequestMaxTimeDiff)) {
            this.reset();
        }
        this.lastCallTimeStamp = Date.now();
        switch (this.circuitState) {
            case this.state.CLOSE :
            if (this.config && !this.thresholdInterval) {
                this.thresholdInterval = this.startOperationHealthTicker(this.config.intervalWindow, this.config.thresholdCount);
            }
            return this.executeOperation(operation);
            break;

            case this.state.HALF_OPEN:
            if (this.isHalfOpenRequestPending) {
                return Promise.reject("rejected: API down");
            }
             return this.executeOperation(operation);
            break;

            case this.state.OPEN:
            this.errorsInInterval++;
            return Promise.reject("rejected: API down");
        }
    }

    executeOperation (operation) {
        if (this.circuitState === this.state.HALF_OPEN) {
            this.isHalfOpenRequestPending = true;
        }

        return getPromiseWithTimeout(operation(), this.config.promiseTimeout, "time_out").then((response) => {
            if (this.circuitState === this.state.HALF_OPEN) {
                this.reset();
            }
            return response;
        }).catch(error => {
           this.isHalfOpenRequestPending = false;
           this.handleOnOperationError();
           throw error;
        });
    }

    handleOnOperationError() {
        this.errorsInInterval++;
        if (this.circuitState === this.state.CLOSE && this.errorsInInterval >= this.config.thresholdCount) {
            this.circuitState = this.state.OPEN;
            this.backOffTimeoutHandler = this.startBackOffTimer();
        }
        if (this.circuitState === this.state.HALF_OPEN) {
            this.circuitState = this.state.OPEN;
            this.backOffTimeoutHandler = this.startBackOffTimer();
        }
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
            this.attempt++;
            let timer = Math.min(this.config.initialDelay * Math.pow(this.baseFactor, this.attempt - 1), this.config.maxDelay);
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
export default CircuitBreaker;