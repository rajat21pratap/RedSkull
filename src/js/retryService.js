"user stict";
import { RetryOperationImplementation } from './retryOperationImplementation.js';

class RetryServiceImplementation {

    constructor() {
        this.retryOperations = [];
    }

    get strings() {
        return {
            aborted: 'aborted',
            cancelled: 'cancelled'
        };
    }

    logMessage(message, type) {
        type = (type || '').toLowerCase();
        switch (type) {
            case 'error':
                console.error(message);
                break;
            case 'warn':
                console.warn(message);
                break;
            case 'info': // fall through
            default:
                console.log(message);
                break;
        }
    }

    $setTimer(func, timeInMS) {
        return setTimeout(func, timeInMS);
    }

    $cancelTimer(timer) {
        return ( timer && clearTimeout(timer) );
    }

    retry(retryName, operation, options) {
        options = options || {};
        var retryOperation = new RetryOperationImplementation(this, operation, retryName, options);
        this.retryOperations.push(retryOperation);
        retryOperation.promise.finally(() => {
            var index = this.retryOperations.indexOf(retryOperation);
            if (index > -1) {
                this.retryOperations.splice(index, 1);
            }
        });
        return retryOperation;
    }

}

const RetryService = ( new RetryServiceImplementation() );
export default RetryService;

