import { Router } from 'express';
import { ZKTecoDevice } from '@hrms/biometrics-sdk';
import { AppDataSource, DeviceCache } from '../db';

const router = Router();

// Endpoint for manual auto-discovery simulation (in reality would scan the subnet)
router.get('/discover', async (req, res) => {
  // Simplified for example: pinging common IPs or using a subnet scanner
  // Real implementation would use network ping/port scan for 4370
  res.json({ message: 'Discovery started', devices: [] });
});

router.get('/', async (req, res) => {
  const deviceRepo = AppDataSource.getRepository(DeviceCache);
  const devices = await deviceRepo.find();
  res.json(devices);
});

router.post('/connect', async (req, res) => {
  const { ip, port = 4370 } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP is required' });

  const device = new ZKTecoDevice(ip, port);
  const connected = await device.connect();

  if (connected) {
    const info = await device.getDeviceInfo();
    const deviceRepo = AppDataSource.getRepository(DeviceCache);
    let devCache = await deviceRepo.findOne({ where: { ip } });
    if (!devCache) {
      devCache = new DeviceCache();
      devCache.ip = ip;
      devCache.port = port;
    }
    devCache.sn = info.sn;
    devCache.deviceName = info.deviceName;
    devCache.online = true;
    await deviceRepo.save(devCache);

    await device.disconnect();
    return res.json({ message: 'Connected', info });
  }

  res.status(500).json({ error: 'Failed to connect' });
});

export default router;
