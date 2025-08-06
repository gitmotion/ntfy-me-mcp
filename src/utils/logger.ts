export class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public info(message: string): void {
    console.error(`[NTFYME-LOG-INFO]: ${message}`);
  }

  public warn(message: string): void {
    console.error(`[NTFYME-LOG-WARNING]: ${message}`);
  }

  public error(message: string): void {
    console.error(`[NTFYME-LOG-ERROR]: ${message}`);
  }
}
