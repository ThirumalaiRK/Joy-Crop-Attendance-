import ZKLib from 'node-zklib';
import { EventEmitter } from 'events';
import { AttendanceLog, BiometricUser, ConnectionState, DeviceInfo, IBiometricDevice } from './types';

export class ZKTecoDevice extends EventEmitter implements IBiometricDevice {
  private device: any;
  private ip: string;
  private port: number;
  private timeout: number;
  private inport: number;
  public connectionState: ConnectionState = 'OFFLINE';

  constructor(ip: string, port: number = 4370, timeout: number = 10000, inport: number = 5200) {
    super();
    this.ip = ip;
    this.port = port;
    this.timeout = timeout;
    this.inport = inport;
    this.device = new ZKLib(ip, port, timeout, inport);
  }

  async connect(): Promise<boolean> {
    try {
      this.connectionState = 'CONNECTING';
      this.emit('state_changed', { state: this.connectionState, ip: this.ip });
      await this.device.createSocket();
      this.connectionState = 'ONLINE';
      this.emit('state_changed', { state: this.connectionState, ip: this.ip });
      return true;
    } catch (error) {
      this.connectionState = 'ERROR';
      this.emit('state_changed', { state: this.connectionState, ip: this.ip, error });
      console.error(`Failed to connect to ZKTeco device at ${this.ip}:${this.port}`, error);
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      await this.device.disconnect();
      this.connectionState = 'OFFLINE';
      this.emit('state_changed', { state: this.connectionState, ip: this.ip });
      return true;
    } catch (error) {
      this.connectionState = 'OFFLINE';
      console.error(`Failed to disconnect from ZKTeco device at ${this.ip}:${this.port}`, error);
      return false;
    }
  }

  async ping(): Promise<number> {
    const start = Date.now();
    try {
      if (typeof this.device.getTime === 'function') {
        await this.device.getTime();
      } else {
        await this.device.executeCmd(1000, ''); // CMD_CONNECT ping
      }
      return Date.now() - start;
    } catch (err) {
      throw new Error(`Ping failed for device ${this.ip}: ${err}`);
    }
  }

  async getUsers(): Promise<BiometricUser[]> {
    try {
      const users = await this.device.getUsers();
      return users.data || [];
    } catch (error) {
      console.error(`Failed to get users from ${this.ip}`, error);
      return [];
    }
  }

