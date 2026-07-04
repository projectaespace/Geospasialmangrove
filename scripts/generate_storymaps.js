const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const BASE = path.join(__dirname, '..');
const STORYMAPS_DIR = path.join(BASE, 'images', 'WEBIMG', 'StoryMaps');
const DATA_XLSX = path.join(STORYMAPS_DIR, 'Data.xlsx');
const OUT_DIR = path.join(BASE, 'data');
const OUT_FILE = path.join(OUT_DIR, 'storymaps.json');

function slugify(name) {
  return name.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}

function isImage(fn) {
  return /\.(jpe?g|png|gif|webp)$/i.test(fn);
}

function findFolderForKawasan(folders, kawasan) {
  const k = kawasan.trim().toLowerCase();
  // match folder that includes the kawasan name
  for (const f of folders) {
    if (f.toLowerCase().indexOf(k) !== -1) return f;
  }
  return null;
}

function main() {
  if (!fs.existsSync(STORYMAPS_DIR)) {
    console.error('StoryMaps folder not found:', STORYMAPS_DIR);
    process.exit(1);
  }

  if (!fs.existsSync(DATA_XLSX)) {
    console.error('Data.xlsx not found in StoryMaps folder');
    process.exit(1);
  }

  const workbook = xlsx.readFile(DATA_XLSX);
  const sheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'lokasi') || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  const folders = fs.readdirSync(STORYMAPS_DIR).filter(f => fs.statSync(path.join(STORYMAPS_DIR, f)).isDirectory());

  const out = [];

  for (const row of rows) {
    const kawasan = (row['Kawasan'] || row['kawasan'] || row['Nama'] || '').toString().trim();
    if (!kawasan) continue;

    const folderName = findFolderForKawasan(folders, kawasan) || kawasan;
    const folderPath = path.join(STORYMAPS_DIR, folderName);

    let images = [];
    let peta = null;

    if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
      const files = fs.readdirSync(folderPath);
      files.forEach(f => {
        if (f.startsWith('~$')) return; // skip temp
        const lower = f.toLowerCase();
        if (/^peta(\.|$)/i.test(lower) || lower.indexOf('peta') === 0) {
          peta = path.join('images', 'WEBIMG', 'StoryMaps', folderName, f).replace(/\\/g, '/');
        } else if (isImage(f)) {
          images.push(path.join('images', 'WEBIMG', 'StoryMaps', folderName, f).replace(/\\/g, '/'));
        }
      });
      // sort images naturally
      images.sort();
    }

    const lon = parseFloat(row['Longitude'] || row['longitude'] || row['Lon'] || row['Lon.'] || row['Long'] || row['LONGITUDE'] || '');
    const lat = parseFloat(row['Latitude'] || row['latitude'] || row['Lat'] || row['LATITUDE'] || '');
    const ket = (row['Ket'] || row['Keterangan'] || row['ket'] || '').toString();

    const id = slugify(kawasan || folderName);

    out.push({
      id,
      name: kawasan,
      folder: folderName,
      coords: (isFinite(lat) && isFinite(lon)) ? [lat, lon] : null,
      images,
      peta,
      ket
    });
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', OUT_FILE);
}

main();
