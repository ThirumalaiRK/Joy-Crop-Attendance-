declare module 'node-zklib' {
  class ZKLib {
    constructor(ip: string, port?: number, timeout?: number, inport?: number);
    createSocket(): Promise<any>;
    disconnect(): Promise<any>;
    getTime(): Promise<any>;
    setTime(date: Date): Promise<any>;
    getUsers(): Promise<any>;
    setUser(uid: number, userid: string, name: string, password?: string, role?: number, cardno?: number): Promise<any>;
    deleteUser(uid: number): Promise<any>;
    getAttendances(): Promise<any>;
    clearAttendanceLog(): Promise<any>;
    clearData(): Promise<any>;
    executeCmd(command: number, data?: any): Promise<any>;
    getRealTimeLogs(callback: (data: any) => void): Promise<any>;
    getInfo(): Promise<any>;
    getTemplates(): Promise<any>;
  }
  export default ZKLib;
}
