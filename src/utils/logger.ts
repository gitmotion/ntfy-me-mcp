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
    console.error(`[INFO]: ${message}`);
  }

  public warn(message: string): void {
    console.error(`[WARN]: ${message}`);
  }

  public error(message: string): void {
    console.error(`[ERROR]: ${message}`);
  }
}
