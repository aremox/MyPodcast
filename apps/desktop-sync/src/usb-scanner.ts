import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface UsbDrive {
  deviceId: string;       // E:, F:, etc.
  volumeName: string;
  driveType: number;      // 2 = Removable
  description: string;
  serialNumber: string;   // VolumeSerialNumber
}

export class UsbScanner {
  /**
   * Returns a list of all removable USB drives currently connected.
   */
  static async getRemovableDrives(): Promise<UsbDrive[]> {
    try {
      const command = `powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, VolumeName, DriveType, Description, VolumeSerialNumber | ConvertTo-Json"`;
      const { stdout } = await execAsync(command);
      
      if (!stdout.trim()) return [];

      // Powershell ConvertTo-Json might return a single object or an array
      const parsed = JSON.parse(stdout);
      const drives: any[] = Array.isArray(parsed) ? parsed : [parsed];

      return drives
        .filter(d => d.DriveType === 2) // 2 is Removable Disk
        .map(d => ({
          deviceId: d.DeviceID,
          volumeName: d.VolumeName || 'USB Drive',
          driveType: d.DriveType,
          description: d.Description,
          serialNumber: d.VolumeSerialNumber
        }));
    } catch (error) {
      console.error('[UsbScanner] Error fetching drives:', error);
      return [];
    }
  }

  /**
   * Monitor for new USB drives being inserted
   * @param intervalMs How often to check in milliseconds
   * @param onDriveInserted Callback when a new drive is detected
   */
  static startMonitoring(intervalMs: number, onDriveInserted: (drive: UsbDrive) => void) {
    let previouslyConnected: string[] = [];

    // Initial scan to populate connected drives
    this.getRemovableDrives().then(drives => {
      previouslyConnected = drives.map(d => d.serialNumber);
      console.log(`[UsbScanner] Started monitoring. Currently connected: ${previouslyConnected.join(', ') || 'None'}`);
    });

    setInterval(async () => {
      const currentDrives = await this.getRemovableDrives();
      const currentSerials = currentDrives.map(d => d.serialNumber);

      // Check for new drives
      for (const drive of currentDrives) {
        if (!previouslyConnected.includes(drive.serialNumber)) {
          console.log(`[UsbScanner] New USB detected: ${drive.volumeName} (${drive.deviceId}) - Serial: ${drive.serialNumber}`);
          onDriveInserted(drive);
        }
      }

      // Update state
      previouslyConnected = currentSerials;
    }, intervalMs);
  }
}
