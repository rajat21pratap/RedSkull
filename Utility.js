  export function getPromiseWithTimeout(promise, delay, timeoutMessage) {
    var deferred = Promise.defer();
    var message = timeoutMessage ? timeoutMessage : "promise timedout";

    let timerPromise = setTimeout(() => deferred.reject(message), delay);

    promise.then(deferred.resolve, deferred.reject)
    .finally(() => {
        timerPromise && clearTimeout(timerPromise);
    });

    return deferred.promise;
  }