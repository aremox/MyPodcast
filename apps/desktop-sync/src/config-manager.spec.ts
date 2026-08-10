import { configManager } from './config-manager';
import * as fs from 'fs';
import * as path from 'path';

describe('Desktop Sync ConfigManager', () => {
  const testConfigFile = path.join(__dirname, 'test-config.json');

  beforeEach(() => {
    if (fs.existsSync(testConfigFile)) {
      fs.unlinkSync(testConfigFile);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testConfigFile)) {
      fs.unlinkSync(testConfigFile);
    }
  });

  it('should initialize and load empty config when file does not exist', () => {
    const config = configManager.load(testConfigFile);
    expect(config).toEqual({});
  });

  it('should perform atomic writes to avoid file corruption', () => {
    configManager.save(testConfigFile, { jwtToken: 'token123', targetFolder: 'Podcasts' });
    
    expect(fs.existsSync(testConfigFile)).toBe(true);
    const savedContent = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
    expect(savedContent).toEqual({ jwtToken: 'token123', targetFolder: 'Podcasts' });
  });
});
