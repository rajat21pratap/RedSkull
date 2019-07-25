import { 
    CircuitBreakerInstance,
    RetryServiceInstance
} from "./RedSkull.js"
(function() {

function operation(){
    return fetch("http://jsonplaceholder.typicode.com/todos/1");
}

})();

function retryExample(url, operationName) {

    var operation =  () => {
        return fetch(url)
        .then(function(response) {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response.json();
        });
    }

    let options = {
        forever: false,
        delayInMs: 200,
        isExponential: true,
        numberOfRetrials: 5,
        retryMaxTimeMs: 1000
    }

    const retryPromise = RetryServiceInstance.retry(
        operationName || 'retryExamole',
        operation,
        options
    );

    retryPromise
    .then(function(jsonResponse) {
        let response  = JSON.stringify(jsonResponse.value);
        console.log('Api successed.....', response);
    }).catch(() => {
        console.log('within catch of retryPromise...................');
    });
};

//retryExample(`/dummy1.json`, 'Example1');
retryExample(`/dummy2.json`, 'Example2');
//retryExample(`/dummy.json`, 'Example3');
