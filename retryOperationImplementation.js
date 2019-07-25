export class RetryOperationImplementation {

    constructor(
      service,
      operation,
      operationName,
      options,
      logMessage
    ) {
  
      this.deferred = new Promise();
      this.retryAttempt = -1;
      this.isAborted = false;
      this.isCancelled = false;
      this.retryMaxTimer;
  
      options = options || {};
      this.service = service;
      this.operation = operation;
      this.operationName = operationName;
      this.logMessage = logMessage;
  
      this.delayInMs = options.delayInMs || 1000;
      this.isExponential = options.isExponential || false;
      this.forever = options.forever || false;
      this.numberOfRetrials = options.numberOfRetrials || 5;
      this.retryMaxTimeMs = options.retryMaxTimeMs;
      this.retryMaxTimeCallback = options.retryMaxTimeCallback;
  
      this.promise
      .finally(() => {
        // clean up all references when operation completes
        this.cancelMaxWaitTimer();
        this.timerPromise = null;
        this.operation = null;
        this.deferred = null;
      });
  
      if (options.retryMaxTimeMs && options.retryMaxTimeMs > 0) {
        this.createMaxWaitTimer(options.retryMaxTimeMs);
      }
      this.retryOperation();
    }
  
    get promise() {
      return this.deferred ? this.deferred : null;
    }
  
    get cancelled() {
      return this.isCancelled;
    }
  
    get aborted() {
      return this.isAborted;
    }
  
    get active() {
      return !!this.promise;
    }
  
    get attempt() {
      return this.retryAttempt;
    }
  
    cancel(reason) {
      if (this.promise) {
        this.isCancelled = true;
        this.service.logMessage(`Operation ${this.name} cancelled. With reason ${reason || 'not provided'}`);
  
        if (this.timerPromise) {
          this.service.$cancelTimer(this.timerPromise);
        }
        this.promise.reject(reason || this.service.strings.cancelled);
        return true;
      }
      return false;
    }
  
    retryOperation() {
      this.timerPromise = null;
      this.retryAttempt += 1;
  
      this.service.logMessage(`Retrying operation ${this.name}, attempt: ${this.retryAttempt}`);
  
      this.operation(this.retryScenario).then(result => {
        if (this.deferred) {
          this.service.logMessage(`Operation ${this.name} succeeded, attempt: ${this.retryAttempt}`);
          this.promise.resolve(result);
        }
      }, (failure) => {
        if (!this.promise) {
          // already resolved/cancelled/disposed - do nothing
          return;
        }
  
        this.service.logMessage(`Operation ${this.name} failed, attempt: ${this.retryAttempt}, error: ${ failure}`);
  
        if (failure && (failure === this.service.strings.aborted || failure.retryStatus == this.service.aborted)) {
          this.service.logMessage(`Operation ${this.name} requested to abort.`, 'warn');
          this.isAborted = true;
          this.promise.reject(failure);
          return;
        }
  
        if (!this.forever && this.retryAttempt >= this.numberOfRetrials) {
          this.service.logMessage(`Operation ${this.name} reached max retry attempts, reporting as failed.`, 'warn');
          this.promise.reject(failure);
        } else {
          let exponentialNumber = Math.min(this.retryAttempt, this.numberOfRetrials);
          let interval = ( this.isExponential ? Math.pow(2, exponentialNumber) : 1 ) * this.delayInMs;
          this.timerPromise = this.service.$setTimer(() => this.retryOperation(), interval);
        }
      });
    }
  
    /**
     * Cancels any existing wait timers and creates a new.
     * @param waitTime - Time to wait
     */
    createMaxWaitTimer(waitTime) {
      this.cancelMaxWaitTimer();
  
      this.retryMaxTimer = this.service.$setTimer(() => {
        let continueRetry;
        if (this.retryMaxTimeCallback && typeof (this.retryMaxTimeCallback) === "function") {
          let result = this.retryMaxTimeCallback();
          continueRetry = result && result === true;
        }
  
        if (!continueRetry) {
          this.cancel('Max time reached');
          this.service.logMessage(`Max wait time reached caller opted to cancel retry. Operation ${this.name} cancelled.`);
        } else {
          this.service.logMessage(`Max wait time reached caller opted to continue retry. Operation ${this.name} continuing`);
        }
      }, waitTime);
    }
  
    cancelMaxWaitTimer() {
      if (this.retryMaxTimer) {
        this.service.$cancelTimer(this.retryMaxTimer);
        this.retryMaxTimer = null;
      }
    }
  }