import instance from "./RedSkull.js"
(function() {

function operation(){
    return fetch("http://jsonplaceholder.typicode.com/todos/1");
}

var int = setInterval(() => {
    instance.backoff(operation, "first-operation").then((response) => {
        response.json().then(function(data) {
            console.log(data);
        });
    }).catch((error) => console.log("error received ", error));        
}, 1000);

setTimeout(() => {
    clearInterval(int);
}, 5 * 60 * 1000);

})();