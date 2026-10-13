import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'child_process'
import http from 'http'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

function autoBackendPlugin() {
  let backendProcess = null;

  function isBackendAlive() {
    return new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:5000/api/health', (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1500, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  function startBackend() {
    if (backendProcess) return;
    const venvPython = path.join(projectRoot, 'venv', 'Scripts', 'python.exe');
    const pythonExe = fs.existsSync(venvPython) ? venvPython : 'python';

    console.log(`\n======================================================`);
    console.log(`[VaxTrack] Auto-starting Python Flask Backend Server...`);
    console.log(`[VaxTrack] Interpreter: ${pythonExe}`);
    console.log(`======================================================\n`);

    backendProcess = spawn(pythonExe, ['-m', 'backend.app.main'], {
      cwd: projectRoot,
      stdio: 'inherit',
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    backendProcess.on('error', (err) => {
      console.error('[VaxTrack] Failed to start backend:', err.message);
      backendProcess = null;
    });

    backendProcess.on('exit', (code) => {
      console.log(`[VaxTrack] Backend server stopped (exit code: ${code})`);
      backendProcess = null;
    });
  }

  return {
    name: 'auto-backend-plugin',
    async configureServer() {
      const alive = await isBackendAlive();
      if (!alive) {
        startBackend();
      } else {
        console.log('[VaxTrack] Python Flask backend is already active on http://127.0.0.1:5000');
      }

      const cleanExit = () => {
        if (backendProcess && !backendProcess.killed) {
          try {
            backendProcess.kill();
          } catch (e) {}
        }
      };
      process.on('SIGINT', cleanExit);
      process.on('SIGTERM', cleanExit);
      process.on('exit', cleanExit);
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    autoBackendPlugin(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      }
    }
  }
})
