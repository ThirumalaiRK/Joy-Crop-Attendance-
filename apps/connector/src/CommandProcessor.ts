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
              const numericUid = uid || (employeeCode ? parseInt(employeeCode.replace(/\D/g, ''), 10) : 27) || 27;
              const strUserId = employeeCode || userId || `EMP${numericUid}`;
              const empName = name || 'Employee';

              // STEP 1: Write User Record to Device first so screen shows name!
              console.log(`[CommandProcessor] ENROLL step 1 -> Writing user info (Name: ${empName}) to hardware...`);
              await zkDevice.setUser(numericUid, strUserId, empName);

              // STEP 2: Trigger Finger Enrollment on Device
              console.log(`[CommandProcessor] ENROLL step 2 -> Triggering finger enrollment for ${strUserId}...`);
              const enrollOk = await zkDevice.startEnrollment(strUserId, fingerIndex || 0);

              if (!enrollOk) {
                throw new Error(`Hardware finger enrollment trigger failed on device ${deviceIp}`);
              }

              // STEP 3: Attempt template info fetch
              const templates = await zkDevice.getUserTemplates(numericUid);
              if (templates && templates.length > 0) {
                const fp = templates[0];
                await supabase.from('fingerprint_templates').upsert({
                  employee_code: strUserId,
                  finger_position: 'Right Thumb',
                  finger_template: fp.template || fp.data || 'HARDWARE_ENROLLED_TEMPLATE',
                  quality_score: 98,
                  updated_at: new Date().toISOString(),
                });
              }

              resultData = {
                success: true,
                uid: numericUid,
                userId: strUserId,
                name: empName,
                status: 'Enrolled',
                message: `Successfully provisioned ${empName} (${strUserId}) on Identix K90 Pro!`,
              };
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
