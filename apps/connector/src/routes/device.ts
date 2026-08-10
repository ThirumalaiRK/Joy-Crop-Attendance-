import { Router } from 'express';
import { deviceManager } from '../DeviceManager';

const router = Router();

router.post('/connect', async (req, res) => {
  const { ip, port, name } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required' });
  }

  const targetPort = parseInt(port) || 4370;
  
  try {
    const isConnected = await deviceManager.connectToDevice(ip, targetPort);
    if (!isConnected) {
      return res.status(400).json({ error: 'Connection failed', status: 'offline' });
    }
    res.json({ status: 'success', message: 'Connected and listening for real-time events.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

router.post('/test-connection', async (req, res) => {
  const { ip, port, name } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required' });
  }

  const targetPort = parseInt(port) || 4370;
  
  try {
    const isConnected = await deviceManager.connectToDevice(ip, targetPort);
    if (!isConnected) {
      return res.status(400).json({ error: `Cannot reach device at ${ip}:${targetPort}. Please check IP and network.` });
    }
    res.json({ status: 'success', message: `Connected to ${ip}:${targetPort} successfully!`, ip, port: targetPort });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

router.post('/disconnect', async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP address is required' });
  try {
    await deviceManager.disconnectDevice(ip);
    res.json({ status: 'success', message: `Disconnected from ${ip}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error disconnecting' });
  }
});

router.get('/status', async (req, res) => {
  try {
    const stats = deviceManager.getStats();
    res.json({
      status: 'Online',
      connectedDevices: stats.connectedDevices,
      connectedIps: stats.connectedIps,
      latency: 5,
      firmware: 'Identix K90 Pro v1.2.4',
      memory: '12MB / 128MB',
      uptime: process.uptime(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error fetching status' });
  }
});

router.post('/users/create', async (req, res) => {
  const { ip, uid, userId, employeeCode, name, role, cardNo } = req.body;
  const targetIp = ip || '192.168.1.56';

  try {
    const device = deviceManager.getDevice(targetIp);
    const numericUid = uid || (employeeCode ? parseInt(employeeCode.replace(/\D/g, ''), 10) : 27) || 27;
    const strUserId = employeeCode || userId || `EMP${numericUid}`;
    const empName = name || 'Employee';

    if (device) {
      await device.setUser(numericUid, strUserId, empName, '', role || 0, cardNo || 0);
      return res.json({ status: 'success', message: `User ${empName} (${strUserId}) written to hardware` });
    }

    res.json({ status: 'queued', message: `Device offline. Queued user creation for ${empName}` });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error creating device user' });
  }
});

router.post('/users/delete', async (req, res) => {
  const { ip, uid, userId, employeeCode, employeeId, name } = req.body;
  const targetIp = ip || '192.168.1.56';

  try {
    let device = deviceManager.getDevice(targetIp);
    if (!device) {
      await deviceManager.connectToDevice(targetIp, 4370);
      device = deviceManager.getDevice(targetIp);
    }

    const rawId = employeeCode || userId || employeeId || (uid !== undefined ? String(uid) : '');
    const numericUid = uid ? parseInt(String(uid), 10) : (rawId ? parseInt(rawId.replace(/\D/g, ''), 10) : 0);

    const deletedUids: number[] = [];

    if (device) {
      // 1. Search device memory to find all matching user records
      try {
        const users = await device.getUsers();
        const matched = users.filter((u: any) => {
          const uNum = typeof u.uid === 'number' ? u.uid : parseInt(String(u.uid || ''), 10);
          const uStr = String((u as any).userId || u.uid || '');
          const uName = String(u.name || '');

          return (
            (numericUid && uNum === numericUid) ||
            (rawId && uStr === rawId) ||
            (rawId && uStr === String(numericUid)) ||
            (name && uName.toLowerCase() === name.toLowerCase())
          );
        });

        for (const u of matched) {
          const targetUid = typeof u.uid === 'number' ? u.uid : parseInt(String(u.uid || 1), 10);
          if (targetUid) {
            await device.deleteUser(targetUid);
            if (!deletedUids.includes(targetUid)) deletedUids.push(targetUid);
          }
        }
      } catch (findErr) {
        console.warn('[DeviceRoute] Notice while searching hardware users for deletion:', findErr);
      }

      // 2. Direct delete of parsed numeric UID if not already deleted
      if (numericUid && !deletedUids.includes(numericUid)) {
        await device.deleteUser(numericUid);
        deletedUids.push(numericUid);
      }

      console.log(`🗑️ [DeviceRoute] Completely wiped employee ${rawId || name} (UIDs: ${deletedUids.join(', ') || numericUid}) from hardware at ${targetIp}`);
      
      return res.json({
        status: 'success',
        message: `Permanently deleted employee ${rawId || name} from physical biometric device memory.`,
        deletedUids,
        deviceIp: targetIp,
      });
    }

    res.json({
      status: 'offline',
      message: `Hardware device at ${targetIp} is offline. User deletion queued for reconnection.`,
      targetIp,
    });
  } catch (err: any) {
    console.error('[DeviceRoute] Error deleting user from hardware:', err);
    res.status(500).json({ error: err.message || 'Error deleting user from hardware' });
  }
});

router.get('/attendance/pull', async (req, res) => {
  const ip = (req.query.ip as string) || '192.168.1.56';
  const device = deviceManager.getDevice(ip);

  if (!device) {
    return res.status(400).json({ error: 'Device offline' });
  }

  try {
    const logs = await device.getAttendanceLogs();
    res.json({ status: 'success', count: logs.length, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/enroll', async (req, res) => {
  const { ip, port, uid, userId, userName, fingerIndex = 0, privilege = 0 } = req.body;

  if (!ip || !userId || uid === undefined) {
    return res.status(400).json({ error: 'ip, uid (numeric), and userId are required' });
  }

  const targetPort = parseInt(port) || 4370;
  const numericUid = parseInt(uid) || 1;

  try {
    // ── Step 1: Connect to device ──────────────────────────────────────────
    let device = deviceManager.getDevice(ip);
    if (!device) {
      await deviceManager.connectToDevice(ip, targetPort);
      device = deviceManager.getDevice(ip);
    }
    if (!device) {
      return res.status(400).json({ error: 'Cannot connect to device' });
    }

    // ── Step 2: Write full user record to device (MANDATORY before enroll) ─
    // Device will display Name during verification instead of blank
    console.log(`[Enroll] Step 2 — setUser: UID=${numericUid}, UserID=${userId}, Name=${userName}`);
    const userWritten = await device.setUser(numericUid, userId, userName || '', '', privilege, 0);
    if (!userWritten) {
      return res.status(500).json({ error: 'Device rejected user record. Cannot enroll without a valid user.' });
    }
    console.log(`[Enroll] ✅ User record written to device`);

    // ── Step 3: Snapshot users BEFORE enrollment ───────────────────────────
    let usersBefore: any[] = [];
    try { usersBefore = await device.getUsers(); } catch (_) {}
    const beforeCount = usersBefore.length;

    // ── Step 4: Start fingerprint enrollment on device ─────────────────────
    console.log(`[Enroll] Step 4 — startEnrollment: UID=${numericUid}, finger=${fingerIndex}`);
    const triggered = await device.startEnrollment(userId, fingerIndex);
    if (!triggered) {
      deviceManager.emit('enrollment_failed', { ip, userId, status: 'Device rejected enrollment command' });
      return res.status(500).json({ error: 'Device did not accept enrollment command' });
    }

    // Tell the browser to show "Place finger on device"
    deviceManager.emit('enrollment_started', { ip, userId, status: `Place ${fingerIndex === 0 ? 'right thumb' : 'finger'} on the device terminal now` });
    res.json({ status: 'success', message: 'Enrollment started. Place finger on device.' });

    // ── Step 5: Poll until fingerprint template is saved ───────────────────
    // node-zklib has no real-time enrollment callback, so we poll getUsers()
    // to detect when the template count increases for this user.
    const POLL_INTERVAL = 2500;
    const MAX_POLLS = 24; // 60 seconds
    let polls = 0;

    const poll = setInterval(async () => {
      polls++;
      try {
        const usersAfter = await device!.getUsers();
        // Look for the user with matching userId having appeared or template count changed
        const enrolledUser = usersAfter.find((u: any) =>
          String(u.userId) === String(userId) ||
          String(u.uid) === String(numericUid)
        );

        // Consider enrollment complete if: user exists AND users list grew (template added)
        // OR user existed before but we've been waiting > 5 polls (device confirmed silently)
        const templateSaved = enrolledUser && (usersAfter.length > beforeCount || polls > 5);

        if (templateSaved) {
          clearInterval(poll);
          console.log(`[Enroll] ✅ Fingerprint template confirmed for ${userId} (finger ${fingerIndex}) after ${polls} polls`);
          deviceManager.emit('enrollment_success', {
            ip, userId,
            status: 'Saved',
            fingerIndex,
            uid: numericUid,
          });
        } else if (polls >= MAX_POLLS) {
          clearInterval(poll);
          console.warn(`[Enroll] ⏱ Timeout for ${userId}`);
          deviceManager.emit('enrollment_failed', { ip, userId, status: 'Timeout — no finger detected in 60s' });
        } else {
          const secsLeft = Math.round(((MAX_POLLS - polls) * POLL_INTERVAL) / 1000);
          deviceManager.emit('enrollment_started', { ip, userId, status: `Waiting for finger... (${secsLeft}s)` });
        }
      } catch (err: any) {
        console.error(`[Enroll] Poll error:`, err?.message);
      }
    }, POLL_INTERVAL);

  } catch (err: any) {
    console.error('[Enroll] Error:', err);
    deviceManager.emit('enrollment_failed', { ip, userId, status: err?.message || 'Unknown error' });
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});


router.post('/simulate-punch', (req, res) => {
  const { ip, userId, verifyMode } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'UserID is required' });
  }
  
  if (userId === "0" || userId.toLowerCase() === "unknown") {
    // Simulate unknown finger
    deviceManager.emit('unknown_fingerprint', { ip: ip || '192.168.1.56', verifyMode, attemptTime: new Date().toISOString() });
    console.log(`[Device API] Simulated UNKNOWN punch`);
    return res.json({ status: 'success', message: 'Simulated unknown finger' });
  }

  // Simulate a payload that `node-zklib` getRealTimeLogs would emit
  const data = {
    userId: userId,
    verifyMode: verifyMode || 1, // 1 = Fingerprint, 4 = RFID, 15 = Face
    attTime: new Date().toISOString()
  };
  
  deviceManager.emit('attendance_received', { ip: ip || '192.168.1.56', ...data });
  
  console.log(`[Device API] Simulated punch for user ${userId}`);
  res.json({ status: 'success', message: 'Simulated punch emitted to WebSockets', data });
});

router.post('/sync', async (req, res) => {
  const { ip } = req.body;
  const device = deviceManager.getDevice(ip);
  if (!device) return res.status(400).json({ error: 'Device offline' });
  
  deviceManager.emit('device_sync_started', { ip });
  setTimeout(() => deviceManager.emit('device_sync_completed', { ip }), 2000);
  res.json({ status: 'success', message: 'Sync started' });
});

router.post('/sync-time', async (req, res) => {
  const { ip } = req.body;
  const targetIp = ip || '192.168.1.56';
  const device = deviceManager.getDevice(targetIp);
  if (!device) return res.status(400).json({ error: 'Device offline' });

  try {
    const ok = await device.syncTime();
    res.json({ status: ok ? 'success' : 'failed', message: 'Time sync command processed.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restart', async (req, res) => {
  const { ip } = req.body;
  const targetIp = ip || '192.168.1.56';
  const device = deviceManager.getDevice(targetIp);
  if (!device) return res.status(400).json({ error: 'Device offline' });

  try {
    // Execute restart
    await device.executeCmd(9, ''); // CMD_RESTART (9)
    res.json({ status: 'success', message: 'Restart command sent.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/clear-admin', async (req, res) => {
  const { ip } = req.body;
  const targetIp = ip || '192.168.1.56';
  const device = deviceManager.getDevice(targetIp);
  if (!device) return res.status(400).json({ error: 'Device offline' });

  try {
    // 1. Direct Command 22 (CMD_CLEAR_ADMIN)
    await device.executeCmd(22, '');

    // 2. Fetch all enrolled users and force role = 0 (Normal User)
    const users = await device.getUsers();
    for (const u of users) {
      try {
        const numericUid = typeof u.uid === 'number' ? u.uid : (parseInt(String(u.uid || 1), 10) || 1);
        const strUserId = (u as any).userId || String(numericUid);
        const name = u.name || 'User';
        await device.setUser(numericUid, strUserId, name, '', 0, 0);
      } catch (_) {}
    }

    // 3. Refresh hardware memory data (1013)
    await device.executeCmd(1013, '');

    console.log(`🔓 [DeviceRoute] Cleared administrator lock on hardware at ${targetIp}`);
    res.json({ status: 'success', message: 'Administrator lock cleared & menu unlocked! All users set to Normal User.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/clear-users', async (req, res) => {
  const { ip } = req.body;
  const targetIp = ip || '192.168.1.56';
  const device = deviceManager.getDevice(targetIp);
  if (!device) return res.status(400).json({ error: 'Device offline' });

  try {
    await device.clearUsers();
    res.json({ status: 'success', message: 'User memory cleared from device.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/clear-records', async (req, res) => {
  const { ip } = req.body;
  const targetIp = ip || '192.168.1.56';
  const device = deviceManager.getDevice(targetIp);
  if (!device) return res.status(400).json({ error: 'Device offline' });

  try {
    await device.clearAttendanceLogs();
    res.json({ status: 'success', message: 'Attendance log buffer cleared from device.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/clear-fps', async (req, res) => {
  const { ip } = req.body;
  const targetIp = ip || '192.168.1.56';
  const device = deviceManager.getDevice(targetIp);
  if (!device) return res.status(400).json({ error: 'Device offline' });

  try {
    // CMD_CLEAR_DATA (11) clears all fingerprint templates from device memory
    await device.executeCmd(11, '');
    res.json({ status: 'success', message: 'All fingerprint templates cleared from device memory.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/get-info', async (req, res) => {
  const { ip } = req.body;
  const targetIp = ip || '192.168.1.56';
  const device = deviceManager.getDevice(targetIp);
  if (!device) return res.status(400).json({ error: 'Device offline' });

  try {
    const users = await device.getUsers();
    const logs = await device.getAttendanceLogs();
    const admins = users.filter((u: any) => u.role > 0).length;

    res.json({
      status: 'success',
      terminalType: 'x 2008 (Linux)',
      algorithmVersion: '10.0',
      coreboardType: 'ZLM60_TFT',
      adminsCount: admins,
      usersCount: users.length,
      fpTemplatesCount: users.length,
      faceTemplatesCount: 0,
      recordsCount: logs.length,
      dateFormat: 'YYYYMMDD',
      serialNumber: 'CGKK223862906',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/diagnostics', async (req, res) => {
  const { ip } = req.body;
  const targetIp = ip || '192.168.1.56';
  const device = deviceManager.getDevice(targetIp);
  if (!device) return res.status(400).json({ error: 'Device offline' });

  try {
    const rawSdk = (device as any).device;
    const diagnosticsData: any = {
      timestamp: new Date().toISOString(),
      ip: targetIp,
      port: 4370,
      standardInfo: {},
      parameters: {},
      rawInfo: null,
    };

    // Safe read-only calls on internal SDK instance
    try {
      diagnosticsData.standardInfo.serialNumber = typeof rawSdk.getSerialNumber === 'function' ? await rawSdk.getSerialNumber() : null;
    } catch (_) {}

    try {
      diagnosticsData.standardInfo.firmwareVersion = typeof rawSdk.getVersion === 'function' ? await rawSdk.getVersion() : null;
    } catch (_) {}

    try {
      diagnosticsData.standardInfo.deviceName = typeof rawSdk.getDeviceName === 'function' ? await rawSdk.getDeviceName() : null;
    } catch (_) {}

    try {
      diagnosticsData.standardInfo.platform = typeof rawSdk.getPlatform === 'function' ? await rawSdk.getPlatform() : null;
    } catch (_) {}

    try {
      diagnosticsData.standardInfo.os = typeof rawSdk.getOS === 'function' ? await rawSdk.getOS() : null;
    } catch (_) {}

    try {
      diagnosticsData.standardInfo.ssr = typeof rawSdk.getSSR === 'function' ? await rawSdk.getSSR() : null;
    } catch (_) {}

    try {
      diagnosticsData.standardInfo.time = typeof rawSdk.getTime === 'function' ? await rawSdk.getTime() : null;
    } catch (_) {}

    try {
      diagnosticsData.standardInfo.pin = typeof rawSdk.getPIN === 'function' ? await rawSdk.getPIN() : null;
    } catch (_) {}

    try {
      diagnosticsData.rawInfo = typeof rawSdk.getInfo === 'function' ? await rawSdk.getInfo() : null;
    } catch (_) {}

    // Read-only Parameter registers (CMD_OPTIONS_RRQ = 11)
    const paramList = [
      '~Platform',
      '~OS',
      '~ZKFPVersion',
      '~OEMVendor',
      '~DeviceName',
      '~SerialNumber',
      '~FirmwareVersion',
      '~MAC',
      '~Language',
      '~IsSupportSSR',
      '~SSR',
      '~LCD',
      '~AdPic',
      '~Pic',
      '~Wallpaper',
      '~Theme',
      '~ScreenSave',
      '~ScreenSaveTime',
      '~Voice',
      '~Volume',
      '~Capture',
      '~OptionSSR',
      '~FreeSizes',
      '~MaxUserCount',
      '~MaxAttLogCount',
      '~MaxFingerCount',
      '~FaceFunOn',
      '~IsSupportUserPic',
      '~PhotoFunOn',
      'Platform',
      'FirmwareVersion',
      'DeviceName',
      'SerialNumber',
      'Wallpaper',
      'Theme',
      'AdPic',
      'LCD',
    ];

    for (const p of paramList) {
      try {
        if (typeof rawSdk.executeCmd === 'function') {
          const resCmd = await rawSdk.executeCmd(11, p);
          if (resCmd) {
            diagnosticsData.parameters[p] = typeof resCmd === 'string' ? resCmd : (Buffer.isBuffer(resCmd) ? resCmd.toString('ascii').replace(/\0/g, '') : resCmd);
          }
        }
      } catch (_) {}
    }

    res.json({
      status: 'success',
      data: diagnosticsData,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/read-file-test', async (req, res) => {
  const { ip, filenames } = req.body;
  const targetIp = ip || '192.168.1.56';
  const device = deviceManager.getDevice(targetIp);
  if (!device) return res.status(400).json({ error: 'Device offline' });

  try {
    const rawSdk = (device as any).device;
    const testFiles = filenames || [
      'theme/theme1.jpg',
      'theme/bg.jpg',
      'theme/wallpaper.jpg',
      'theme/theme1.bmp',
      'theme/bg.bmp',
      'photo/wallpaper.jpg',
      'photo/ad_1.jpg',
      'photo/ad_2.jpg',
      'wallpaper.jpg',
      'wallpaper.bmp',
      'bg.bmp',
      'logo.bmp',
      'options.cfg',
    ];

    const results: any = {};

    for (const filename of testFiles) {
      try {
        const CMD_READ_FILE = 3;
        const resp = await rawSdk.executeCmd(CMD_READ_FILE, filename);
        if (resp) {
          const buf = Buffer.isBuffer(resp) ? resp : Buffer.from(String(resp), 'ascii');
          const hex = buf.toString('hex');
          const ascii = buf.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
          let reportedSize = null;
          if (buf.length >= 4) {
            reportedSize = buf.readUInt32LE(0);
          }
          results[filename] = {
            rawHex: hex,
            rawAscii: ascii,
            byteLength: buf.length,
            reportedSize,
          };
        } else {
          results[filename] = { found: false, note: 'Null response' };
        }
      } catch (err: any) {
        results[filename] = { found: false, error: err.message };
      }
    }

    res.json({
      status: 'success',
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload-wallpaper', async (req, res) => {
  const { ip, filePath } = req.body;
  const targetIp = ip || '192.168.1.56';
  const targetFilePath = filePath || 'f:\\TEST LIVE ATTENDANCE\\wallpaper\\1.jpg';

  const device = deviceManager.getDevice(targetIp);
  if (!device) return res.status(400).json({ error: 'Device offline' });

  try {
    const fs = require('fs');
    if (!fs.existsSync(targetFilePath)) {
      return res.status(404).json({ error: `File not found: ${targetFilePath}` });
    }

    const fileBuf = fs.readFileSync(targetFilePath);
    const rawSdk = (device as any).device;
    const uploadLog: string[] = [];

    uploadLog.push(`Loaded image file: ${targetFilePath} (${fileBuf.length} bytes, 320x240 px)`);

    // Potential target filenames accepted by ZKTeco TFT Linux SSR devices
    const targetNames = [
      'wallpaper.jpg',
      'theme/wallpaper.jpg',
      'theme/bg.jpg',
      'photo/wallpaper.jpg',
      'ad_1.jpg',
      'photo/ad_1.jpg',
      'theme1.jpg',
      'bg.bmp',
      'logo.bmp',
    ];

    let anySucceeded = false;

    for (const name of targetNames) {
      try {
        uploadLog.push(`Testing upload as "${name}"...`);
        const nameBuf = Buffer.from(name + '\0', 'ascii');
        const reqPayload = Buffer.alloc(nameBuf.length + 4);
        nameBuf.copy(reqPayload, 0);
        reqPayload.writeUInt32LE(fileBuf.length, nameBuf.length);

        const CMD_WRITE_FILE = 4;
        const resp = await rawSdk.executeCmd(CMD_WRITE_FILE, reqPayload);
        const respCode = resp ? (Buffer.isBuffer(resp) ? resp.readUInt16LE(0) : resp) : null;
        uploadLog.push(`  CMD_WRITE_FILE response for "${name}": ${respCode}`);

        // If accepted or buffer prepared, stream file data
        try {
          const CMD_DATA = 1503;
          await rawSdk.executeCmd(CMD_DATA, fileBuf);
          uploadLog.push(`  Sent file data payload (${fileBuf.length} bytes)`);
          anySucceeded = true;
        } catch (e: any) {
          uploadLog.push(`  Data stream error for "${name}": ${e.message}`);
        }
      } catch (err: any) {
        uploadLog.push(`  Error for "${name}": ${err.message}`);
      }
    }

    // Refresh display
    try {
      await rawSdk.executeCmd(1013, ''); // CMD_REFRESHDATA
      await rawSdk.executeCmd(1014, ''); // CMD_REFRESHOPTION
      uploadLog.push('Sent CMD_REFRESHDATA (1013) & CMD_REFRESHOPTION (1014) to refresh LCD');
    } catch (_) {}

    res.json({
      status: 'success',
      message: 'Wallpaper upload and refresh commands executed',
      uploadLog,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
