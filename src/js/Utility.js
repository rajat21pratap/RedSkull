  export function getPromiseWithTimeout(promise, delay, timeoutMessage) {
    return new Promise(function(resolve, reject) {
      var message = timeoutMessage ? timeoutMessage : "promise timedout";

      let timerPromise = setTimeout(() => reject(message), delay);

      promise.then((response) => resolve(response)).catch((error) => reject(error))
      .finally(() => {
          timerPromise && clearTimeout(timerPromise);
      });        
    });

  }