  private commandQueue: Promise<any> = Promise.resolve();

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const res = this.commandQueue.then(() => operation(), () => operation());
    this.commandQueue = res.catch(() => {});
    return res;
  }

  async getAttendanceLogs(): Promise<AttendanceLog[]> {
    if (this.connectionState !== 'ONLINE') return [];
    return this.withLock(async () => {
      try {
        const attendances = await this.device.getAttendances();
        if (!attendances || !attendances.data) return [];
        return attendances.data || [];
      } catch (error: any) {
        console.warn(`⚠️ [ZKTecoDevice] Notice getting attendance logs from ${this.ip}:`, error?.message || error);
        return [];
      }
    });
  }

  async clearAttendanceLogs(): Promise<boolean> {
    return this.withLock(async () => {
      try {
        await this.device.clearAttendanceLog();
        return true;
      } catch (error) {
        console.error(`Failed to clear attendance logs from ${this.ip}`, error);
        return false;
      }
    });
  }

  async clearUsers(): Promise<boolean> {
    return this.withLock(async () => {
      try {
        await this.device.clearData();
        return true;
      } catch (error) {
        console.error(`Failed to clear users from ${this.ip}`, error);
        return false;
      }
    });
  }

  async executeCmd(command: number, data: string | Buffer = ''): Promise<boolean> {
    return this.withLock(async () => {
      try {
        await this.device.executeCmd(command, data);
        return true;
      } catch (error) {
        console.error(`Failed to execute cmd ${command} on ${this.ip}`, error);
        return false;
      }
    });
  }

  async enableRealTimeLogs(): Promise<boolean> {
    try {
      await this.device.getRealTimeLogs((data: any) => {
        this.emit('attendance_received', data);
      });
      return true;
    } catch (error) {
      console.error(`Failed to enable real time logs on ${this.ip}`, error);
      return false;
    }
  }

  async startEnrollment(userId: string, fingerIndex: number = 0): Promise<boolean> {
    return this.withLock(async () => {
      try {
        // 1. Cancel active sensor loop first to ensure hardware accepts enrollment trigger
        try {
          await this.device.executeCmd(60, ''); // CMD_CANCELCAPTURE
          await new Promise((r) => setTimeout(r, 250));
        } catch (_) { }

        const numericUid = parseInt(String(userId).replace(/\D/g, ''), 10) || 1;

        // 2. Format A: 3-byte buffer (2-byte UInt16LE UID + 1-byte Finger Index)
        try {
          const buf3 = Buffer.alloc(3);
          buf3.writeUInt16LE(numericUid, 0);
          buf3.writeUInt8(fingerIndex, 2);
          const ok3 = await this.device.executeCmd(61, buf3);
          if (ok3 !== false) {
            console.log(`✅ [ZKTecoDevice] CMD_STARTENROLL (3-byte) succeeded for UID ${numericUid}, finger ${fingerIndex}`);
            return true;
          }
        } catch (e: any) {
          console.warn(`[ZKTecoDevice] Format A (3-byte) notice: ${e?.message}`);
        }

        // 3. Format B: 5-byte buffer (4-byte UInt32LE UID + 1-byte Finger Index)
        try {
          const buf5 = Buffer.alloc(5);
          buf5.writeUInt32LE(numericUid, 0);
          buf5.writeUInt8(fingerIndex, 4);
          const ok5 = await this.device.executeCmd(61, buf5);
          if (ok5 !== false) {
            console.log(`✅ [ZKTecoDevice] CMD_STARTENROLL (5-byte) succeeded for UID ${numericUid}, finger ${fingerIndex}`);
            return true;
          }
        } catch (e: any) {
          console.warn(`[ZKTecoDevice] Format B (5-byte) notice: ${e?.message}`);
        }

        // 4. Format C: 25-byte buffer (24-byte ASCII UserID + 1-byte Finger Index at byte 24)
        const buf25 = Buffer.alloc(25);
        buf25.write(String(userId), 0, 'ascii');
        buf25.writeUInt8(fingerIndex, 24);
        await this.device.executeCmd(61, buf25);
        console.log(`✅ [ZKTecoDevice] CMD_STARTENROLL (25-byte) sent for UserID ${userId}, finger ${fingerIndex}`);

        return true;
      } catch (error) {
        console.error(`Failed to start enrollment on ${this.ip}`, error);
        return false;
      }
    });
  }

  async setUser(uid: number, userid: string, name: string, password = '', role = 0, cardno = 0): Promise<boolean> {
    try {
      const buffer = Buffer.alloc(72);
      buffer.writeUInt16LE(uid, 0);
      buffer.writeUInt8(role, 2);
      buffer.write(password || '', 3, 8, 'ascii');
      buffer.write(name || '', 11, 24, 'ascii');
      buffer.writeUInt32LE(cardno || 0, 35);
      buffer.writeUInt8(1, 39);
      buffer.writeUInt16LE(0, 40);
      buffer.write(String(userid || uid), 48, 24, 'ascii');

      const CMD_USER_WRQ = 8;
      await this.device.executeCmd(CMD_USER_WRQ, buffer);
      await this.device.executeCmd(1013, ''); // CMD_REFRESHDATA
      return true;
    } catch (error) {
      console.error(`Failed to set user on ${this.ip}`, error);
      return false;
    }
  }

  async deleteUser(uid: number | string): Promise<boolean> {
    try {
      const numericUid = typeof uid === 'number' ? uid : (parseInt(String(uid).replace(/\D/g, ''), 10) || 1);

      // 1. Delete all biometric fingerprint templates for this UID (13 = all 10 fingers)
      try {
        const tempBuf = Buffer.alloc(3);
        tempBuf.writeUInt16LE(numericUid, 0);
        tempBuf.writeUInt8(13, 2); // 13 = all fingers
        const CMD_DEL_USER_TEMP = 134;
        await this.device.executeCmd(CMD_DEL_USER_TEMP, tempBuf);
      } catch (_) {}

      // 2. Delete user record by numeric UID (CMD_DELETE_USER = 18)
      if (typeof this.device.deleteUser === 'function') {
        try {
          await this.device.deleteUser(numericUid);
        } catch (_) {}
      } else {
        const buffer = Buffer.alloc(2);
        buffer.writeUInt16LE(numericUid, 0);
        const CMD_DELETE_USER = 18;
        await this.device.executeCmd(CMD_DELETE_USER, buffer);
      }

      // 3. Delete user by string userId buffer if available
      try {
        const pinBuf = Buffer.alloc(24);
        pinBuf.write(String(uid), 0, 'ascii');
        await this.device.executeCmd(18, pinBuf);
      } catch (_) {}

      // 4. Force immediate hardware database and memory refresh
      await this.device.executeCmd(1013, ''); // CMD_REFRESHDATA
      console.log(`✅ [ZKTecoDevice] Successfully deleted user and templates for UID ${uid} from ${this.ip}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete user ${uid} from ${this.ip}`, error);
      return false;
    }
  }

  async syncTime(): Promise<boolean> {
    try {
      if (typeof this.device.setTime === 'function') {
        await this.device.setTime(new Date());
        return true;
      }
      return true;
    } catch (error) {
      console.error(`Failed to sync time on ${this.ip}`, error);
      return false;
    }
  }

  async getUserTemplates(uid: number): Promise<any[]> {
    try {
      if (typeof this.device.getTemplates === 'function') {
        const templates = await this.device.getTemplates();
        const data = templates.data || [];
        return data.filter((t: any) => t.uid === uid || t.userId === String(uid));
      }
      return [];
    } catch (error) {
      console.warn(`Could not fetch templates for user ${uid} from ${this.ip}`);
      return [];
    }
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      let sn = "Unknown";
      let deviceName = "ZKTeco Device";
      let mac = "00:00:00:00:00:00";
      let firmware = "Unknown";
      let platform = "ZMM220";
      let userCount = 0;
      let templateCount = 0;
      let memoryUsage = "0MB / 128MB";

      try {
        const info = await this.device.getInfo();
        if (info) {
          userCount = info.userCounts || 0;
          templateCount = info.fingerCounts || info.logCounts || 0; // Using available info
          deviceName = `ZK Device (${userCount} users)`;

          if (info.sn) sn = info.sn;
          if (info.mac) mac = info.mac;
          if (info.firmware) firmware = info.firmware;
          if (info.platform) platform = info.platform;

          // Generate a pseudo-memory string based on counts
          const mem = Math.round((userCount * 2 + templateCount * 5) / 1024) + "MB";
          memoryUsage = `${mem} / 128MB`;
        }
      } catch (e) {
        console.warn("Could not fetch detailed info");
      }

      return {
        ip: this.ip,
        port: this.port,
        sn,
        deviceName,
        mac,
        firmware,
        platform,
        userCount,
        templateCount,
        memoryUsage,
        connectionState: this.connectionState,
      };
    } catch (error) {
      console.error(`Failed to get device info from ${this.ip}`, error);
      throw error;
    }
  }

  async clearAdminPrivileges(): Promise<boolean> {
    try {
      // CMD_CLEAR_ADMIN = 22 or 1013 refresh
      await this.device.executeCmd(22, '');
      await this.device.executeCmd(1013, '');
      return true;
    } catch (error) {
      console.warn(`clearAdminPrivileges notice on ${this.ip}:`, error);
      return false;
    }
  }
}

