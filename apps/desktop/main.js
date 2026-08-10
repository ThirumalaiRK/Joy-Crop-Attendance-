const { app, BrowserWindow, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');

let mainWindow = null;
let tray = null;
let connectorProcess = null;
let isQuitting = false;

const CONNECTOR_PORT = 4000;
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

function startConnector() {
  const connectorPath = path.join(__dirname, '..', 'connector', 'dist', 'index.js');
  console.log('[Electron] Starting background connector process:', connectorPath);

  try {
    connectorProcess = fork(connectorPath, [], {
      env: {
        ...process.env,
        PORT: String(CONNECTOR_PORT),
      },
      stdio: 'pipe'
    });

    if (connectorProcess.stdout) {
      connectorProcess.stdout.on('data', (data) => {
        console.log(`[Connector] ${data.toString().trim()}`);
      });
    }

    if (connectorProcess.stderr) {
      connectorProcess.stderr.on('data', (data) => {
        console.error(`[Connector ERR] ${data.toString().trim()}`);
      });
    }

    connectorProcess.on('exit', (code) => {
      console.log(`[Connector] Process exited with code ${code}`);
      if (!isQuitting) {
        console.log('[Connector] Auto-restarting connector in 3s...');
        setTimeout(startConnector, 3000);
      }
    });
  } catch (err) {
    console.error('[Electron] Failed to start connector process:', err);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'HRMS Live Biometric Attendance System',
    backgroundColor: '#030712',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(WEB_URL).catch(() => {
    // If local dev server isn't up yet, retry after 2 seconds
    setTimeout(() => {
      if (mainWindow) mainWindow.loadURL(WEB_URL);
    }, 2000);
  });

  // Minimize to Tray on close instead of exiting
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon?.({
          title: 'HRMS Live Attendance',
          content: 'Running in background. TCP Biometric Connector is active.',
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Simple tray icon
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch (_) {}

  tray = new Tray(icon && !icon.isEmpty() ? icon : nativeImage.createEmpty());
  tray.setToolTip('HRMS Live Biometric Attendance System (Active)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Connector Status: Online (Port 4000)',
      enabled: false
    },
    {
      label: 'Target Terminal: 192.168.1.56:4370',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Restart TCP Connector',
      click: () => {
        if (connectorProcess) {
          connectorProcess.kill();
        }
      }
    },
    {
      label: 'Quit HRMS Attendance',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// App lifecycle
app.whenReady().then(() => {
  startConnector();
  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (connectorProcess) {
    connectorProcess.kill();
  }
});

app.on('window-all-closed', () => {
  // On Windows, keep running in system tray if not quitting
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});
