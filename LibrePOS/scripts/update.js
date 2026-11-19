import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { activeRelease, releasePath, dataDir, installRoot } from './release-layout.js';

try {
  const args = process.argv.slice(2);
  process.env.LIBREPOS_INSTALL_ROOT = installRoot;
  process.env.LIBREPOS_DATA_DIR = dataDir;
  if (args.includes('--rollback')) {
    const { rollback } = await import('./release-channel.js');
    await rollback();
    console.log('Se seleccionó la versión anterior. Vuelve a abrir LibrePOS.');
  } else {
    const pointer = await activeRelease();
    const channel = await import(pathToFileURL(path.join(releasePath(pointer.active), 'scripts/release-channel.js')).href);
    if (args.includes('--device-id')) console.log(await channel.deviceId());
    else if (args.includes('--status')) console.log(JSON.stringify(await channel.getUpdateStatus()));
    else {
      const result = await channel.applyRepositoryUpdate({ repair: args.includes('--repair') });
      console.log(result.updated ? 'Actualización lista. Cierra y abre LibrePOS.' : 'LibrePOS está al día.');
    }
  }
} catch (error) {
  console.error('[LibrePOS] ' + (error.message === 'cash-register-open' ? 'Cierra la caja antes de actualizar.' : error.message));
  process.exitCode = 1;
}
