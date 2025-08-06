export class Logger {
    static instance;
    constructor() { }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    info(message) {
        console.error(`[NTFYME-LOG-INFO]: ${message}`);
    }
    warn(message) {
        console.error(`[NTFYME-LOG-WARNING]: ${message}`);
    }
    error(message) {
        console.error(`[NTFYME-LOG-ERROR]: ${message}`);
    }
}
