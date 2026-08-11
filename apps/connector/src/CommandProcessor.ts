import { supabase } from './supabase';
import { deviceManager } from './DeviceManager';
import { ZKTecoDevice } from '@hrms/biometrics-sdk';

export class CommandProcessor {
  private isProcessing = false;

  start() {
    console.log('⚡ Device Command Queue Processor started.');
    // Poll command queue every 2 seconds
    setInterval(() => {
      this.processQueue();
    }, 2000);
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Fetch pending commands
      const { data: commands, error } = await supabase
        .from('device_commands')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(5);

      if (error || !commands || commands.length === 0) {
        this.isProcessing = false;
        return;
      }

      for (const cmd of commands) {
        console.log(`[CommandProcessor] Processing command ${cmd.id} (${cmd.command_type}) for device ${cmd.device_ip}...`);

        // Update status to PROCESSING
        await supabase
          .from('device_commands')
          .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
          .eq('id', cmd.id);

        try {
          const deviceIp = cmd.device_ip || '192.168.1.56';
          const port = cmd.payload?.port || 4370;

          // Connect to hardware device
          let zkDevice: ZKTecoDevice | null = deviceManager.getConnectedDevice(deviceIp);
          if (!zkDevice) {
            zkDevice = new ZKTecoDevice(deviceIp, port);
            const ok = await zkDevice.connect();
            if (!ok) {
              throw new Error(`Could not establish TCP 4370 socket to device at ${deviceIp}`);
            }
          }

          let resultData: any = { success: true };

          switch (cmd.command_type) {
            case 'CREATE_USER': {
              const { uid, userId, employeeCode, name, role, cardNo } = cmd.payload;
              const numericUid = uid || (employeeCode ? parseInt(employeeCode.replace(/\D/g, ''), 10) : 27) || 27;
              const strUserId = employeeCode || userId || `EMP${numericUid}`;
              const empName = name || 'Employee';

              console.log(`[CommandProcessor] setUserInfo -> UID: ${numericUid}, UserID: ${strUserId}, Name: ${empName}`);
              const setOk = await zkDevice.setUser(numericUid, strUserId, empName, '', role || 0, cardNo || 0);

              if (!setOk) {
                throw new Error(`Failed to execute setUser on Identix K90 Pro device at ${deviceIp}`);
              }

              // Update Supabase device_users cache
              await supabase.from('device_users').upsert(
                {
                  device_ip: deviceIp,
                  device_user_id: strUserId,
                  uid: numericUid,
                  name: empName,
                  role: role || 0,
                  synced: true,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'device_ip,device_user_id' }
              );

              // Update employee device_uid field if employee_uuid supplied
              if (cmd.payload?.employeeUuid) {
                await supabase
                  .from('employees')
                  .update({ device_uid: numericUid })
                  .eq('id', cmd.payload.employeeUuid);
              }

              resultData = { success: true, uid: numericUid, userId: strUserId, name: empName };
              break;
            }

            case 'ENROLL_USER': {
              const { uid, userId, employeeCode, name, fingerIndex } = cmd.payload;
              const numericUid = uid || (employeeCode ? parseInt(String(employeeCode).replace(/\D/g, ''), 10) : 27) || 27;
              const strUserId = employeeCode || userId || `EMP${numericUid}`;
              const empName = name || userId || strUserId || 'Employee';

              // STEP 0: Delete any old/corrupted device slot first (clean slate for re-enrollment)
              console.log(`[CommandProcessor] ENROLL step 0 -> Clearing old data for UID ${numericUid} (${strUserId})...`);
              try { await zkDevice.deleteUser(numericUid); } catch (_) {}

              // STEP 1: Write User Record to Device (device screen shows name during scan)
              console.log(`[CommandProcessor] ENROLL step 1 -> Writing user info (Name: ${empName}) to hardware...`);
              await zkDevice.setUser(numericUid, strUserId, empName);

              // STEP 2: Snapshot device template count BEFORE enrollment starts
              let templatesBefore = 0;
              try {
                const devInfo = await zkDevice.getDeviceInfo();
                templatesBefore = devInfo.templateCount || 0;
                console.log(`[CommandProcessor] Device template count before enrollment: ${templatesBefore}`);
              } catch (_) {}

              // STEP 3: Trigger Finger Enrollment on Device
              console.log(`[CommandProcessor] ENROLL step 2 -> Triggering finger enrollment for ${strUserId}...`);
              const enrollOk = await zkDevice.startEnrollment(strUserId, fingerIndex || 0);
              if (!enrollOk) {
                throw new Error(`Hardware finger enrollment trigger failed on device ${deviceIp}`);
              }

              // Notify browser UI via socket
              deviceManager.emit('enrollment_started', {
                ip: deviceIp,
                userId: strUserId,
                status: `👉 Place ${empName}'s finger on the Identix K90 Pro terminal now! (3 scans required)`,
              });

              // STEP 4: Poll device for template count increase (max 60 seconds)
              // node-zklib has no real-time callback for enrollment, so we detect via template count delta.
              const POLL_MS = 2500;
              const MAX_POLLS = 24; // 24 × 2.5s = 60s
              let polls = 0;
              let enrolled = false;

              while (polls < MAX_POLLS && !enrolled) {
                await new Promise((r) => setTimeout(r, POLL_MS));
                polls++;

                try {
                  const devInfo = await zkDevice.getDeviceInfo();
                  const templatesNow = devInfo.templateCount || 0;
                  if (templatesNow > templatesBefore) {
                    enrolled = true;
                    console.log(`[CommandProcessor] ✅ Template count increased ${templatesBefore} → ${templatesNow} — finger captured!`);
                    break;
                  }
                } catch (_) {}

                const secsLeft = Math.round(((MAX_POLLS - polls) * POLL_MS) / 1000);
                deviceManager.emit('enrollment_started', {
                  ip: deviceIp,
                  userId: strUserId,
                  status: `Waiting for finger scan... (${secsLeft}s remaining)`,
                });
              }

              if (enrolled) {
                // Update employee enrolled status
                try {
                  await supabase
                    .from('employees')
                    .update({ fingerprint_enrolled: true, is_enrolled: true, updated_at: new Date().toISOString() })
                    .or(`employee_code.eq.${strUserId},device_user_id.eq.${strUserId}`);
                } catch (_) {}

                deviceManager.emit('enrollment_success', {
                  ip: deviceIp,
                  userId: strUserId,
                  status: 'Saved',
                  fingerIndex: fingerIndex || 0,
                  uid: numericUid,
                });
                console.log(`[CommandProcessor] ✅ ENROLL_USER success for ${empName} (${strUserId})`);
                resultData = { success: true, uid: numericUid, userId: strUserId, name: empName, status: 'Enrolled' };
              } else {
                deviceManager.emit('enrollment_failed', {
                  ip: deviceIp,
                  userId: strUserId,
                  status: 'Timeout — no finger detected in 60s',
                });
                throw new Error(`Enrollment timeout — ${empName} did not place finger within 60 seconds. Please try again.`);
              }
              break;
            }

            case 'DELETE_USER': {
              const { uid, userId, employeeCode, name } = cmd.payload || {};
              const rawId = employeeCode || userId || (uid !== undefined ? String(uid) : '');
              const numericUid = uid ? parseInt(String(uid), 10) : (rawId ? parseInt(rawId.replace(/\D/g, ''), 10) : 0);

              let deletedCount = 0;
              try {
                const users = await zkDevice.getUsers();
                for (const u of users) {
                  const uNum = typeof u.uid === 'number' ? u.uid : parseInt(String(u.uid || ''), 10);
                  const uStr = String((u as any).userId || u.uid || '');
                  const uName = String(u.name || '');

                  if (
                    (numericUid && uNum === numericUid) ||
                    (rawId && uStr === rawId) ||
                    (rawId && uStr === String(numericUid)) ||
                    (name && uName.toLowerCase() === name.toLowerCase())
                  ) {
                    await zkDevice.deleteUser(uNum);
                    deletedCount++;
                  }
                }
              } catch (_) {}

              if (numericUid && deletedCount === 0) {
                await zkDevice.deleteUser(numericUid);
                deletedCount++;
              }

              resultData = { success: true, message: `Deleted ${rawId || name || numericUid} from hardware memory (${deletedCount} records removed).` };
              break;
            }

            case 'PULL_ATTENDANCE': {
              const allLogs = await zkDevice.getAttendanceLogs();
              const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
              const logs = allLogs.filter((log: any) => {
                try { return new Date(log.recordTime) >= todayStart; } catch (_) { return false; }
              });
              console.log(`[CommandProcessor] Downloaded ${allLogs.length} logs, using ${logs.length} from today.`);

              // Sync today-only logs to Supabase
              for (const log of logs) {
                const evtTime = log.recordTime ? new Date(log.recordTime).toISOString() : new Date().toISOString();
                try {
                  await supabase.from('attendance_events').insert({
                    id: `ZK-LOG-${log.userSn || Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    employee_id: log.deviceUserId || `EMP${log.userSn}`,
                    employee_name: `Employee ${log.deviceUserId || log.userSn}`,
                    event_type: 'CHECK_IN',
                    event_time: evtTime,
                    device: `Identix K90 Pro (${deviceIp})`,
                    method: 'fingerprint',
                    location: 'HQ Gate Terminal',
                  });
                } catch (err) {
                  // ignore duplicates/insert errors
                }
              }

              resultData = { success: true, downloadedCount: logs.length };
              break;
            }


            case 'SYNC_TIME': {
              await zkDevice.syncTime();
              resultData = { success: true, message: 'Device time synchronized with server.' };
              break;
            }

            default:
              console.warn(`[CommandProcessor] Unknown command type: ${cmd.command_type}`);
          }

          // Mark command as COMPLETED
          await supabase
            .from('device_commands')
            .update({
              status: 'COMPLETED',
              result: resultData,
              updated_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .eq('id', cmd.id);

          console.log(`[CommandProcessor] Command ${cmd.id} (${cmd.command_type}) COMPLETED successfully!`);

        } catch (cmdErr: any) {
          console.error(`[CommandProcessor] Command ${cmd.id} FAILED:`, cmdErr.message);

          await supabase
            .from('device_commands')
            .update({
              status: 'FAILED',
              error_message: cmdErr.message || 'Execution error on hardware connector',
              updated_at: new Date().toISOString(),
            })
            .eq('id', cmd.id);
        }
      }
    } catch (err: any) {
      console.error('[CommandProcessor] Loop error:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const commandProcessor = new CommandProcessor();
